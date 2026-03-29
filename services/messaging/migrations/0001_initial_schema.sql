-- ─── Nexus Initial Schema ───────────────────────────────────────────────────

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- ─── Snowflake ID Generator ─────────────────────────────────────────────────
-- Custom snowflake-like ID generator (64-bit bigint)
-- 41 bits: timestamp (ms since epoch)
-- 10 bits: node ID
-- 12 bits: sequence
CREATE SEQUENCE IF NOT EXISTS global_snowflake_id_seq;

CREATE OR REPLACE FUNCTION next_snowflake_id() RETURNS bigint AS $$
DECLARE
    our_epoch bigint := 1704067200000; -- 2024-01-01 00:00:00 UTC
    seq_id bigint;
    now_millis bigint;
    -- node_id must be unique per instance, for now we use 1
    node_id bigint := 1;
    result bigint;
BEGIN
    SELECT nextval('global_snowflake_id_seq') % 4096 INTO seq_id;
    SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) INTO now_millis;
    result := (now_millis - our_epoch) << 22;
    result := result | (node_id << 12);
    result := result | seq_id;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ─── Core Tables ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id bigint PRIMARY KEY DEFAULT next_snowflake_id(),
    email text UNIQUE NOT NULL,
    username text NOT NULL,
    discriminator varchar(4) NOT NULL,
    avatar_url text,
    status text DEFAULT 'offline',
    custom_status text,
    keycloak_id uuid UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now(),
    last_seen_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
    id bigint PRIMARY KEY DEFAULT next_snowflake_id(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    icon_url text,
    owner_id bigint REFERENCES users(id),
    plan text DEFAULT 'community',
    settings jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id bigint REFERENCES workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text,
    position int NOT NULL,
    permissions bigint DEFAULT 0,
    is_everyone boolean DEFAULT false,
    mentionable boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id bigint REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    nickname text,
    roles uuid[], -- array of role IDs
    permissions_override jsonb DEFAULT '{}',
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS projects (
    id bigint PRIMARY KEY DEFAULT next_snowflake_id(),
    workspace_id bigint REFERENCES workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    icon text,
    created_by bigint REFERENCES users(id),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channels (
    id bigint PRIMARY KEY DEFAULT next_snowflake_id(),
    workspace_id bigint REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id bigint REFERENCES projects(id) ON DELETE SET NULL,
    name text NOT NULL,
    type text NOT NULL, -- text, voice, video, stage, forum
    topic text,
    position int NOT NULL,
    parent_id bigint, -- category ID
    permission_overwrites jsonb DEFAULT '[]',
    last_message_id bigint,
    rate_limit_per_user int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
    id bigint NOT NULL DEFAULT next_snowflake_id(),
    channel_id bigint NOT NULL,
    author_id bigint REFERENCES users(id),
    content text,
    type text DEFAULT 'default',
    attachments jsonb DEFAULT '[]',
    embeds jsonb DEFAULT '[]',
    mentions bigint[] DEFAULT '{}',
    mention_roles uuid[] DEFAULT '{}',
    reference_id bigint, -- thread parent or reply
    edited_at timestamptz,
    deleted_at timestamptz,
    pinned boolean DEFAULT false,
    flags int DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL
) PARTITION BY RANGE (created_at);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('messages', 'created_at', chunk_time_interval => INTERVAL '7 days');

CREATE TABLE IF NOT EXISTS threads (
    id bigint PRIMARY KEY DEFAULT next_snowflake_id(),
    channel_id bigint REFERENCES channels(id) ON DELETE CASCADE,
    name text NOT NULL,
    creator_id bigint REFERENCES users(id),
    type text NOT NULL, -- public, private
    status text DEFAULT 'open', -- open, resolved, archived
    parent_message_id bigint,
    message_count int DEFAULT 0,
    member_count int DEFAULT 0,
    last_activity_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reactions (
    message_id bigint NOT NULL,
    user_id bigint NOT NULL REFERENCES users(id),
    emoji_id bigint,
    emoji_name text NOT NULL,
    emoji_animated boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE (message_id, user_id, emoji_name)
);

CREATE TABLE IF NOT EXISTS voice_states (
    user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    workspace_id bigint REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id bigint REFERENCES channels(id) ON DELETE SET NULL,
    session_id text UNIQUE,
    self_mute boolean DEFAULT false,
    self_deaf boolean DEFAULT false,
    self_video boolean DEFAULT false,
    self_stream boolean DEFAULT false,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decisions (
    id bigint PRIMARY KEY DEFAULT next_snowflake_id(),
    workspace_id bigint REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id bigint REFERENCES channels(id),
    thread_id bigint REFERENCES threads(id),
    title text NOT NULL,
    summary text NOT NULL,
    decided_by bigint[] DEFAULT '{}',
    alternatives_considered text[] DEFAULT '{}',
    outcome text,
    tags text[] DEFAULT '{}',
    created_by bigint REFERENCES users(id),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wiki_pages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id bigint REFERENCES channels(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    version int DEFAULT 1,
    created_by bigint REFERENCES users(id),
    updated_by bigint REFERENCES users(id),
    updated_at timestamptz DEFAULT now(),
    is_auto_generated boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS files (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id bigint REFERENCES workspaces(id) ON DELETE CASCADE,
    uploader_id bigint REFERENCES users(id),
    filename text NOT NULL,
    mimetype text NOT NULL,
    size_bytes bigint NOT NULL,
    storage_key text NOT NULL,
    channel_id bigint REFERENCES channels(id),
    message_id bigint,
    width int,
    height int,
    uploaded_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invites (
    id varchar(8) PRIMARY KEY, -- short code
    workspace_id bigint REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id bigint REFERENCES channels(id) ON DELETE CASCADE,
    creator_id bigint REFERENCES users(id),
    max_uses int,
    uses int DEFAULT 0,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id bigint PRIMARY KEY DEFAULT next_snowflake_id(),
    workspace_id bigint REFERENCES workspaces(id) ON DELETE CASCADE,
    action_type text NOT NULL,
    target_id bigint,
    actor_id bigint REFERENCES users(id),
    changes jsonb DEFAULT '{}',
    reason text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_embeddings (
    message_id bigint PRIMARY KEY,
    embedding vector(768),
    model_name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_messages_channel_id_id ON messages (channel_id, id DESC);
CREATE INDEX idx_messages_author_id_created_at ON messages (author_id, created_at DESC);
CREATE INDEX idx_messages_reference_id ON messages (reference_id) WHERE reference_id IS NOT NULL;

CREATE INDEX idx_voice_states_channel_id ON voice_states (channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX idx_threads_channel_id_status ON threads (channel_id, status);
CREATE INDEX idx_decisions_workspace_id_created_at ON decisions (workspace_id, created_at DESC);

-- ─── RLS Policies (Basic implementation) ────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_read_policy ON users FOR SELECT USING (true);
CREATE POLICY user_update_policy ON users FOR UPDATE USING (id = (current_setting('app.current_user_id')::bigint));

-- TODO: Add comprehensive RLS policies based on workspace membership and permissions
