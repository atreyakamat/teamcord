package reaction

import (
	"context"
	"time"

	"github.com/teamcord/messaging/internal/db"
)

type Reaction struct {
	MessageID      int64     `json:"message_id"`
	UserID         int64     `json:"user_id"`
	EmojiID        *int64    `json:"emoji_id"`
	EmojiName      string    `json:"emoji_name"`
	EmojiAnimated  bool      `json:"emoji_animated"`
	CreatedAt      time.Time `json:"created_at"`
}

type Repository struct {
	DB *db.Database
}

func (r *Repository) Add(ctx context.Context, react *Reaction) error {
	query := `
		INSERT INTO reactions (message_id, user_id, emoji_id, emoji_name, emoji_animated)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (message_id, user_id, emoji_name) DO NOTHING`
	
	_, err := r.DB.Pool.Exec(ctx, query,
		react.MessageID, react.UserID, react.EmojiID, react.EmojiName, react.EmojiAnimated,
	)
	return err
}

func (r *Repository) Remove(ctx context.Context, messageID int64, userID int64, emojiName string) error {
	query := `DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji_name = $3`
	_, err := r.DB.Pool.Exec(ctx, query, messageID, userID, emojiName)
	return err
}

func (r *Repository) ListByMessage(ctx context.Context, messageID int64) ([]*Reaction, error) {
	query := `SELECT message_id, user_id, emoji_id, emoji_name, emoji_animated, created_at FROM reactions WHERE message_id = $1`
	
	rows, err := r.DB.Pool.Query(ctx, query, messageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reactions []*Reaction
	for rows.Next() {
		re := &Reaction{}
		err := rows.Scan(&re.MessageID, &re.UserID, &re.EmojiID, &re.EmojiName, &re.EmojiAnimated, &re.CreatedAt)
		if err != nil {
			return nil, err
		}
		reactions = append(reactions, re)
	}
	return reactions, nil
}
