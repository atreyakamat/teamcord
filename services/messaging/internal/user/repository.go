package user

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"strings"
	"time"
	"unicode"

	"github.com/jackc/pgx/v5"
	"github.com/teamcord/messaging/internal/channel"
	"github.com/teamcord/messaging/internal/db"
)

type scanner interface {
	Scan(dest ...any) error
}

type User struct {
	ID            int64      `json:"id"`
	Email         string     `json:"email"`
	Username      string     `json:"username"`
	DisplayName   string     `json:"display_name"`
	Discriminator string     `json:"discriminator"`
	AvatarURL     *string    `json:"avatar_url,omitempty"`
	Status        string     `json:"status"`
	CustomStatus  *string    `json:"custom_status,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	LastSeenAt    *time.Time `json:"last_seen_at,omitempty"`
}

type Member struct {
	User
	Role string `json:"role"`
}

type AuthUser struct {
	User
	PasswordHash string
}

type Repository struct {
	DB *db.Database
}

func (r *Repository) EnsureSupportTables(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS auth_credentials (
			user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			password_hash text NOT NULL,
			created_at timestamptz DEFAULT now()
		)`
	_, err := r.DB.Pool.Exec(ctx, query)
	return err
}

func (r *Repository) Register(ctx context.Context, email, username, passwordHash string) (*User, []int64, error) {
	tx, err := r.DB.Pool.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	discriminator := fmt.Sprintf("%04d", rand.New(rand.NewSource(time.Now().UnixNano())).Intn(10000))

	row := tx.QueryRow(ctx, `
		INSERT INTO users (email, username, discriminator, status, keycloak_id)
		VALUES ($1, $2, $3, 'online', gen_random_uuid())
		RETURNING id, email, username, discriminator, avatar_url, status, custom_status, created_at, last_seen_at
	`, email, username, discriminator)

	userRecord, err := scanUser(row)
	if err != nil {
		return nil, nil, err
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO auth_credentials (user_id, password_hash)
		VALUES ($1, $2)
	`, userRecord.ID, passwordHash); err != nil {
		return nil, nil, err
	}

	workspaceName := fmt.Sprintf("%s Team", userRecord.DisplayName)
	slug, err := r.uniqueWorkspaceSlug(ctx, tx, username)
	if err != nil {
		return nil, nil, err
	}

	var workspaceID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO workspaces (name, slug, owner_id, plan)
		VALUES ($1, $2, $3, 'community')
		RETURNING id
	`, workspaceName, slug, userRecord.ID).Scan(&workspaceID); err != nil {
		return nil, nil, err
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO workspace_members (workspace_id, user_id, nickname, roles, permissions_override)
		VALUES ($1, $2, NULL, ARRAY[]::uuid[], '{}'::jsonb)
		ON CONFLICT (workspace_id, user_id) DO NOTHING
	`, workspaceID, userRecord.ID); err != nil {
		return nil, nil, err
	}

	defaultChannels := []channel.Channel{
		{
			WorkspaceID:          workspaceID,
			Name:                 "general",
			Type:                 "text",
			Topic:                "Kickoffs, updates, and the day-to-day conversation.",
			Position:             0,
			PermissionOverwrites: json.RawMessage(`[]`),
		},
		{
			WorkspaceID:          workspaceID,
			Name:                 "product",
			Type:                 "text",
			Topic:                "Planning, feedback, and feature discussion.",
			Position:             1,
			PermissionOverwrites: json.RawMessage(`[]`),
		},
		{
			WorkspaceID:          workspaceID,
			Name:                 "lounge",
			Type:                 "voice",
			Topic:                "Jump in for quick syncs and casual calls.",
			Position:             2,
			PermissionOverwrites: json.RawMessage(`[]`),
		},
	}

	for _, defaultChannel := range defaultChannels {
		if err := tx.QueryRow(ctx, `
			INSERT INTO channels (workspace_id, project_id, name, type, topic, position, parent_id, permission_overwrites)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id
		`, defaultChannel.WorkspaceID, defaultChannel.ProjectID, defaultChannel.Name, defaultChannel.Type, defaultChannel.Topic, defaultChannel.Position, defaultChannel.ParentID, defaultChannel.PermissionOverwrites).Scan(&defaultChannel.ID); err != nil {
			return nil, nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}

	return userRecord, []int64{workspaceID}, nil
}

func (r *Repository) Authenticate(ctx context.Context, email string) (*AuthUser, error) {
	row := r.DB.Pool.QueryRow(ctx, `
		SELECT u.id, u.email, u.username, u.discriminator, u.avatar_url, u.status, u.custom_status, u.created_at, u.last_seen_at, ac.password_hash
		FROM users u
		JOIN auth_credentials ac ON ac.user_id = u.id
		WHERE lower(u.email) = lower($1)
	`, email)

	authUser := &AuthUser{}
	if err := row.Scan(
		&authUser.ID,
		&authUser.Email,
		&authUser.Username,
		&authUser.Discriminator,
		&authUser.AvatarURL,
		&authUser.Status,
		&authUser.CustomStatus,
		&authUser.CreatedAt,
		&authUser.LastSeenAt,
		&authUser.PasswordHash,
	); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	authUser.DisplayName = humanizeUsername(authUser.Username)
	return authUser, nil
}

func (r *Repository) GetByID(ctx context.Context, userID int64) (*User, error) {
	row := r.DB.Pool.QueryRow(ctx, `
		SELECT id, email, username, discriminator, avatar_url, status, custom_status, created_at, last_seen_at
		FROM users
		WHERE id = $1
	`, userID)

	userRecord, err := scanUser(row)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return userRecord, err
}

func (r *Repository) FindByIdentifier(ctx context.Context, identifier string) (*User, error) {
	identifier = strings.TrimSpace(identifier)
	if identifier == "" {
		return nil, nil
	}

	row := r.DB.Pool.QueryRow(ctx, `
		SELECT id, email, username, discriminator, avatar_url, status, custom_status, created_at, last_seen_at
		FROM users
		WHERE lower(username) = lower($1) OR lower(email) = lower($1)
		LIMIT 1
	`, identifier)

	userRecord, err := scanUser(row)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return userRecord, err
}

func (r *Repository) ListWorkspaceIDs(ctx context.Context, userID int64) ([]int64, error) {
	rows, err := r.DB.Pool.Query(ctx, `
		SELECT workspace_id
		FROM workspace_members
		WHERE user_id = $1
		ORDER BY joined_at ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaceIDs []int64
	for rows.Next() {
		var workspaceID int64
		if err := rows.Scan(&workspaceID); err != nil {
			return nil, err
		}
		workspaceIDs = append(workspaceIDs, workspaceID)
	}
	return workspaceIDs, nil
}

func (r *Repository) ListWorkspaceMembers(ctx context.Context, workspaceID int64) ([]*Member, error) {
	rows, err := r.DB.Pool.Query(ctx, `
		SELECT
			u.id,
			u.email,
			u.username,
			u.discriminator,
			u.avatar_url,
			u.status,
			u.custom_status,
			u.created_at,
			u.last_seen_at,
			CASE WHEN w.owner_id = u.id THEN 'Owner' ELSE 'Member' END AS role
		FROM users u
		JOIN workspace_members wm ON wm.user_id = u.id
		JOIN workspaces w ON w.id = wm.workspace_id
		WHERE wm.workspace_id = $1
		ORDER BY u.status DESC, u.username ASC
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*Member
	for rows.Next() {
		member := &Member{}
		if err := rows.Scan(
			&member.ID,
			&member.Email,
			&member.Username,
			&member.Discriminator,
			&member.AvatarURL,
			&member.Status,
			&member.CustomStatus,
			&member.CreatedAt,
			&member.LastSeenAt,
			&member.Role,
		); err != nil {
			return nil, err
		}
		member.DisplayName = humanizeUsername(member.Username)
		members = append(members, member)
	}

	return members, nil
}

func (r *Repository) CreateOrGetDMChannel(ctx context.Context, workspaceID, userID, targetUserID int64) (*channel.Channel, bool, error) {
	channelRepo := &channel.Repository{DB: r.DB}
	channels, err := channelRepo.ListByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, false, err
	}

	for _, existingChannel := range channels {
		if existingChannel.Type != "dm" {
			continue
		}
		if sameParticipants(ParseDMParticipants(existingChannel.PermissionOverwrites), userID, targetUserID) {
			return existingChannel, false, nil
		}
	}

	participantPayload, err := json.Marshal(map[string][]int64{
		"participants": orderedParticipants(userID, targetUserID),
	})
	if err != nil {
		return nil, false, err
	}

	dmChannel := &channel.Channel{
		WorkspaceID:          workspaceID,
		Name:                 fmt.Sprintf("dm-%d-%d", userID, targetUserID),
		Type:                 "dm",
		Topic:                "Direct messages",
		Position:             len(channels) + 1,
		PermissionOverwrites: participantPayload,
	}

	if err := channelRepo.Create(ctx, dmChannel); err != nil {
		return nil, false, err
	}

	return dmChannel, true, nil
}

func ParseDMParticipants(raw json.RawMessage) []int64 {
	var payload struct {
		Participants []int64 `json:"participants"`
	}
	if len(raw) == 0 {
		return nil
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil
	}
	return payload.Participants
}

func orderedParticipants(userIDs ...int64) []int64 {
	seen := make(map[int64]bool)
	ordered := make([]int64, 0, len(userIDs))
	for _, userID := range userIDs {
		if seen[userID] {
			continue
		}
		seen[userID] = true
		ordered = append(ordered, userID)
	}
	if len(ordered) == 2 && ordered[0] > ordered[1] {
		ordered[0], ordered[1] = ordered[1], ordered[0]
	}
	return ordered
}

func sameParticipants(participants []int64, left int64, right int64) bool {
	ordered := orderedParticipants(left, right)
	if len(participants) != len(ordered) {
		return false
	}
	for index := range participants {
		if participants[index] != ordered[index] {
			return false
		}
	}
	return true
}

func scanUser(row scanner) (*User, error) {
	userRecord := &User{}
	if err := row.Scan(
		&userRecord.ID,
		&userRecord.Email,
		&userRecord.Username,
		&userRecord.Discriminator,
		&userRecord.AvatarURL,
		&userRecord.Status,
		&userRecord.CustomStatus,
		&userRecord.CreatedAt,
		&userRecord.LastSeenAt,
	); err != nil {
		return nil, err
	}

	userRecord.DisplayName = humanizeUsername(userRecord.Username)
	return userRecord, nil
}

func (r *Repository) uniqueWorkspaceSlug(ctx context.Context, tx pgx.Tx, username string) (string, error) {
	base := slugify(username)
	if base == "" {
		base = "teamcord"
	}

	slug := base
	suffix := 1

	for {
		var exists bool
		err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM workspaces WHERE slug = $1)`, slug).Scan(&exists)
		if err != nil {
			return "", err
		}
		if !exists {
			return slug, nil
		}
		suffix++
		slug = fmt.Sprintf("%s-%d", base, suffix)
	}
}

func slugify(input string) string {
	var builder strings.Builder
	lastDash := false

	for _, r := range strings.ToLower(strings.TrimSpace(input)) {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			builder.WriteRune(r)
			lastDash = false
		case !lastDash:
			builder.WriteRune('-')
			lastDash = true
		}
	}

	return strings.Trim(builder.String(), "-")
}

func humanizeUsername(username string) string {
	username = strings.TrimSpace(username)
	if username == "" {
		return "TeamCord User"
	}

	parts := strings.FieldsFunc(username, func(r rune) bool {
		return r == '_' || r == '-' || r == '.'
	})
	if len(parts) == 0 {
		parts = []string{username}
	}

	for index, part := range parts {
		runes := []rune(strings.ToLower(part))
		if len(runes) == 0 {
			continue
		}
		runes[0] = unicode.ToUpper(runes[0])
		parts[index] = string(runes)
	}

	return strings.Join(parts, " ")
}
