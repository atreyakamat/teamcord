package thread

import (
	"context"
	"time"

	"github.com/teamcord/messaging/internal/db"
)

type Thread struct {
	ID              int64     `json:"id"`
	ChannelID       int64     `json:"channel_id"`
	Name            string    `json:"name"`
	CreatorID       int64     `json:"creator_id"`
	Type            string    `json:"type"`
	Status          string    `json:"status"`
	ParentMessageID *int64    `json:"parent_message_id,omitempty"`
	MessageCount    int       `json:"message_count"`
	MemberCount     int       `json:"member_count"`
	LastActivityAt  time.Time `json:"last_activity_at"`
}

type Repository struct {
	DB *db.Database
}

func (r *Repository) Create(ctx context.Context, t *Thread) error {
	query := `
		INSERT INTO threads (channel_id, name, creator_id, type, status, parent_message_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, last_activity_at`
	
	err := r.DB.Pool.QueryRow(ctx, query,
		t.ChannelID, t.Name, t.CreatorID, t.Type, t.Status, t.ParentMessageID,
	).Scan(&t.ID, &t.LastActivityAt)
	
	return err
}

func (r *Repository) Get(ctx context.Context, id int64) (*Thread, error) {
	query := `SELECT id, channel_id, name, creator_id, type, status, parent_message_id, message_count, member_count, last_activity_at FROM threads WHERE id = $1`
	
	t := &Thread{}
	err := r.DB.Pool.QueryRow(ctx, query, id).Scan(
		&t.ID, &t.ChannelID, &t.Name, &t.CreatorID, &t.Type, &t.Status, &t.ParentMessageID, &t.MessageCount, &t.MemberCount, &t.LastActivityAt,
	)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (r *Repository) ListByChannel(ctx context.Context, channelID int64, status string) ([]*Thread, error) {
	query := `SELECT id, channel_id, name, creator_id, type, status, parent_message_id, message_count, member_count, last_activity_at FROM threads WHERE channel_id = $1 AND status = $2 ORDER BY last_activity_at DESC`
	
	rows, err := r.DB.Pool.Query(ctx, query, channelID, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var threads []*Thread
	for rows.Next() {
		t := &Thread{}
		err := rows.Scan(
			&t.ID, &t.ChannelID, &t.Name, &t.CreatorID, &t.Type, &t.Status, &t.ParentMessageID, &t.MessageCount, &t.MemberCount, &t.LastActivityAt,
		)
		if err != nil {
			return nil, err
		}
		threads = append(threads, t)
	}
	return threads, nil
}
