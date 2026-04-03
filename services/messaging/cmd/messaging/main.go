package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5"
	"github.com/nats-io/nats.go"
	"github.com/teamcord/messaging/internal/auth"
	"github.com/teamcord/messaging/internal/channel"
	"github.com/teamcord/messaging/internal/clientportal"
	"github.com/teamcord/messaging/internal/db"
	"github.com/teamcord/messaging/internal/decision"
	"github.com/teamcord/messaging/internal/message"
	"github.com/teamcord/messaging/internal/reaction"
	"github.com/teamcord/messaging/internal/search"
	"github.com/teamcord/messaging/internal/thread"
	"github.com/teamcord/messaging/internal/user"
	"github.com/teamcord/messaging/internal/workspace"
	"golang.org/x/crypto/bcrypt"
)

type Server struct {
	repo          *message.Repository
	channelRepo   *channel.Repository
	workspaceRepo *workspace.Repository
	threadRepo    *thread.Repository
	decisionRepo  *decision.Repository
	searchRepo    *search.Repository
	portalRepo    *clientportal.Repository
	reactionRepo  *reaction.Repository
	userRepo      *user.Repository
	js            nats.JetStreamContext
}

type messageReactionSummary struct {
	Emoji         string  `json:"emoji"`
	EmojiID       *int64  `json:"emoji_id,omitempty"`
	EmojiAnimated bool    `json:"emoji_animated"`
	Count         int     `json:"count"`
	UserIDs       []int64 `json:"user_ids"`
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

	userRepo := &user.Repository{DB: database}
	if err := userRepo.EnsureSupportTables(ctx); err != nil {
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
		reactionRepo:  &reaction.Repository{DB: database},
		userRepo:      userRepo,
		js:            js,
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/auth/register", s.Register)
		r.Post("/auth/login", s.Login)
		r.Get("/users/@me", s.GetCurrentUser)
		r.Get("/workspaces/@me", s.ListCurrentUserWorkspaces)
		r.Get("/client-portals/verify/{token}", s.VerifyClientPortal)

		r.Route("/workspaces", func(r chi.Router) {
			r.Post("/", s.CreateWorkspace)
			r.Route("/{workspaceID}", func(r chi.Router) {
				r.Get("/", s.GetWorkspace)
				r.Get("/channels", s.ListChannels)
				r.Post("/channels", s.CreateChannel)
				r.Get("/decisions", s.ListDecisions)
				r.Post("/decisions", s.CreateDecision)
				r.Get("/search", s.SearchMessages)
				r.Get("/members", s.ListWorkspaceMembers)
				r.Post("/dms", s.CreateDMChannel)
				r.Get("/client-portals", s.ListClientPortals)
				r.Post("/client-portals", s.CreateClientPortal)
			})
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
					r.Put("/reactions/{emoji}", s.AddReaction)
					r.Delete("/reactions/{emoji}", s.RemoveReaction)
				})
			})

			r.Route("/threads", func(r chi.Router) {
				r.Get("/", s.ListThreads)
				r.Post("/", s.CreateThread)
			})
		})

		r.Route("/threads/{threadID}", func(r chi.Router) {
			r.Get("/", s.GetThread)
		})
	})

	log.Printf("Messaging service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeData(w http.ResponseWriter, status int, data interface{}) {
	writeJSON(w, status, map[string]interface{}{"data": data})
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"message": message, "error": message})
}

func generateToken() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "fallback-token"
	}
	return hex.EncodeToString(bytes)
}

func (s *Server) Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	body.Email = strings.TrimSpace(body.Email)
	body.Username = strings.TrimSpace(body.Username)
	if body.Email == "" || body.Username == "" || len(body.Password) < 8 {
		writeError(w, http.StatusBadRequest, "Email, username, and an 8+ character password are required")
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to prepare credentials")
		return
	}

	userRecord, workspaceIDs, err := s.userRepo.Register(r.Context(), body.Email, body.Username, string(passwordHash))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	token, err := auth.CreateToken(userRecord.ID, workspaceIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create session token")
		return
	}

	writeData(w, http.StatusCreated, map[string]interface{}{
		"token": token,
		"user":  userRecord,
	})
}

