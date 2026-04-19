package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	neturl "net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type claims struct {
	Subject           string `json:"sub"`
	Email             string `json:"email,omitempty"`
	PreferredUsername string `json:"preferred_username,omitempty"`
	Name              string `json:"name,omitempty"`
	jwt.RegisteredClaims
}

type fileRecord struct {
	ID        string `json:"id"`
	URL       string `json:"url"`
	Filename  string `json:"filename"`
	MimeType  string `json:"mime_type"`
	Size      int64  `json:"size"`
	Width     *int   `json:"width,omitempty"`
	Height    *int   `json:"height,omitempty"`
	ChannelID *int64 `json:"channel_id,omitempty"`
}

type server struct {
	db             *pgxpool.Pool
	minioClient    *minio.Client
	bucket         string
	publicURL      string
	signedURLTTL   time.Duration
	maxUploadBytes int64
	snowflake      *snowflakeGenerator
}

type snowflakeGenerator struct {
	mu            sync.Mutex
	lastTimestamp int64
	sequence      int64
	nodeID        int64
}

func newSnowflakeGenerator(nodeID int64) *snowflakeGenerator {
	return &snowflakeGenerator{nodeID: nodeID & 0x3FF}
}

func (g *snowflakeGenerator) Next() int64 {
	g.mu.Lock()
	defer g.mu.Unlock()

	const customEpoch int64 = 1704067200000 // 2024-01-01
	now := time.Now().UnixMilli()
	if now == g.lastTimestamp {
		g.sequence = (g.sequence + 1) & 0xFFF
		if g.sequence == 0 {
			for now <= g.lastTimestamp {
				now = time.Now().UnixMilli()
			}
		}
	} else {
		g.sequence = 0
	}
	g.lastTimestamp = now

	return ((now - customEpoch) << 22) | (g.nodeID << 12) | g.sequence
}

