-- Migration 0006: Resources overhaul — bulk upload, AI categorization, FTS, slugs.
-- Apply via: NEON_DATABASE_URL='...' node scripts/apply-neon-migration.mjs drizzle/0006_resources_overhaul.sql
-- Additive. Existing rows backfill safely.

-- New columns on resources
ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "section_id"          uuid REFERENCES "resource_sections"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "slug"                text,
  ADD COLUMN IF NOT EXISTS "body_html"           text DEFAULT '',
  ADD COLUMN IF NOT EXISTS "body_text"           text DEFAULT '',
  ADD COLUMN IF NOT EXISTS "summary"             text DEFAULT '',
  ADD COLUMN IF NOT EXISTS "topics"              jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "themes"              jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "books_of_bible"      jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "audience"            text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS "estimated_minutes"   integer,
  ADD COLUMN IF NOT EXISTS "source_filename"     text,
  ADD COLUMN IF NOT EXISTS "source_mime"         text,
  ADD COLUMN IF NOT EXISTS "ai_categorized_at"   timestamp,
  ADD COLUMN IF NOT EXISTS "deleted_at"          timestamp;

-- Backfill slug for legacy rows so the unique index can land cleanly
UPDATE "resources"
   SET "slug" = lower(regexp_replace(coalesce(title, 'untitled'), '[^A-Za-z0-9]+', '-', 'g'))
                || '-' || substring(id::text, 1, 8)
 WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "resources" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "resources_slug_unique"
  ON "resources" ("slug")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "resources_section_idx"
  ON "resources" ("section_id");

CREATE INDEX IF NOT EXISTS "resources_public_idx"
  ON "resources" ("is_public")
  WHERE "deleted_at" IS NULL;

-- Postgres FTS via a generated tsvector column — title weighted A,
-- summary + tags weighted B, body weighted C.
ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "search" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english',
      coalesce(summary, '') || ' ' ||
      coalesce(topics::text, '') || ' ' ||
      coalesce(themes::text, '') || ' ' ||
      coalesce(books_of_bible::text, '')
    ), 'B') ||
    setweight(to_tsvector('english', coalesce(body_text, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS "resources_search_idx"
  ON "resources" USING gin("search");

-- Seed an extra default section so admins start with a richer structure.
-- Existing seeds (from migration 0002): Bible Studies, Leader Guides, Workout Plans, Sermons, Devotional Series.
-- Adding: Book Studies, Sermon Studies, Leadership.
INSERT INTO "resource_sections" ("name", "slug", "description", "icon", "sort_order")
VALUES
  ('Book Studies',     'book-studies',     'Studies built around a single Christian book.',         'scroll', 15),
  ('Sermon Studies',   'sermon-studies',   'Group-discussion guides built off a sermon series.',     'lamp',   25),
  ('Leadership',       'leadership',       'Guides for the men leading other men.',                  'shield', 22)
ON CONFLICT ("slug") DO NOTHING;
