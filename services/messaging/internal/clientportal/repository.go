package clientportal

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/teamcord/messaging/internal/db"
)

type ClientPortal struct {
	ID                   string          `json:"id"`
	WorkspaceID          int64           `json:"workspace_id"`
	ClientEmail          string          `json:"client_email"`
	ClientName           string          `json:"client_name"`
	AccessibleChannelIds json.RawMessage `json:"accessible_channel_ids"`
	InviteToken          string          `json:"invite_token"`
	ExpiresAt            *time.Time      `json:"expires_at,omitempty"`
	CreatedAt            time.Time       `json:"created_at"`
}

type Repository struct {
	DB *db.Database
}

func (r *Repository) Create(ctx context.Context, p *ClientPortal) error {
	query := `
		INSERT INTO client_portals (
			workspace_id, client_email, client_name, accessible_channel_ids, invite_token, expires_at
		) VALUES (
			$1, $2, $3, $4, $5, $6
		) RETURNING id, created_at`

	err := r.DB.Pool.QueryRow(ctx, query,
		p.WorkspaceID, p.ClientEmail, p.ClientName, p.AccessibleChannelIds, p.InviteToken, p.ExpiresAt,
	).Scan(&p.ID, &p.CreatedAt)

	return err
}

func (r *Repository) GetByToken(ctx context.Context, token string) (*ClientPortal, error) {
	query := `
		SELECT id, workspace_id, client_email, client_name, accessible_channel_ids, invite_token, expires_at, created_at
		FROM client_portals
		WHERE invite_token = $1 AND (expires_at IS NULL OR expires_at > now())`
	
	p := &ClientPortal{}
	err := r.DB.Pool.QueryRow(ctx, query, token).Scan(
		&p.ID, &p.WorkspaceID, &p.ClientEmail, &p.ClientName, &p.AccessibleChannelIds, &p.InviteToken, &p.ExpiresAt, &p.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (r *Repository) ListByWorkspace(ctx context.Context, workspaceID int64) ([]*ClientPortal, error) {
	query := `
		SELECT id, workspace_id, client_email, client_name, accessible_channel_ids, invite_token, expires_at, created_at
		FROM client_portals
		WHERE workspace_id = $1 ORDER BY created_at DESC`
	
	rows, err := r.DB.Pool.Query(ctx, query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var portals []*ClientPortal
	for rows.Next() {
		p := &ClientPortal{}
		err := rows.Scan(
			&p.ID, &p.WorkspaceID, &p.ClientEmail, &p.ClientName, &p.AccessibleChannelIds, &p.InviteToken, &p.ExpiresAt, &p.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		portals = append(portals, p)
	}
	return portals, nil
}
