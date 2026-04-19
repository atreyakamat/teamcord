-- 0003_add_file_meta_table.sql
CREATE TABLE IF NOT EXISTS file_meta (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    size BIGINT NOT NULL CHECK (size >= 0),
    mime_type TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    s3_bucket TEXT NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id BIGINT REFERENCES channels(id) ON DELETE SET NULL,
    message_id BIGINT REFERENCES messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_meta_user_id ON file_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_file_meta_workspace_id ON file_meta(workspace_id);
CREATE INDEX IF NOT EXISTS idx_file_meta_message_id ON file_meta(message_id);
CREATE INDEX IF NOT EXISTS idx_file_meta_channel_id ON file_meta(channel_id);
CREATE INDEX IF NOT EXISTS idx_file_meta_workspace_message_id ON file_meta(workspace_id, message_id);
