-- Migration 0014: Recurring gathering series
--
-- `event_series` stores the pattern (every Tuesday, 6:00 AM Chicago).
-- The materializer inserts real `events` rows 8 weeks ahead so photos
-- and recaps stay attached to specific dates. `is_cancelled` rows are
-- tombstones: ON CONFLICT (series_id, start_time) DO NOTHING keeps the
-- cron from resurrecting a cancelled date.
--
-- Additive and re-run safe (the GH Action re-applies every file).
-- Apply: DATABASE_URL='...' node scripts/apply-neon-migration.mjs

CREATE TABLE IF NOT EXISTS "event_series" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text DEFAULT '',
  "location" text DEFAULT '',
  "cadence" text NOT NULL,
  "day_of_week" integer NOT NULL,
  "nth_week" integer,
  "start_time_of_day" text NOT NULL,
  "duration_minutes" integer,
  "timezone" text NOT NULL DEFAULT 'America/New_York',
  "start_date" text NOT NULL,
  "event_type" text DEFAULT 'weekly',
  "image_url" text DEFAULT '',
  "registration_url" text DEFAULT '',
  "group_id" uuid REFERENCES "groups"("id"),
  "active" boolean NOT NULL DEFAULT true,
  "created_by" text NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "deleted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "event_series_active_idx" ON "event_series" ("active");

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "series_id" uuid REFERENCES "event_series"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "is_cancelled" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_detached" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "events_series_idx" ON "events" ("series_id");
CREATE UNIQUE INDEX IF NOT EXISTS "events_series_start_unique" ON "events" ("series_id", "start_time");

-- Timezone default correction: the ministry is in Rockmart GA (Eastern).
ALTER TABLE "event_series" ALTER COLUMN "timezone" SET DEFAULT 'America/New_York';
