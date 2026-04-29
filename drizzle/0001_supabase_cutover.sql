-- Cutover migration: applies the brief's schema additions to the existing
-- Supabase database (which already has the 30 community tables). Idempotent —
-- safe to re-run. Uses ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
-- and DO blocks for ENUM creation.

-- ============================================================
-- New ENUM types
-- ============================================================

DO $$ BEGIN CREATE TYPE letter_status AS ENUM ('draft', 'scheduled', 'published', 'archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE ai_generation_type AS ENUM ('draft', 'improve', 'pullquote', 'publish_meta', 'alt_text', 'image'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- New columns on existing users table (Auth.js adapter requirements)
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TIMESTAMP;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;

-- ============================================================
-- Auth.js v5 adapter tables
-- ============================================================

CREATE TABLE IF NOT EXISTS accounts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_account_unique ON accounts (provider, provider_account_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS accounts_user_idx ON accounts (user_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS sessions (
  session_token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS verification_tokens_identifier_token_unique ON verification_tokens (identifier, token);

-- ============================================================
-- Letters + version snapshots
-- ============================================================

CREATE TABLE IF NOT EXISTS letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  theme_word TEXT,
  cover_image_url TEXT,
  body JSONB NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  excerpt TEXT DEFAULT '',
  author_id TEXT NOT NULL REFERENCES users(id),
  status letter_status NOT NULL DEFAULT 'draft',
  tags JSONB NOT NULL DEFAULT '[]',
  email_subject TEXT,
  email_preview_text TEXT,
  meta_description TEXT,
  social_copy TEXT,
  broadcast_id TEXT,
  published_at TIMESTAMP,
  scheduled_for TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS letters_slug_active_unique ON letters (slug) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS letters_issue_active_unique ON letters (issue_number) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS letters_status_published_idx ON letters (status, published_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS letters_author_idx ON letters (author_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS letter_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body JSONB NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  edited_by_id TEXT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS letter_versions_unique ON letter_versions (letter_id, version_number);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS letter_versions_letter_idx ON letter_versions (letter_id);

-- ============================================================
-- Group leaders (separate from member identity)
-- ============================================================

CREATE TABLE IF NOT EXISTS group_leaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  bio TEXT DEFAULT '',
  photo_url TEXT,
  user_id TEXT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS group_leaders_user_idx ON group_leaders (user_id);

-- ============================================================
-- AI generations log + audit log
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type ai_generation_type NOT NULL,
  prompt TEXT NOT NULL,
  prompt_version TEXT,
  model TEXT NOT NULL,
  output TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_cents INTEGER,
  entity_type TEXT,
  entity_id TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ai_generations_user_created_idx ON ai_generations (user_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_generations_entity_idx ON ai_generations (entity_type, entity_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before JSONB,
  after JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_log (entity_type, entity_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_user_idx ON audit_log (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_log (created_at);

-- ============================================================
-- Group inquiries (public "I'm interested" form)
-- ============================================================

CREATE TABLE IF NOT EXISTS group_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  inquirer_name TEXT NOT NULL,
  inquirer_email TEXT NOT NULL,
  inquirer_phone TEXT,
  message TEXT,
  leader_responded_at TIMESTAMP,
  followup_sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS group_inquiries_location_idx ON group_inquiries (location_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS group_inquiries_followup_idx ON group_inquiries (followup_sent_at);
