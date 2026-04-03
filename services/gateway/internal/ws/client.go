package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/teamcord/gateway/internal/auth"
	"github.com/teamcord/gateway/internal/protocol"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 4096
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all for now
	},
}

type Client struct {
	Hub *Hub

	conn *websocket.Conn
	send chan []byte

	ID                 string
	UserID             string
	SessionID          string
	Identified         bool
	LastHeartbeat      time.Time
	WorkspaceIDs       map[string]bool
	SubscribedChannels map[string]bool

	mu sync.RWMutex
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var payload protocol.GatewayPayload
		if err := json.Unmarshal(message, &payload); err != nil {
			log.Printf("unmarshal error: %v", err)
			continue
		}

		c.handlePayload(payload)
	}
}

func (c *Client) handlePayload(p protocol.GatewayPayload) {
	c.mu.Lock()
	defer c.mu.Unlock()

	switch p.Op {
	case protocol.OpHeartbeat:
		c.LastHeartbeat = time.Now()
		ack := protocol.GatewayPayload{Op: protocol.OpHeartbeatAck}
		b, _ := json.Marshal(ack)
		c.send <- b

	case protocol.OpIdentify:
		if c.Identified {
			return
		}

		var identifyData map[string]interface{}
		b, _ := json.Marshal(p.D)
		json.Unmarshal(b, &identifyData)

		tokenObj, ok := identifyData["token"].(string)
		if !ok {
			c.sendInvalidSession(false)
			return
		}

		claims, err := auth.VerifyToken(tokenObj)
		if err != nil {
			log.Printf("Identify failed: %v", err)
			c.sendInvalidSession(false)
			// Send close frame
			c.conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(4003, "Invalid token"))
			return
		}

		c.UserID = claims.Subject
		c.Identified = true

		for _, wsID := range claims.Workspaces {
			c.WorkspaceIDs[wsID] = true
		}

		log.Printf("Client %s identified as user %s", c.ID, c.UserID)

		// Send READY
		readyData := map[string]interface{}{
			"v": 1,
			"user": map[string]interface{}{
				"id":            c.UserID,
				"username":      "User",
				"discriminator": "0001",
			},
			"session_id": c.SessionID,
		}

		readyPayload := protocol.GatewayPayload{
			Op: protocol.OpDispatch,
			T:  func(s string) *string { return &s }(protocol.EventReady),
			S:  func(i int) *int { return &i }(1),
			D:  readyData,
		}

		b, _ = json.Marshal(readyPayload)
		c.send <- b

	case 100: // SUBSCRIBE
		var subData map[string]interface{}
		b, _ := json.Marshal(p.D)
		json.Unmarshal(b, &subData)

		channelIDs := readChannelIDs(subData)
		for _, channelID := range channelIDs {
			c.SubscribedChannels[channelID] = true
			c.Hub.SubscribeChannel(channelID, c)
		}

	case 101: // UNSUBSCRIBE
		var unsubData map[string]interface{}
		b, _ := json.Marshal(p.D)
		json.Unmarshal(b, &unsubData)

		channelIDs := readChannelIDs(unsubData)
		for _, channelID := range channelIDs {
			delete(c.SubscribedChannels, channelID)
			c.Hub.UnsubscribeChannel(channelID, c)
		}
	}
}

func readChannelIDs(payload map[string]interface{}) []string {
	if payload == nil {
		return nil
	}

	if channelID, ok := normalizeChannelID(payload["channel_id"]); ok {
		return []string{channelID}
	}

	rawChannelIDs, ok := payload["channel_ids"].([]interface{})
	if !ok {
		return nil
	}

	channelIDs := make([]string, 0, len(rawChannelIDs))
	for _, rawChannelID := range rawChannelIDs {
		if channelID, ok := normalizeChannelID(rawChannelID); ok {
			channelIDs = append(channelIDs, channelID)
		}
	}
	return channelIDs
}

func normalizeChannelID(raw interface{}) (string, bool) {
	switch value := raw.(type) {
	case string:
		if value == "" {
			return "", false
		}
		return value, true
	case float64:
		return fmt.Sprintf("%.0f", value), true
	case int:
		return fmt.Sprintf("%d", value), true
	case int64:
		return fmt.Sprintf("%d", value), true
	default:
		return "", false
	}
}

func (c *Client) sendInvalidSession(resumable bool) {
	payload := protocol.GatewayPayload{
		Op: protocol.OpInvalidSession,
		D:  resumable,
	}
	b, _ := json.Marshal(payload)
	c.send <- b
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	sessionID := time.Now().Format("20060102150405") + "rand"

	client := &Client{
		Hub:                hub,
		conn:               conn,
		send:               make(chan []byte, 256),
		ID:                 time.Now().String(), // simple id
		SessionID:          sessionID,
		LastHeartbeat:      time.Now(),
		WorkspaceIDs:       make(map[string]bool),
		SubscribedChannels: make(map[string]bool),
	}
	client.Hub.register <- client

	go client.writePump()
	go client.readPump()

	// Send HELLO
	hello := protocol.GatewayPayload{
		Op: protocol.OpHello,
		D: map[string]int{
			"heartbeat_interval": 41250,
		},
	}
	b, _ := json.Marshal(hello)
	client.send <- b

	// Check if token in URL query
	token := r.URL.Query().Get("token")
	if token != "" {
		// Mock an identify event to process it identically
		identData := protocol.GatewayPayload{
			Op: protocol.OpIdentify,
			D: map[string]interface{}{
				"token": token,
			},
		}
		client.handlePayload(identData)
	}
}
