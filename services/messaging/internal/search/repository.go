package search

import (
	"context"
	"fmt"
	"strconv"

	"github.com/meilisearch/meilisearch-go"
	"github.com/teamcord/messaging/internal/message"
)

type Repository struct {
	client *meilisearch.Client
}

func NewRepository(url, apiKey string) *Repository {
	client := meilisearch.NewClient(meilisearch.ClientConfig{
		Host:   url,
		APIKey: apiKey,
	})
	
	// Ensure index exists and is configured
	index := client.Index("messages")
	index.UpdateSearchableAttributes(&[]string{"content"})
	index.UpdateFilterableAttributes(&[]string{"channel_id", "author_id", "workspace_id"})
	index.UpdateSortableAttributes(&[]string{"created_at"})
	
	return &Repository{client: client}
}

func (r *Repository) IndexMessage(ctx context.Context, m *message.Message, workspaceID int64) error {
	doc := map[string]interface{}{
		"id":           strconv.FormatInt(m.ID, 10),
		"channel_id":   strconv.FormatInt(m.ChannelID, 10),
		"author_id":    strconv.FormatInt(m.AuthorID, 10),
		"workspace_id": strconv.FormatInt(workspaceID, 10),
		"content":      m.Content,
		"created_at":   m.CreatedAt.Unix(),
	}
	
	_, err := r.client.Index("messages").AddDocuments(doc)
	return err
}

func (r *Repository) Search(ctx context.Context, workspaceID int64, q string, filters string) (interface{}, error) {
	searchRes, err := r.client.Index("messages").Search(q, &meilisearch.SearchRequest{
		Filter: fmt.Sprintf("workspace_id = %d %s", workspaceID, filters),
		Limit:  50,
	})
	if err != nil {
		return nil, err
	}
	return searchRes, nil
}
