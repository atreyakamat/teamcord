package decision

import (
	"context"
	"time"

	"github.com/nexus/messaging/internal/db"
)

type Decision struct {
	ID                    int64     `json:"id"`
	WorkspaceID           int64     `json:"workspace_id"`
	ChannelID             *int64    `json:"channel_id,omitempty"`
	ThreadID              *int64    `json:"thread_id,omitempty"`
	Title                 string    `json:"title"`
	Summary               string    `json:"summary"`
	DecidedBy             []int64   `json:"decided_by"`
	AlternativesConsidered []string  `json:"alternatives_considered"`
	Outcome               string    `json:"outcome"`
	Tags                  []string  `json:"tags"`
	CreatedBy             int64     `json:"created_by"`
	CreatedAt             time.Time `json:"created_at"`
}

type Repository struct {
	DB *db.Database
}

func (r *Repository) Create(ctx context.Context, d *Decision) error {
	query := `
		INSERT INTO decisions (workspace_id, channel_id, thread_id, title, summary, decided_by, alternatives_considered, outcome, tags, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at`
	
	err := r.DB.Pool.QueryRow(ctx, query,
		d.WorkspaceID, d.ChannelID, d.ThreadID, d.Title, d.Summary, d.DecidedBy, d.AlternativesConsidered, d.Outcome, d.Tags, d.CreatedBy,
	).Scan(&d.ID, &d.CreatedAt)
	
	return err
}

func (r *Repository) ListByWorkspace(ctx context.Context, workspaceID int64) ([]*Decision, error) {
	query := `
		SELECT id, workspace_id, channel_id, thread_id, title, summary, decided_by, alternatives_considered, outcome, tags, created_by, created_at
		FROM decisions
		WHERE workspace_id = $1
		ORDER BY created_at DESC`
	
	rows, err := r.DB.Pool.Query(ctx, query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var decisions []*Decision
	for rows.Next() {
		d := &Decision{}
		err := rows.Scan(
			&d.ID, &d.WorkspaceID, &d.ChannelID, &d.ThreadID, &d.Title, &d.Summary, &d.DecidedBy, &d.AlternativesConsidered, &d.Outcome, &d.Tags, &d.CreatedBy, &d.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		decisions = append(decisions, d)
	}
	return decisions, nil
}
