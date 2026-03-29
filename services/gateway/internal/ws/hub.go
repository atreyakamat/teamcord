package ws

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/nats-io/nats.go"
	"github.com/nexus/gateway/internal/protocol"
)

// Hub maintains the set of active clients and broadcasts messages to them.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the services (via NATS).
	broadcast chan []byte

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	nc *nats.Conn
	mu sync.RWMutex
}

func NewHub(nc *nats.Conn) *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		nc:         nc,
	}
}

func (h *Hub) Run() {
	// Subscribe to all channel and workspace events
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
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			// Parse message to see who should receive it
			// For now, we broadcast to everyone (simplification)
			// Later we'll filter by channel/workspace
			var payload protocol.GatewayPayload
			if err := json.Unmarshal(message, &payload); err != nil {
				log.Printf("Error unmarshaling message: %v", err)
				continue
			}

			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Broadcast(msg []byte) {
	h.broadcast <- msg
}
