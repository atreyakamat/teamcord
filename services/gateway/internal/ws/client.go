package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/nexus/gateway/internal/protocol"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 4096
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // For development
	},
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	Hub *Hub

	// The websocket connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte

	// Client metadata
	ID     string
	UserID string
}

// readPump pumps messages from the websocket connection to the hub.
func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
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
	switch p.Op {
	case protocol.OpHeartbeat:
		// Respond with HeartbeatAck
		ack := protocol.GatewayPayload{Op: protocol.OpHeartbeatAck}
		b, _ := json.Marshal(ack)
		c.send <- b
	case protocol.OpIdentify:
		// Handle authentication and send READY
		log.Printf("Identify received from %s", c.ID)
		
		// In a real app, validate the token from p.D
		// Let's assume it's valid and send the READY payload
		
		readyData := map[string]interface{}{
			"v": 10,
			"user": map[string]interface{}{
				"id": "1", // Mock user ID
				"username": "nexus_user",
				"discriminator": "0001",
				"bot": false,
			},
			"guilds": []interface{}{}, // Workspaces
			"session_id": c.ID,
		}

		readyPayload := protocol.GatewayPayload{
			Op: protocol.OpDispatch,
			T:  func(s string) *string { return &s }(protocol.EventReady),
			S:  func(i int) *int { return &i }(1),
			D:  readyData,
		}

		b, _ := json.Marshal(readyPayload)
		c.send <- b
	}
}

// writePump pumps messages from the hub to the websocket connection.
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
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
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

// ServeWs handles websocket requests from the peer.
func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{Hub: hub, conn: conn, send: make(chan []byte, 256), ID: time.Now().String()}
	client.Hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
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
}