func main() {
	port := envString("PORT", "3003")
	dbURL := envString("DATABASE_URL", "")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	minioEndpoint := envString("MINIO_ENDPOINT", "localhost:9000")
	minioAccessKey := envString("MINIO_ACCESS_KEY", "")
	minioSecretKey := envString("MINIO_SECRET_KEY", "")
	if minioAccessKey == "" || minioSecretKey == "" {
		log.Fatal("MINIO_ACCESS_KEY and MINIO_SECRET_KEY are required")
	}

	useSSL := envBool("MINIO_USE_SSL", false)
	bucket := envString("MINIO_BUCKET", "teamcord-files")
	publicURL := strings.TrimRight(envString("FILES_PUBLIC_URL", ""), "/")
	ttlSeconds := envInt("FILES_SIGNED_URL_TTL_SECONDS", 300)
	maxUploadMB := envInt("FILES_MAX_UPLOAD_MB", 25)
	nodeID := envInt64("SNOWFLAKE_NODE_ID", 1)

	ctx := context.Background()
	dbPool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatal(err)
	}
	if err := dbPool.Ping(ctx); err != nil {
		log.Fatal(err)
	}

	minioClient, err := minio.New(minioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(minioAccessKey, minioSecretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		log.Fatal(err)
	}

	exists, err := minioClient.BucketExists(ctx, bucket)
	if err != nil {
		log.Fatal(err)
	}
	if !exists {
		if err := minioClient.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			log.Fatal(err)
		}
	}

	s := &server{
		db:             dbPool,
		minioClient:    minioClient,
		bucket:         bucket,
		publicURL:      publicURL,
		signedURLTTL:   time.Duration(ttlSeconds) * time.Second,
		maxUploadBytes: int64(maxUploadMB) * 1024 * 1024,
		snowflake:      newSnowflakeGenerator(nodeID),
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	r.Post("/upload/avatar", s.uploadAvatar)
	r.Post("/upload/attachment", s.uploadAttachment)
	r.Get("/f/{fileId}", s.redirectToSignedURL)

	log.Printf("Files service listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

func (s *server) uploadAvatar(w http.ResponseWriter, r *http.Request) {
	currentUserID, _, err := s.authenticate(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	if err := r.ParseMultipartForm(s.maxUploadBytes); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid multipart payload")
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Field 'file' is required")
		return
	}
	defer file.Close()

	if fileHeader.Size <= 0 {
		writeError(w, http.StatusBadRequest, "Uploaded file is empty")
		return
	}

	targetType := strings.ToLower(strings.TrimSpace(r.FormValue("targetType")))
	if targetType == "" {
		targetType = "user"
	}
	if targetType != "user" && targetType != "workspace" {
		writeError(w, http.StatusBadRequest, "targetType must be either 'user' or 'workspace'")
		return
	}

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	var workspaceID *int64
	var targetID int64
	switch targetType {
	case "workspace":
		workspaceValue, parseErr := strconv.ParseInt(strings.TrimSpace(r.FormValue("workspaceId")), 10, 64)
		if parseErr != nil || workspaceValue <= 0 {
			writeError(w, http.StatusBadRequest, "workspaceId is required for workspace avatars")
			return
		}
		workspaceID = &workspaceValue
		targetID = workspaceValue

		var membershipExists bool
		if err := s.db.QueryRow(r.Context(), `
			SELECT EXISTS(
				SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2
			)
		`, workspaceValue, currentUserID).Scan(&membershipExists); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to validate workspace access")
			return
		}
		if !membershipExists {
			writeError(w, http.StatusForbidden, "You are not a member of that workspace")
			return
		}
	default:
		targetID = currentUserID
	}

	objectKey := fmt.Sprintf(
		"avatars/%s/%d/%d-%s",
		targetType,
		targetID,
		s.snowflake.Next(),
		sanitizeFilename(fileHeader.Filename),
	)

	if _, err := s.minioClient.PutObject(
		r.Context(),
		s.bucket,
		objectKey,
		file,
		fileHeader.Size,
		minio.PutObjectOptions{ContentType: contentType},
	); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to upload avatar")
		return
	}

	record, err := s.insertFileRecord(r.Context(), &insertFileRecordParams{
		WorkspaceID: workspaceID,
		UploaderID:  currentUserID,
		Filename:    fileHeader.Filename,
		MimeType:    contentType,
		SizeBytes:   fileHeader.Size,
		StorageKey:  objectKey,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to persist avatar metadata")
		return
	}

	avatarURL := s.fileURL(record.ID)
	if targetType == "workspace" {
		if _, err := s.db.Exec(r.Context(), `UPDATE workspaces SET icon_url = $1 WHERE id = $2`, avatarURL, targetID); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to update workspace icon")
			return
		}
	} else {
		if _, err := s.db.Exec(r.Context(), `UPDATE users SET avatar_url = $1 WHERE id = $2`, avatarURL, currentUserID); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to update user avatar")
			return
		}
	}

	record.URL = avatarURL
	writeData(w, http.StatusCreated, map[string]any{
		"file":       record,
		"targetType": targetType,
		"targetId":   targetID,
	})
}

