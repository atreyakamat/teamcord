-- 0003_add_file_meta_table.sql
CREATE TABLE IF NOT EXISTS file_meta (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    s3_bucket TEXT NOT NULL,
    user_id BIGINT NOT NULL,
    workspace_id BIGINT NOT NULL,
    channel_id BIGINT,
    message_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_meta_user_id ON file_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_file_meta_workspace_id ON file_meta(workspace_id);
CREATE INDEX IF NOT EXISTS idx_file_meta_message_id ON file_meta(message_id);
