package workspace

import (
	"context"
	"time"

	"github.com/teamcord/messaging/internal/db"
)

type Workspace struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	IconURL   *string   `json:"icon_url,omitempty"`
	OwnerID   int64     `json:"owner_id"`
	Plan      string    `json:"plan"`
	CreatedAt time.Time `json:"created_at"`
}

type Repository struct {
	DB *db.Database
}

func (r *Repository) Create(ctx context.Context, w *Workspace) error {
	query := `
		INSERT INTO workspaces (name, slug, icon_url, owner_id, plan)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at`
	
	err := r.DB.Pool.QueryRow(ctx, query,
		w.Name, w.Slug, w.IconURL, w.OwnerID, w.Plan,
	).Scan(&w.ID, &w.CreatedAt)
	
	return err
}

func (r *Repository) Get(ctx context.Context, id int64) (*Workspace, error) {
	query := `SELECT id, name, slug, icon_url, owner_id, plan, created_at FROM workspaces WHERE id = $1`
	
	w := &Workspace{}
	err := r.DB.Pool.QueryRow(ctx, query, id).Scan(
		&w.ID, &w.Name, &w.Slug, &w.IconURL, &w.OwnerID, &w.Plan, &w.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return w, nil
}

func (r *Repository) ListByUser(ctx context.Context, userID int64) ([]*Workspace, error) {
	query := `
		SELECT w.id, w.name, w.slug, w.icon_url, w.owner_id, w.plan, w.created_at 
		FROM workspaces w
		JOIN workspace_members wm ON w.id = wm.workspace_id
		WHERE wm.user_id = $1`
	
	rows, err := r.DB.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []*Workspace
	for rows.Next() {
		w := &Workspace{}
		err := rows.Scan(
			&w.ID, &w.Name, &w.Slug, &w.IconURL, &w.OwnerID, &w.Plan, &w.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		workspaces = append(workspaces, w)
	}
	return workspaces, nil
}
