package ws

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/nats-io/nats.go"
	"github.com/nexus/gateway/internal/protocol"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client

	// channel ID -> clients
	channels map[string]map[*Client]bool

	nc *nats.Conn
	mu sync.RWMutex
}

func NewHub(nc *nats.Conn) *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		channels:   make(map[string]map[*Client]bool),
		nc:         nc,
	}
}

func (h *Hub) Run() {
	_, err := h.nc.Subscribe("channel.*", func(m *nats.Msg) {
		h.broadcast <- m.Data
	})
	if err != nil {
		log.Fatalf("NATS subscribe error: %v", err)
	}

	_, err = h.nc.Subscribe("workspace.*", func(m *nats.Msg) {
		h.broadcast <- m.Data
	})
	if err != nil {
		log.Fatalf("NATS subscribe error: %v", err)
	}

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client connected: %v", client.ID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("Client disconnected: %v", client.ID)
				
				// Remove from all channels
				for chID, clients := range h.channels {
					delete(clients, client)
					if len(clients) == 0 {
						delete(h.channels, chID)
					}
				}
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			var payload protocol.GatewayPayload
			if err := json.Unmarshal(message, &payload); err != nil {
				log.Printf("Error unmarshaling message: %v", err)
				continue
			}

			h.mu.RLock()
			// If it's a channel event, try to find channel ID
			// Very simplified logic here:
			// Let's assume D is a map containing channel_id for channel events
			isChannelEvent := false
			var channelID string

			if payloadMap, ok := payload.D.(map[string]interface{}); ok {
				if cID, hasCID := payloadMap["channel_id"].(string); hasCID {
					isChannelEvent = true
					channelID = cID
				}
			}

			if isChannelEvent {
				if subs, ok := h.channels[channelID]; ok {
					for client := range subs {
						select {
						case client.send <- message:
						default:
							close(client.send)
							delete(h.clients, client)
							delete(subs, client)
						}
					}
				}
			} else {
				// Broadcast to all
				for client := range h.clients {
					select {
					case client.send <- message:
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) SubscribeChannel(channelID string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.channels[channelID] == nil {
		h.channels[channelID] = make(map[*Client]bool)
	}
	h.channels[channelID][client] = true
}

func (h *Hub) UnsubscribeChannel(channelID string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.channels[channelID]; ok {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.channels, channelID)
		}
	}
}

func (h *Hub) Broadcast(msg []byte) {
	h.broadcast <- msg
}
