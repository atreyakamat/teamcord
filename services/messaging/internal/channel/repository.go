package channel

import (
	"context"
	"encoding/json"
	"time"

	"github.com/teamcord/messaging/internal/db"
)

type Channel struct {
	ID                   int64           `json:"id"`
	WorkspaceID          int64           `json:"workspace_id"`
	ProjectID            *int64          `json:"project_id,omitempty"`
	Name                 string          `json:"name"`
	Type                 string          `json:"type"`
	Topic                string          `json:"topic"`
	Position             int             `json:"position"`
	ParentID             *int64          `json:"parent_id,omitempty"`
	PermissionOverwrites json.RawMessage `json:"permission_overwrites"`
	LastMessageID        *int64          `json:"last_message_id,omitempty"`
	RateLimitPerUser     int             `json:"rate_limit_per_user"`
	CreatedAt            time.Time       `json:"created_at"`
}

type Repository struct {
	DB *db.Database
}

func (r *Repository) Create(ctx context.Context, c *Channel) error {
	query := `
		INSERT INTO channels (workspace_id, project_id, name, type, topic, position, parent_id, permission_overwrites)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at`
	
	err := r.DB.Pool.QueryRow(ctx, query,
		c.WorkspaceID, c.ProjectID, c.Name, c.Type, c.Topic, c.Position, c.ParentID, c.PermissionOverwrites,
	).Scan(&c.ID, &c.CreatedAt)
	
	return err
}

func (r *Repository) Get(ctx context.Context, id int64) (*Channel, error) {
	query := `SELECT id, workspace_id, project_id, name, type, topic, position, parent_id, permission_overwrites, last_message_id, rate_limit_per_user, created_at FROM channels WHERE id = $1`
	
	c := &Channel{}
	err := r.DB.Pool.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.WorkspaceID, &c.ProjectID, &c.Name, &c.Type, &c.Topic, &c.Position, &c.ParentID, &c.PermissionOverwrites, &c.LastMessageID, &c.RateLimitPerUser, &c.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *Repository) ListByWorkspace(ctx context.Context, workspaceID int64) ([]*Channel, error) {
	query := `SELECT id, workspace_id, project_id, name, type, topic, position, parent_id, permission_overwrites, last_message_id, rate_limit_per_user, created_at FROM channels WHERE workspace_id = $1 ORDER BY position ASC`
	
	rows, err := r.DB.Pool.Query(ctx, query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []*Channel
	for rows.Next() {
		c := &Channel{}
		err := rows.Scan(
			&c.ID, &c.WorkspaceID, &c.ProjectID, &c.Name, &c.Type, &c.Topic, &c.Position, &c.ParentID, &c.PermissionOverwrites, &c.LastMessageID, &c.RateLimitPerUser, &c.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		channels = append(channels, c)
	}
	return channels, nil
}

func (r *Repository) Update(ctx context.Context, id int64, c *Channel) error {
	query := `UPDATE channels SET name = $1, topic = $2, position = $3, parent_id = $4, permission_overwrites = $5 WHERE id = $6`
	_, err := r.DB.Pool.Exec(ctx, query, c.Name, c.Topic, c.Position, c.ParentID, c.PermissionOverwrites, id)
	return err
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM channels WHERE id = $1`
	_, err := r.DB.Pool.Exec(ctx, query, id)
	return err
}