func (s *Server) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	authUser, err := s.userRepo.Authenticate(r.Context(), body.Email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to look up account")
		return
	}
	if authUser == nil || bcrypt.CompareHashAndPassword([]byte(authUser.PasswordHash), []byte(body.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	workspaceIDs, err := s.userRepo.ListWorkspaceIDs(r.Context(), authUser.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load workspace access")
		return
	}

	token, err := auth.CreateToken(authUser.ID, workspaceIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create session token")
		return
	}

	writeData(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user":  authUser.User,
	})
}

func (s *Server) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	currentUser, err := s.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	writeData(w, http.StatusOK, currentUser)
}

func (s *Server) ListCurrentUserWorkspaces(w http.ResponseWriter, r *http.Request) {
	currentUser, err := s.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	workspaces, err := s.workspaceRepo.ListByUser(r.Context(), currentUser.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load workspaces")
		return
	}

	writeData(w, http.StatusOK, workspaces)
}

func (s *Server) CreateClientPortal(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	var portal clientportal.ClientPortal
	if err := json.NewDecoder(r.Body).Decode(&portal); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid portal payload")
		return
	}
	portal.WorkspaceID = workspaceID
	portal.InviteToken = generateToken()

	if err := s.portalRepo.Create(r.Context(), &portal); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeData(w, http.StatusCreated, portal)
}