func (s *server) uploadAttachment(w http.ResponseWriter, r *http.Request) {
	currentUserID, _, err := s.authenticate(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	if err := r.ParseMultipartForm(s.maxUploadBytes); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid multipart payload")
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Field 'file' is required")
		return
	}
	defer file.Close()

	if fileHeader.Size <= 0 {
		writeError(w, http.StatusBadRequest, "Uploaded file is empty")
		return
	}

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	var channelID *int64
	if channelRaw := strings.TrimSpace(r.FormValue("channelId")); channelRaw != "" {
		parsedChannelID, parseErr := strconv.ParseInt(channelRaw, 10, 64)
		if parseErr != nil || parsedChannelID <= 0 {
			writeError(w, http.StatusBadRequest, "channelId must be a positive integer")
			return
		}
		channelID = &parsedChannelID
	}

	var workspaceID *int64
	if workspaceRaw := strings.TrimSpace(r.FormValue("workspaceId")); workspaceRaw != "" {
		parsedWorkspaceID, parseErr := strconv.ParseInt(workspaceRaw, 10, 64)
		if parseErr != nil || parsedWorkspaceID <= 0 {
			writeError(w, http.StatusBadRequest, "workspaceId must be a positive integer")
			return
		}
		workspaceID = &parsedWorkspaceID
	}

	if channelID != nil {
		var channelWorkspaceID int64
		if err := s.db.QueryRow(r.Context(), `SELECT workspace_id FROM channels WHERE id = $1`, *channelID).Scan(&channelWorkspaceID); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "Channel not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "Failed to read channel")
			return
		}
		if workspaceID == nil {
			workspaceID = &channelWorkspaceID
		} else if *workspaceID != channelWorkspaceID {
			writeError(w, http.StatusBadRequest, "workspaceId does not match channel")
			return
		}
	}

	if workspaceID != nil {
		var membershipExists bool
		if err := s.db.QueryRow(r.Context(), `
			SELECT EXISTS(
				SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2
			)
		`, *workspaceID, currentUserID).Scan(&membershipExists); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to validate workspace access")
			return
		}
		if !membershipExists {
			writeError(w, http.StatusForbidden, "You are not a member of that workspace")
			return
		}
	}

	workspacePrefix := "global"
	if workspaceID != nil {
		workspacePrefix = strconv.FormatInt(*workspaceID, 10)
	}
	objectKey := fmt.Sprintf(
		"attachments/%s/%d-%s",
		workspacePrefix,
		s.snowflake.Next(),
		sanitizeFilename(fileHeader.Filename),
	)

	if _, err := s.minioClient.PutObject(
		r.Context(),
		s.bucket,
		objectKey,
		file,
		fileHeader.Size,
		minio.PutObjectOptions{ContentType: contentType},
	); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to upload attachment")
		return
	}

	record, err := s.insertFileRecord(r.Context(), &insertFileRecordParams{
		WorkspaceID: workspaceID,
		UploaderID:  currentUserID,
		Filename:    fileHeader.Filename,
		MimeType:    contentType,
		SizeBytes:   fileHeader.Size,
		StorageKey:  objectKey,
		ChannelID:   channelID,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to persist attachment metadata")
		return
	}

	record.URL = s.fileURL(record.ID)
	writeData(w, http.StatusCreated, record)
}

func (s *server) redirectToSignedURL(w http.ResponseWriter, r *http.Request) {
	fileID := chi.URLParam(r, "fileId")
	if strings.TrimSpace(fileID) == "" {
		writeError(w, http.StatusBadRequest, "fileId is required")
		return
	}

	var storageKey string
	err := s.db.QueryRow(r.Context(), `
		SELECT storage_key
		FROM files
		WHERE id = $1::uuid
	`, fileID).Scan(&storageKey)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "File not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to load file metadata")
		return
	}

	signedURL, err := s.minioClient.PresignedGetObject(r.Context(), s.bucket, storageKey, s.signedURLTTL, neturl.Values{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate signed URL")
		return
	}

	http.Redirect(w, r, signedURL.String(), http.StatusTemporaryRedirect)
}

type insertFileRecordParams struct {
	WorkspaceID *int64
	UploaderID  int64
	Filename    string
	MimeType    string
	SizeBytes   int64
	StorageKey  string
	ChannelID   *int64
}

func (s *server) insertFileRecord(ctx context.Context, params *insertFileRecordParams) (*fileRecord, error) {
	record := &fileRecord{}
	err := s.db.QueryRow(ctx, `
		INSERT INTO files (
			workspace_id,
			uploader_id,
			filename,
			mimetype,
			size_bytes,
			storage_key,
			channel_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id::text, filename, mimetype, size_bytes, width, height, channel_id
	`,
		params.WorkspaceID,
		params.UploaderID,
		params.Filename,
		params.MimeType,
		params.SizeBytes,
		params.StorageKey,
		params.ChannelID,
	).Scan(
		&record.ID,
		&record.Filename,
		&record.MimeType,
		&record.Size,
		&record.Width,
		&record.Height,
		&record.ChannelID,
	)
	if err != nil {
		return nil, err
	}
	return record, nil
}

