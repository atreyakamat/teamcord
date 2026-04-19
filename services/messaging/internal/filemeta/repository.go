package filemeta

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/teamcord/messaging/internal/db"
)

type Repository struct {
	DB       *db.Database
	PublicURL string
}

type attachmentInput struct {
	ID string `json:"id"`
}

type attachmentOutput struct {
	ID       string `json:"id"`
	URL      string `json:"url"`
	Filename string `json:"filename"`
	MimeType string `json:"mime_type"`
	Size     int64  `json:"size"`
	Width    *int   `json:"width,omitempty"`
	Height   *int   `json:"height,omitempty"`
}

func (r *Repository) LinkToMessage(ctx context.Context, messageID int64, channelID int64, workspaceID int64, uploaderID int64, raw json.RawMessage) (json.RawMessage, error) {
	if len(raw) == 0 {
		return json.RawMessage(`[]`), nil
	}

	var inputs []attachmentInput
	if err := json.Unmarshal(raw, &inputs); err != nil {
		return nil, err
	}
	if len(inputs) == 0 {
		return json.RawMessage(`[]`), nil
	}

	ids := make([]string, 0, len(inputs))
	seen := make(map[string]bool, len(inputs))
	for _, input := range inputs {
		id := strings.TrimSpace(input.ID)
		if id == "" {
			return raw, nil
		}
		if seen[id] {
			continue
		}
		seen[id] = true
		ids = append(ids, id)
	}

	if len(ids) == 0 {
		return raw, nil
	}

	if _, err := r.DB.Pool.Exec(ctx, `
		UPDATE files
		SET
			channel_id = $1,
			message_id = $2,
			workspace_id = COALESCE(workspace_id, $3),
			uploader_id = COALESCE(uploader_id, $4)
		WHERE id::text = ANY($5::text[])
	`, channelID, messageID, workspaceID, uploaderID, ids); err != nil {
		return nil, err
	}

	rows, err := r.DB.Pool.Query(ctx, `
		SELECT id::text, filename, mimetype, size_bytes, width, height
		FROM files
		WHERE id::text = ANY($1::text[])
	`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byID := make(map[string]attachmentOutput, len(ids))
	for rows.Next() {
		var output attachmentOutput
		if err := rows.Scan(&output.ID, &output.Filename, &output.MimeType, &output.Size, &output.Width, &output.Height); err != nil {
			return nil, err
		}
		output.URL = fmt.Sprintf("%s/f/%s", strings.TrimRight(r.PublicURL, "/"), output.ID)
		if strings.TrimSpace(r.PublicURL) == "" {
			output.URL = fmt.Sprintf("/f/%s", output.ID)
		}
		byID[output.ID] = output
	}

	outputs := make([]attachmentOutput, 0, len(ids))
	for _, id := range ids {
		output, ok := byID[id]
		if !ok {
			return nil, fmt.Errorf("attachment %s does not exist", id)
		}
		outputs = append(outputs, output)
	}

	encoded, err := json.Marshal(outputs)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(encoded), nil
}
