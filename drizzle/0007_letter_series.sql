-- Migration 0007: Letter series + scheduling
-- Apply via the GitHub Action or manually:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs drizzle/0007_letter_series.sql
-- Additive. Existing rows backfill safely.

CREATE TABLE IF NOT EXISTS "letter_series" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"          text NOT NULL,
  "theme"          text NOT NULL,
  "voice"          text DEFAULT '',
  "total_count"    integer NOT NULL,
  "cadence"        text NOT NULL DEFAULT 'weekly', -- weekly | biweekly | monthly | custom
  "start_date"     date NOT NULL,
  "publish_hour"   integer NOT NULL DEFAULT 6,     -- local America/Chicago hour to publish
  "created_by"     text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"     timestamp NOT NULL DEFAULT NOW(),
  "deleted_at"     timestamp
);

CREATE INDEX IF NOT EXISTS "letter_series_created_idx"
  ON "letter_series" ("created_at" DESC);

-- Add scheduling fields to weekly_encouragements
ALTER TABLE "weekly_encouragements"
  ADD COLUMN IF NOT EXISTS "series_id"        uuid REFERENCES "letter_series"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "series_position"  integer,
  ADD COLUMN IF NOT EXISTS "scheduled_for"    timestamp;

-- For the cron's "what's due to publish?" query
CREATE INDEX IF NOT EXISTS "we_scheduled_for_idx"
  ON "weekly_encouragements" ("scheduled_for")
  WHERE "status" = 'scheduled' AND "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "we_series_idx"
  ON "weekly_encouragements" ("series_id", "series_position");
