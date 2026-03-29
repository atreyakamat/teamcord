-- TeamCord Database Initialization
-- Extensions for advanced features

-- Enable pg_trgm for full-text similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable uuid-ossp for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable pgvector for embeddings (semantic search)
-- Note: Requires pgvector extension installed in Postgres
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Custom Enums ────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'guest', 'client');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE channel_type AS ENUM ('text', 'voice', 'video', 'stage', 'forum', 'announcement', 'client-portal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'system', 'file', 'decision', 'thread_starter');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE workspace_plan AS ENUM ('community', 'plus', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE presence_status AS ENUM ('online', 'idle', 'dnd', 'offline');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE thread_status AS ENUM ('open', 'resolved', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
        'workspace_create', 'workspace_update', 'workspace_delete',
        'channel_create', 'channel_update', 'channel_delete',
        'member_join', 'member_leave', 'member_kick', 'member_ban', 'member_role_update',
        'message_delete', 'message_pin', 'message_unpin',
        'invite_create', 'invite_delete',
        'decision_create', 'decision_delete',
        'wiki_update'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
