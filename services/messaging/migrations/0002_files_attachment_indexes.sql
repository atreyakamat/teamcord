-- ─── Files / Attachments Query Performance ──────────────────────────────────
-- Attachments are persisted in the existing `files` table and linked to messages.
-- These indexes support common lookups and listing patterns introduced by v1.0.

CREATE INDEX IF NOT EXISTS idx_files_workspace_uploaded_at
    ON files (workspace_id, uploaded_at DESC)
    WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_uploader_uploaded_at
    ON files (uploader_id, uploaded_at DESC)
    WHERE uploader_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_channel_uploaded_at
    ON files (channel_id, uploaded_at DESC)
    WHERE channel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_message_id
    ON files (message_id)
    WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_storage_key
    ON files (storage_key);