func (s *server) authenticate(r *http.Request) (int64, *claims, error) {
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if authHeader == "" {
		return 0, nil, fmt.Errorf("missing authorization")
	}

	token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if token == "" {
		return 0, nil, fmt.Errorf("missing token")
	}

	parsedClaims, err := verifyToken(token)
	if err != nil {
		return 0, nil, err
	}

	userID, err := s.resolveUserID(r.Context(), parsedClaims)
	if err != nil {
		return 0, nil, err
	}

	return userID, parsedClaims, nil
}

func (s *server) resolveUserID(ctx context.Context, tokenClaims *claims) (int64, error) {
	if userID, parseErr := strconv.ParseInt(tokenClaims.Subject, 10, 64); parseErr == nil && userID > 0 {
		var exists bool
		if err := s.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, userID).Scan(&exists); err != nil {
			return 0, err
		}
		if exists {
			return userID, nil
		}
	}

	var userID int64
	err := s.db.QueryRow(ctx, `SELECT id FROM users WHERE keycloak_id = $1::uuid`, tokenClaims.Subject).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, fmt.Errorf("user not found for subject")
		}
		return 0, err
	}
	return userID, nil
}

func (s *server) fileURL(fileID string) string {
	if s.publicURL == "" {
		return fmt.Sprintf("/f/%s", fileID)
	}
	return fmt.Sprintf("%s/f/%s", s.publicURL, fileID)
}

func sanitizeFilename(name string) string {
	base := filepath.Base(strings.TrimSpace(name))
	base = strings.ReplaceAll(base, " ", "_")
	base = strings.ReplaceAll(base, "..", "")
	if base == "" || base == "." || base == string(filepath.Separator) {
		return "upload.bin"
	}
	return base
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeData(w http.ResponseWriter, status int, payload any) {
	writeJSON(w, status, map[string]any{"data": payload})
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{
		"error":   message,
		"message": message,
	})
}

func envString(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func envInt64(key string, fallback int64) int64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return fallback
	}
	return value
}

func envBool(key string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	switch strings.ToLower(raw) {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

var (
	legacySecret = []byte(envString("JWT_SECRET", "change-me-in-production"))
	oidcOnce     sync.Once
	oidcVerifier *oidc.IDTokenVerifier
	oidcErr      error
)

func verifyToken(token string) (*claims, error) {
	if parsedClaims, err := verifyLegacyToken(token); err == nil {
		return parsedClaims, nil
	}
	return verifyKeycloakToken(token)
}

func verifyLegacyToken(token string) (*claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &claims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return legacySecret, nil
	})
	if err != nil {
		return nil, err
	}

	parsedClaims, ok := parsed.Claims.(*claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	return parsedClaims, nil
}

func verifyKeycloakToken(token string) (*claims, error) {
	verifier, err := getOIDCVerifier()
	if err != nil {
		return nil, err
	}

	idToken, err := verifier.Verify(context.Background(), token)
	if err != nil {
		return nil, err
	}

	var parsedClaims claims
	if err := idToken.Claims(&parsedClaims); err != nil {
		return nil, err
	}
	if strings.TrimSpace(parsedClaims.Subject) == "" {
		return nil, errors.New("missing token subject")
	}
	return &parsedClaims, nil
}

func getOIDCVerifier() (*oidc.IDTokenVerifier, error) {
	oidcOnce.Do(func() {
		issuer := envString("KEYCLOAK_ISSUER", "")
		if issuer == "" {
			oidcErr = errors.New("KEYCLOAK_ISSUER is not configured")
			return
		}

		provider, err := oidc.NewProvider(
			context.Background(),
			strings.TrimRight(issuer, "/"),
		)
		if err != nil {
			oidcErr = err
			return
		}

		clientID := envString("KEYCLOAK_CLIENT_ID", "")
		verifierConfig := &oidc.Config{
			SkipClientIDCheck: clientID == "",
			ClientID:          clientID,
		}
		oidcVerifier = provider.Verifier(verifierConfig)
	})
	return oidcVerifier, oidcErr
}

