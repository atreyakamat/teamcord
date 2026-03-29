package message

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/nexus/messaging/internal/db"
)

type Message struct {
	ID           int64           `json:"id"`
	ChannelID    int64           `json:"channel_id"`
	AuthorID     int64           `json:"author_id"`
	Content      string          `json:"content"`
	Type         string          `json:"type"`
	Attachments  json.RawMessage `json:"attachments"`
	Embeds       json.RawMessage `json:"embeds"`
	Mentions     []int64         `json:"mentions"`
	MentionRoles []string        `json:"mention_roles"`
	ReferenceID  *int64          `json:"reference_id,omitempty"`
	EditedAt     *time.Time      `json:"edited_at,omitempty"`
	DeletedAt    *time.Time      `json:"deleted_at,omitempty"`
	Pinned       bool            `json:"pinned"`
	Flags        int             `json:"flags"`
	CreatedAt    time.Time       `json:"created_at"`
}

type Repository struct {
	DB *db.Database
}

func (r *Repository) Create(ctx context.Context, m *Message) error {
	query := `
		INSERT INTO messages (
			channel_id, author_id, content, type, attachments, embeds, mentions, mention_roles, reference_id, pinned, flags
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		) RETURNING id, created_at`

	err := r.DB.Pool.QueryRow(ctx, query,
		m.ChannelID, m.AuthorID, m.Content, m.Type, m.Attachments, m.Embeds, m.Mentions, m.MentionRoles, m.ReferenceID, m.Pinned, m.Flags,
	).Scan(&m.ID, &m.CreatedAt)

	return err
}

func (r *Repository) Get(ctx context.Context, id int64) (*Message, error) {
	query := `SELECT id, channel_id, author_id, content, type, attachments, embeds, mentions, mention_roles, reference_id, edited_at, deleted_at, pinned, flags, created_at FROM messages WHERE id = $1`
	
	m := &Message{}
	err := r.DB.Pool.QueryRow(ctx, query, id).Scan(
		&m.ID, &m.ChannelID, &m.AuthorID, &m.Content, &m.Type, &m.Attachments, &m.Embeds, &m.Mentions, &m.MentionRoles, &m.ReferenceID, &m.EditedAt, &m.DeletedAt, &m.Pinned, &m.Flags, &m.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return m, err
}

func (r *Repository) List(ctx context.Context, channelID int64, limit int, before *int64) ([]*Message, error) {
	query := `
		SELECT id, channel_id, author_id, content, type, attachments, embeds, mentions, mention_roles, reference_id, edited_at, deleted_at, pinned, flags, created_at
		FROM messages
		WHERE channel_id = $1 AND deleted_at IS NULL`
	
	args := []interface{}{channelID}
	if before != nil {
		query += " AND id < $2"
		args = append(args, *before)
	}
	query += " ORDER BY id DESC LIMIT $3"
	args = append(args, limit)

	rows, err := r.DB.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []*Message
	for rows.Next() {
		m := &Message{}
		err := rows.Scan(
			&m.ID, &m.ChannelID, &m.AuthorID, &m.Content, &m.Type, &m.Attachments, &m.Embeds, &m.Mentions, &m.MentionRoles, &m.ReferenceID, &m.EditedAt, &m.DeletedAt, &m.Pinned, &m.Flags, &m.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (r *Repository) Update(ctx context.Context, id int64, content string) error {
	query := `UPDATE messages SET content = $1, edited_at = now() WHERE id = $2`
	_, err := r.DB.Pool.Exec(ctx, query, content, id)
	return err
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	query := `UPDATE messages SET deleted_at = now() WHERE id = $1`
	_, err := r.DB.Pool.Exec(ctx, query, id)
	return err
}
