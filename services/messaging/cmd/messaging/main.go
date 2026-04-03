package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"crypto/rand"
	"encoding/hex"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/nats-io/nats.go"
	"github.com/nexus/messaging/internal/channel"
	"github.com/nexus/messaging/internal/clientportal"
	"github.com/nexus/messaging/internal/db"
	"github.com/nexus/messaging/internal/decision"
	"github.com/nexus/messaging/internal/message"
	"github.com/nexus/messaging/internal/search"
	"github.com/nexus/messaging/internal/thread"
	"github.com/nexus/messaging/internal/workspace"
)

type Server struct {
	repo          *message.Repository
	channelRepo   *channel.Repository
	workspaceRepo *workspace.Repository
	threadRepo    *thread.Repository
	decisionRepo  *decision.Repository
	searchRepo    *search.Repository
	portalRepo    *clientportal.Repository
	js            nats.JetStreamContext
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	dbURL := os.Getenv("DATABASE_URL")
	natsURL := os.Getenv("NATS_URL")
	meiliURL := os.Getenv("MEILISEARCH_URL")
	meiliKey := os.Getenv("MEILISEARCH_KEY")

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

	var searchRepo *search.Repository
	if meiliURL != "" {
		searchRepo = search.NewRepository(meiliURL, meiliKey)
		log.Println("Meilisearch connected")
	}

	s := &Server{
		repo:          &message.Repository{DB: database},
		channelRepo:   &channel.Repository{DB: database},
		workspaceRepo: &workspace.Repository{DB: database},
		threadRepo:    &thread.Repository{DB: database},
		decisionRepo:  &decision.Repository{DB: database},
		searchRepo:    searchRepo,
		portalRepo:    &clientportal.Repository{DB: database},
		js:            js,
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	r.Route("/api/v1", func(r chi.Router) {
		// Public routes
		r.Get("/client-portals/verify/{token}", s.VerifyClientPortal)

		// Workspaces
		r.Route("/workspaces", func(r chi.Router) {
			r.Post("/", s.CreateWorkspace)
			r.Route("/{workspaceID}", func(r chi.Router) {
				r.Get("/", s.GetWorkspace)
				r.Get("/channels", s.ListChannels)
				r.Post("/channels", s.CreateChannel)
				r.Get("/decisions", s.ListDecisions)
				r.Post("/decisions", s.CreateDecision)
				r.Get("/search", s.SearchMessages)
				
				// Client Portals
				r.Get("/client-portals", s.ListClientPortals)
				r.Post("/client-portals", s.CreateClientPortal)
			})
		})

		// Channels
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

			r.Route("/threads", func(r chi.Router) {
				r.Get("/", s.ListThreads)
				r.Post("/", s.CreateThread)
			})
		})

		// Threads
		r.Route("/threads/{threadID}", func(r chi.Router) {
			r.Get("/", s.GetThread)
		})
	})

	log.Printf("Messaging service starting on port %s", port)
	err = http.ListenAndServe(":"+port, r)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

func generateToken() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "fallback_token"
	}
	return hex.EncodeToString(bytes)
}