func (s *Server) ListClientPortals(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	portals, err := s.portalRepo.ListByWorkspace(r.Context(), workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeData(w, http.StatusOK, portals)
}

func (s *Server) VerifyClientPortal(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	portal, err := s.portalRepo.GetByToken(r.Context(), token)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if portal == nil {
		writeError(w, http.StatusUnauthorized, "Invalid or expired token")
		return
	}
	writeData(w, http.StatusOK, portal)
}

func (s *Server) CreateWorkspace(w http.ResponseWriter, r *http.Request) {
	currentUser, err := s.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var wk workspace.Workspace
	if err := json.NewDecoder(r.Body).Decode(&wk); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid workspace payload")
		return
	}
	wk.OwnerID = currentUser.ID

	if err := s.workspaceRepo.Create(r.Context(), &wk); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if _, err := s.userRepo.DB.Pool.Exec(r.Context(), `
		INSERT INTO workspace_members (workspace_id, user_id, nickname, roles, permissions_override)
		VALUES ($1, $2, NULL, ARRAY[]::uuid[], '{}'::jsonb)
		ON CONFLICT (workspace_id, user_id) DO NOTHING
	`, wk.ID, currentUser.ID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeData(w, http.StatusCreated, wk)
}

func (s *Server) GetWorkspace(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	wk, err := s.workspaceRepo.Get(r.Context(), workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeData(w, http.StatusOK, wk)
}

func (s *Server) ListWorkspaceMembers(w http.ResponseWriter, r *http.Request) {
	if _, err := s.currentUser(r); err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	members, err := s.userRepo.ListWorkspaceMembers(r.Context(), workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeData(w, http.StatusOK, members)
}

func (s *Server) SearchMessages(w http.ResponseWriter, r *http.Request) {
	if s.searchRepo == nil {
		writeError(w, http.StatusNotImplemented, "Search is not configured")
		return
	}

	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	query := r.URL.Query().Get("q")
	filters := r.URL.Query().Get("filters")
	if query == "" {
		writeError(w, http.StatusBadRequest, "Query parameter 'q' is required")
		return
	}

	result, err := s.searchRepo.Search(r.Context(), workspaceID, query, filters)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeData(w, http.StatusOK, result)
}

func (s *Server) CreateDMChannel(w http.ResponseWriter, r *http.Request) {
	currentUser, err := s.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	var body struct {
		TargetUserID *int64 `json:"targetUserId"`
		Target       string `json:"target"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid direct message payload")
		return
	}

	var targetUser *user.User
	if body.TargetUserID != nil {
		targetUser, err = s.userRepo.GetByID(r.Context(), *body.TargetUserID)
	} else {
		targetUser, err = s.userRepo.FindByIdentifier(r.Context(), body.Target)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if targetUser == nil {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}
	if targetUser.ID == currentUser.ID {
		writeError(w, http.StatusBadRequest, "You already have yourself in the room")
		return
	}

	channelRecord, created, err := s.userRepo.CreateOrGetDMChannel(r.Context(), workspaceID, currentUser.ID, targetUser.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response, err := s.channelToResponse(r.Context(), channelRecord, &currentUser.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if created {
		s.publishWorkspaceEvent(workspaceID, "CHANNEL_CREATE", response)
	}

	writeData(w, http.StatusCreated, response)
}

func (s *Server) CreateChannel(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	var channelRecord channel.Channel
	if err := json.NewDecoder(r.Body).Decode(&channelRecord); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid channel payload")
		return
	}
	channelRecord.WorkspaceID = workspaceID

	if err := s.channelRepo.Create(r.Context(), &channelRecord); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response, err := s.channelToResponse(r.Context(), &channelRecord, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.publishWorkspaceEvent(workspaceID, "CHANNEL_CREATE", response)
	writeData(w, http.StatusCreated, response)
}

func (s *Server) ListChannels(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	channels, err := s.channelRepo.ListByWorkspace(r.Context(), workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var currentUserID *int64
	if currentUser, err := s.currentUser(r); err == nil {
		currentUserID = &currentUser.ID
	}

	responses := make([]map[string]interface{}, 0, len(channels))
	for _, channelRecord := range channels {
		if channelRecord.Type == "dm" {
			if currentUserID == nil || !containsInt64(user.ParseDMParticipants(channelRecord.PermissionOverwrites), *currentUserID) {
				continue
			}
		}

		response, err := s.channelToResponse(r.Context(), channelRecord, currentUserID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		responses = append(responses, response)
	}

	writeData(w, http.StatusOK, responses)
}

func (s *Server) GetChannel(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	channelRecord, err := s.channelRepo.Get(r.Context(), channelID)
	if err != nil {
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "Channel not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var currentUserID *int64
	if currentUser, err := s.currentUser(r); err == nil {
		currentUserID = &currentUser.ID
	}

	response, err := s.channelToResponse(r.Context(), channelRecord, currentUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeData(w, http.StatusOK, response)
}

func (s *Server) UpdateChannel(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	var channelRecord channel.Channel
	if err := json.NewDecoder(r.Body).Decode(&channelRecord); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid channel payload")
		return
	}

	if err := s.channelRepo.Update(r.Context(), channelID, &channelRecord); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	updated, err := s.channelRepo.Get(r.Context(), channelID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response, err := s.channelToResponse(r.Context(), updated, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.publishWorkspaceEvent(updated.WorkspaceID, "CHANNEL_UPDATE", response)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) DeleteChannel(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	channelRecord, err := s.channelRepo.Get(r.Context(), channelID)
	if err != nil {
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "Channel not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if err := s.channelRepo.Delete(r.Context(), channelID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.publishWorkspaceEvent(channelRecord.WorkspaceID, "CHANNEL_DELETE", map[string]interface{}{
		"id":           channelRecord.ID,
		"workspace_id": channelRecord.WorkspaceID,
	})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) CreateMessage(w http.ResponseWriter, r *http.Request) {
	currentUser, err := s.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	var messageRecord message.Message
	if err := json.NewDecoder(r.Body).Decode(&messageRecord); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid message payload")
		return
	}

	messageRecord.ChannelID = channelID
	messageRecord.AuthorID = currentUser.ID
	if err := s.repo.Create(r.Context(), &messageRecord); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if s.searchRepo != nil {
		channelRecord, err := s.channelRepo.Get(r.Context(), channelID)
		if err == nil && channelRecord != nil {
			go s.searchRepo.IndexMessage(context.Background(), &messageRecord, channelRecord.WorkspaceID)
		}
	}

	response, err := s.buildMessageResponse(r.Context(), &messageRecord, map[int64]*user.User{currentUser.ID: currentUser})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.publishChannelEvent(channelID, "MESSAGE_CREATE", response)
	writeData(w, http.StatusCreated, response)
}

func (s *Server) ListMessages(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit == 0 {
		limit = 50
	}

	var before *int64
	if beforeRaw := r.URL.Query().Get("before"); beforeRaw != "" {
		value, _ := strconv.ParseInt(beforeRaw, 10, 64)
		before = &value
	}

	messageRecords, err := s.repo.List(r.Context(), channelID, limit, before)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	responses, err := s.buildMessageResponses(r.Context(), messageRecords)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeData(w, http.StatusOK, responses)
}

func (s *Server) GetMessage(w http.ResponseWriter, r *http.Request) {
	messageID, _ := strconv.ParseInt(chi.URLParam(r, "messageID"), 10, 64)
	messageRecord, err := s.repo.Get(r.Context(), messageID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if messageRecord == nil {
		writeError(w, http.StatusNotFound, "Message not found")
		return
	}

	response, err := s.buildMessageResponse(r.Context(), messageRecord, map[int64]*user.User{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeData(w, http.StatusOK, response)
}

func (s *Server) UpdateMessage(w http.ResponseWriter, r *http.Request) {
	currentUser, err := s.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	messageID, _ := strconv.ParseInt(chi.URLParam(r, "messageID"), 10, 64)
	existing, err := s.repo.Get(r.Context(), messageID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing == nil {
		writeError(w, http.StatusNotFound, "Message not found")
		return
	}
	if existing.AuthorID != currentUser.ID {
		writeError(w, http.StatusForbidden, "You can only edit your own messages")
		return
	}

	var body struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid message payload")
		return
	}

	if err := s.repo.Update(r.Context(), messageID, body.Content); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	updated, err := s.repo.Get(r.Context(), messageID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response, err := s.buildMessageResponse(r.Context(), updated, map[int64]*user.User{currentUser.ID: currentUser})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.publishChannelEvent(updated.ChannelID, "MESSAGE_UPDATE", response)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) DeleteMessage(w http.ResponseWriter, r *http.Request) {
	currentUser, err := s.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	messageID, _ := strconv.ParseInt(chi.URLParam(r, "messageID"), 10, 64)
	messageRecord, err := s.repo.Get(r.Context(), messageID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if messageRecord == nil {
		writeError(w, http.StatusNotFound, "Message not found")
		return
	}
	if messageRecord.AuthorID != currentUser.ID {
		writeError(w, http.StatusForbidden, "You can only delete your own messages")
		return
	}

	if err := s.repo.Delete(r.Context(), messageID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.publishChannelEvent(messageRecord.ChannelID, "MESSAGE_DELETE", map[string]interface{}{
		"id":         messageID,
		"channel_id": messageRecord.ChannelID,
	})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) AddReaction(w http.ResponseWriter, r *http.Request) {
	currentUser, err := s.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	messageID, _ := strconv.ParseInt(chi.URLParam(r, "messageID"), 10, 64)
	emoji := chi.URLParam(r, "emoji")

	if err := s.reactionRepo.Add(r.Context(), &reaction.Reaction{
		MessageID: messageID,
		UserID:    currentUser.ID,
		EmojiName: emoji,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.publishChannelEvent(channelID, "MESSAGE_REACTION_ADD", map[string]interface{}{
		"message_id": messageID,
		"channel_id": channelID,
		"emoji":      emoji,
		"user_id":    currentUser.ID,
	})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) RemoveReaction(w http.ResponseWriter, r *http.Request) {
	currentUser, err := s.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	messageID, _ := strconv.ParseInt(chi.URLParam(r, "messageID"), 10, 64)
	emoji := chi.URLParam(r, "emoji")

	if err := s.reactionRepo.Remove(r.Context(), messageID, currentUser.ID, emoji); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.publishChannelEvent(channelID, "MESSAGE_REACTION_REMOVE", map[string]interface{}{
		"message_id": messageID,
		"channel_id": channelID,
		"emoji":      emoji,
		"user_id":    currentUser.ID,
	})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) CreateThread(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	currentUser, _ := s.currentUser(r)

	var threadRecord thread.Thread
	if err := json.NewDecoder(r.Body).Decode(&threadRecord); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid thread payload")
		return
	}
	threadRecord.ChannelID = channelID
	if currentUser != nil && threadRecord.CreatorID == 0 {
		threadRecord.CreatorID = currentUser.ID
	}

	if err := s.threadRepo.Create(r.Context(), &threadRecord); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.publishChannelEvent(channelID, "THREAD_CREATE", threadRecord)
	writeData(w, http.StatusCreated, threadRecord)
}

func (s *Server) ListThreads(w http.ResponseWriter, r *http.Request) {
	channelID, _ := strconv.ParseInt(chi.URLParam(r, "channelID"), 10, 64)
	status := r.URL.Query().Get("status")
	if status == "" {
		status = "open"
	}

	threads, err := s.threadRepo.ListByChannel(r.Context(), channelID, status)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeData(w, http.StatusOK, threads)
}

func (s *Server) GetThread(w http.ResponseWriter, r *http.Request) {
	threadID, _ := strconv.ParseInt(chi.URLParam(r, "threadID"), 10, 64)
	threadRecord, err := s.threadRepo.Get(r.Context(), threadID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeData(w, http.StatusOK, threadRecord)
}

func (s *Server) CreateDecision(w http.ResponseWriter, r *http.Request) {
	currentUser, err := s.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	var decisionRecord decision.Decision
	if err := json.NewDecoder(r.Body).Decode(&decisionRecord); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid decision payload")
		return
	}
	decisionRecord.WorkspaceID = workspaceID
	decisionRecord.CreatedBy = currentUser.ID

	if err := s.decisionRepo.Create(r.Context(), &decisionRecord); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if decisionRecord.ChannelID != nil {
		s.publishChannelEvent(*decisionRecord.ChannelID, "DECISION_LOGGED", decisionRecord)
	}

	writeData(w, http.StatusCreated, decisionRecord)
}

func (s *Server) ListDecisions(w http.ResponseWriter, r *http.Request) {
	workspaceID, _ := strconv.ParseInt(chi.URLParam(r, "workspaceID"), 10, 64)
	decisions, err := s.decisionRepo.ListByWorkspace(r.Context(), workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeData(w, http.StatusOK, decisions)
}

func (s *Server) currentUser(r *http.Request) (*user.User, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, fmt.Errorf("missing authorization")
	}

	claims, err := auth.VerifyToken(authHeader)
	if err != nil {
		return nil, err
	}

	userID, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil {
		return nil, err
	}

	currentUser, err := s.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		return nil, err
	}
	if currentUser == nil {
		return nil, fmt.Errorf("user not found")
	}
	return currentUser, nil
}

func (s *Server) buildMessageResponses(ctx context.Context, messageRecords []*message.Message) ([]map[string]interface{}, error) {
	cache := make(map[int64]*user.User)
	responses := make([]map[string]interface{}, 0, len(messageRecords))

	for _, messageRecord := range messageRecords {
		response, err := s.buildMessageResponse(ctx, messageRecord, cache)
		if err != nil {
			return nil, err
		}
		responses = append(responses, response)
	}

	return responses, nil
}

func (s *Server) buildMessageResponse(ctx context.Context, messageRecord *message.Message, userCache map[int64]*user.User) (map[string]interface{}, error) {
	reactionRows, err := s.reactionRepo.ListByMessage(ctx, messageRecord.ID)
	if err != nil {
		return nil, err
	}

	var authorRecord *user.User
	if cachedUser, ok := userCache[messageRecord.AuthorID]; ok {
		authorRecord = cachedUser
	} else if messageRecord.AuthorID != 0 {
		authorRecord, err = s.userRepo.GetByID(ctx, messageRecord.AuthorID)
		if err != nil {
			return nil, err
		}
		userCache[messageRecord.AuthorID] = authorRecord
	}

	response := map[string]interface{}{
		"id":          messageRecord.ID,
		"channel_id":  messageRecord.ChannelID,
		"author_id":   messageRecord.AuthorID,
		"content":     messageRecord.Content,
		"type":        messageRecord.Type,
		"attachments": safeRawJSON(messageRecord.Attachments),
		"reactions":   summarizeReactions(reactionRows),
		"pinned":      messageRecord.Pinned,
		"created_at":  messageRecord.CreatedAt,
	}
	if messageRecord.EditedAt != nil {
		response["edited_at"] = messageRecord.EditedAt
	}
	if messageRecord.ReferenceID != nil {
		response["reference_id"] = *messageRecord.ReferenceID
	}
	if authorRecord != nil {
		response["author"] = authorRecord
	}

	return response, nil
}

func (s *Server) channelToResponse(ctx context.Context, channelRecord *channel.Channel, currentUserID *int64) (map[string]interface{}, error) {
	response := map[string]interface{}{
		"id":           channelRecord.ID,
		"workspace_id": channelRecord.WorkspaceID,
		"name":         channelRecord.Name,
		"type":         channelRecord.Type,
		"description":  channelRecord.Topic,
		"position":     channelRecord.Position,
		"created_at":   channelRecord.CreatedAt,
		"is_private":   channelRecord.Type == "dm",
	}

	if channelRecord.ParentID != nil {
		response["parent_id"] = *channelRecord.ParentID
	}

	if channelRecord.Type == "dm" {
		participants := user.ParseDMParticipants(channelRecord.PermissionOverwrites)
		response["participant_ids"] = participants

		if currentUserID != nil {
			otherNames := make([]string, 0, len(participants))
			for _, participantID := range participants {
				if participantID == *currentUserID {
					continue
				}
				member, err := s.userRepo.GetByID(ctx, participantID)
				if err != nil {
					return nil, err
				}
				if member != nil {
					otherNames = append(otherNames, member.DisplayName)
				}
			}
			if len(otherNames) > 0 {
				response["name"] = strings.Join(otherNames, ", ")
			}
		}
	}

	return response, nil
}

func summarizeReactions(reactionRows []*reaction.Reaction) []messageReactionSummary {
	byEmoji := make(map[string]*messageReactionSummary)
	order := make([]string, 0, len(reactionRows))

	for _, reactionRecord := range reactionRows {
		summary, exists := byEmoji[reactionRecord.EmojiName]
		if !exists {
			summary = &messageReactionSummary{
				Emoji:         reactionRecord.EmojiName,
				EmojiID:       reactionRecord.EmojiID,
				EmojiAnimated: reactionRecord.EmojiAnimated,
				UserIDs:       []int64{},
			}
			byEmoji[reactionRecord.EmojiName] = summary
			order = append(order, reactionRecord.EmojiName)
		}

		summary.Count++
		summary.UserIDs = append(summary.UserIDs, reactionRecord.UserID)
	}

	summaries := make([]messageReactionSummary, 0, len(order))
	for _, emoji := range order {
		summaries = append(summaries, *byEmoji[emoji])
	}
	return summaries
}

func containsInt64(values []int64, candidate int64) bool {
	for _, value := range values {
		if value == candidate {
			return true
		}
	}
	return false
}

func safeRawJSON(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 {
		return json.RawMessage(`[]`)
	}
	return raw
}

func (s *Server) publishWorkspaceEvent(workspaceID int64, event string, data interface{}) {
	payload := map[string]interface{}{"op": 0, "t": event, "d": data}
	body, _ := json.Marshal(payload)
	_, _ = s.js.Publish(fmt.Sprintf("workspace.%d", workspaceID), body)
}

func (s *Server) publishChannelEvent(channelID int64, event string, data interface{}) {
	payload := map[string]interface{}{"op": 0, "t": event, "d": data}
	body, _ := json.Marshal(payload)
	_, _ = s.js.Publish(fmt.Sprintf("channel.%d", channelID), body)
}
