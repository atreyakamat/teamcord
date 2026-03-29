package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/nats-io/nats.go"
	"github.com/nexus/messaging/internal/channel"
	"github.com/nexus/messaging/internal/db"
	"github.com/nexus/messaging/internal/message"
)

type Server struct {
	repo         *message.Repository
	channelRepo  *channel.Repository
	js           nats.JetStreamContext
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	dbURL := os.Getenv("DATABASE_URL")
	natsURL := os.Getenv("NATS_URL")

	ctx := context.Background()
	database, err := db.NewDatabase(ctx, dbURL)
	if err != nil {
		log.Fatal(err)
	}

	nc, err := nats.Connect(natsURL)
	if err != nil {
		log.Fatal(err)
	}

	js, err := nc.JetStream()
	if err != nil {
		log.Fatal(err)
	}

	s := &Server{
		repo:        &message.Repository{DB: database},
		channelRepo: &channel.Repository{DB: database},
		js:          js,
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/workspaces/{workspaceID}/channels", func(r chi.Router) {
			r.Get("/", s.ListChannels)
			r.Post("/", s.CreateChannel)
		})

		r.Route("/channels/{channelID}", func(r chi.Router) {
			r.Get("/", s.GetChannel)
			r.Patch("/", s.UpdateChannel)
			r.Delete("/", s.DeleteChannel)

			r.Route("/messages", func(r chi.Router) {
				r.Get("/", s.ListMessages)
				r.Post("/", s.CreateMessage)
				r.Route("/{messageID}", func(r chi.Router) {
					r.Get("/", s.GetMessage)
					r.Patch("/", s.UpdateMessage)
					r.Delete("/", s.DeleteMessage)
				})
			})
		})
	})

	log.Printf("Messaging service starting on port %s", port)
	http.ListenAndServe(":"+port, r)
}

func (s *Server) CreateChannel(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	var c channel.Channel
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	c.WorkspaceID = workspaceID
	if err := s.channelRepo.Create(r.Context(), &c); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Fan-out
	payload := map[string]interface{}{
		"op": 0,
		"t":  "CHANNEL_CREATE",
		"d":  c,
	}
	data, _ := json.Marshal(payload)
	s.js.Publish(fmt.Sprintf("workspace.%d", workspaceID), data)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}

func (s *Server) ListChannels(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	channels, err := s.channelRepo.ListByWorkspace(r.Context(), workspaceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(channels)
}

func (s *Server) GetChannel(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	c, err := s.channelRepo.Get(r.Context(), channelID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}

func (s *Server) UpdateChannel(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	var c channel.Channel
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := s.channelRepo.Update(r.Context(), channelID, &c); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	updated, _ := s.channelRepo.Get(r.Context(), channelID)
	payload := map[string]interface{}{
		"op": 0,
		"t":  "CHANNEL_UPDATE",
		"d":  updated,
	}
	data, _ := json.Marshal(payload)
	s.js.Publish(fmt.Sprintf("workspace.%d", updated.WorkspaceID), data)

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) DeleteChannel(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	c, _ := s.channelRepo.Get(r.Context(), channelID)
	if c == nil {
		http.NotFound(w, r)
		return
	}

	if err := s.channelRepo.Delete(r.Context(), channelID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	payload := map[string]interface{}{
		"op": 0,
		"t":  "CHANNEL_DELETE",
		"d": map[string]interface{}{
			"id":           channelID,
			"workspace_id": c.WorkspaceID,
		},
	}
	data, _ := json.Marshal(payload)
	s.js.Publish(fmt.Sprintf("workspace.%d", c.WorkspaceID), data)

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) CreateMessage(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	
	var m message.Message
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	m.ChannelID = channelID
	// TODO: Get author ID from auth context
	m.AuthorID = 1 // Placeholder

	if err := s.repo.Create(r.Context(), &m); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Publish to NATS for real-time fan-out
	payload := map[string]interface{}{
		"op": 0,
		"t":  "MESSAGE_CREATE",
		"d":  m,
	}
	data, _ := json.Marshal(payload)
	subject := fmt.Sprintf("channel.%d", channelID)
	s.js.Publish(subject, data)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(m)
}

func (s *Server) ListMessages(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit == 0 {
		limit = 50
	}
	var before *int64
	if bStr := r.URL.Query().Get("before"); bStr != "" {
		b, _ := strconv.ParseInt(bStr, 10, 64)
		before = &b
	}

	msgs, err := s.repo.List(r.Context(), channelID, limit, before)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}

func (s *Server) GetMessage(w http.ResponseWriter, r *http.Request) {
	msgID, _ := strconv.ParseInt(chi.URLParam(r, "messageID"), 10, 64)
	m, err := s.repo.Get(r.Context(), msgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if m == nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(m)
}

func (s *Server) UpdateMessage(w http.ResponseWriter, r *http.Request) {
	msgID, _ := strconv.ParseInt(chi.URLParam(r, "messageID"), 10, 64)
	var body struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.repo.Update(r.Context(), msgID, body.Content); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch updated message for NATS
	m, _ := s.repo.Get(r.Context(), msgID)
	payload := map[string]interface{}{
		"op": 0,
		"t":  "MESSAGE_UPDATE",
		"d":  m,
	}
	data, _ := json.Marshal(payload)
	s.js.Publish(fmt.Sprintf("channel.%d", m.ChannelID), data)

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) DeleteMessage(w http.ResponseWriter, r *http.Request) {
	msgID, _ := strconv.ParseInt(chi.URLParam(r, "messageID"), 10, 64)
	
	m, _ := s.repo.Get(r.Context(), msgID)
	if m == nil {
		http.NotFound(w, r)
		return
	}

	if err := s.repo.Delete(r.Context(), msgID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	payload := map[string]interface{}{
		"op": 0,
		"t":  "MESSAGE_DELETE",
		"d": map[string]interface{}{
			"id":         msgID,
			"channel_id": m.ChannelID,
		},
	}
	data, _ := json.Marshal(payload)
	s.js.Publish(fmt.Sprintf("channel.%d", m.ChannelID), data)

	w.WriteHeader(http.StatusNoContent)
}