// -- Client Portals --
func (s *Server) CreateClientPortal(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	var p clientportal.ClientPortal
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	p.WorkspaceID = workspaceID
	p.InviteToken = generateToken()
	
	if err := s.portalRepo.Create(r.Context(), &p); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (s *Server) ListClientPortals(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	portals, err := s.portalRepo.ListByWorkspace(r.Context(), workspaceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(portals)
}

func (s *Server) VerifyClientPortal(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	p, err := s.portalRepo.GetByToken(r.Context(), token)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if p == nil {
		http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

// -- Workspaces --
func (s *Server) CreateWorkspace(w http.ResponseWriter, r *http.Request) {
	var wk workspace.Workspace
	if err := json.NewDecoder(r.Body).Decode(&wk); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := s.workspaceRepo.Create(r.Context(), &wk); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(wk)
}

func (s *Server) GetWorkspace(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	wk, err := s.workspaceRepo.Get(r.Context(), workspaceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(wk)
}

// -- Search --
func (s *Server) SearchMessages(w http.ResponseWriter, r *http.Request) {
	if s.searchRepo == nil {
		http.Error(w, "Search not configured", http.StatusNotImplemented)
		return
	}

	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	query := r.URL.Query().Get("q")
	filters := r.URL.Query().Get("filters")

	if query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	res, err := s.searchRepo.Search(r.Context(), workspaceID, query, filters)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

// -- Channels --
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
	payload := map[string]interface{}{"op": 0, "t": "CHANNEL_CREATE", "d": c}
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
	payload := map[string]interface{}{"op": 0, "t": "CHANNEL_UPDATE", "d": updated}
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
	payload := map[string]interface{}{"op": 0, "t": "CHANNEL_DELETE", "d": map[string]interface{}{"id": channelID, "workspace_id": c.WorkspaceID}}
	data, _ := json.Marshal(payload)
	s.js.Publish(fmt.Sprintf("workspace.%d", c.WorkspaceID), data)
	w.WriteHeader(http.StatusNoContent)
}

// -- Messages --
func (s *Server) CreateMessage(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	var m message.Message
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	m.ChannelID = channelID
	m.AuthorID = 1 // Placeholder
	if err := s.repo.Create(r.Context(), &m); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if s.searchRepo != nil {
		c, err := s.channelRepo.Get(r.Context(), channelID)
		if err == nil && c != nil {
			go s.searchRepo.IndexMessage(context.Background(), &m, c.WorkspaceID)
		}
	}

	payload := map[string]interface{}{"op": 0, "t": "MESSAGE_CREATE", "d": m}
	data, _ := json.Marshal(payload)
	s.js.Publish(fmt.Sprintf("channel.%d", channelID), data)
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
	m, _ := s.repo.Get(r.Context(), msgID)
	
	if s.searchRepo != nil {
		c, err := s.channelRepo.Get(r.Context(), m.ChannelID)
		if err == nil && c != nil {
			go s.searchRepo.IndexMessage(context.Background(), m, c.WorkspaceID)
		}
	}

	payload := map[string]interface{}{"op": 0, "t": "MESSAGE_UPDATE", "d": m}
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
	payload := map[string]interface{}{"op": 0, "t": "MESSAGE_DELETE", "d": map[string]interface{}{"id": msgID, "channel_id": m.ChannelID}}
	data, _ := json.Marshal(payload)
	s.js.Publish(fmt.Sprintf("channel.%d", m.ChannelID), data)
	w.WriteHeader(http.StatusNoContent)
}

// -- Threads --
func (s *Server) CreateThread(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	var t thread.Thread
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	t.ChannelID = channelID
	if err := s.threadRepo.Create(r.Context(), &t); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	payload := map[string]interface{}{"op": 0, "t": "THREAD_CREATE", "d": t}
	data, _ := json.Marshal(payload)
	s.js.Publish(fmt.Sprintf("channel.%d", channelID), data)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

func (s *Server) ListThreads(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	status := r.URL.Query().Get("status")
	if status == "" {
		status = "open"
	}
	threads, err := s.threadRepo.ListByChannel(r.Context(), channelID, status)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(threads)
}

func (s *Server) GetThread(w http.ResponseWriter, r *http.Request) {
	threadID, _ := strconv.ParseInt(chi.URLParam(r, "threadID"), 10, 64)
	t, err := s.threadRepo.Get(r.Context(), threadID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

// -- Decisions --
func (s *Server) CreateDecision(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	var d decision.Decision
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	d.WorkspaceID = workspaceID
	if err := s.decisionRepo.Create(r.Context(), &d); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if d.ChannelID != nil {
		payload := map[string]interface{}{"op": 0, "t": "DECISION_LOGGED", "d": d}
		data, _ := json.Marshal(payload)
		s.js.Publish(fmt.Sprintf("channel.%d", *d.ChannelID), data)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(d)
}

func (s *Server) ListDecisions(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	decisions, err := s.decisionRepo.ListByWorkspace(r.Context(), workspaceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(decisions)
}
