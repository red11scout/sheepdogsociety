-- Migration 0011: Past Events with photos + recap
--
-- Events live in `events` (forward-looking). After they happen, the admin
-- writes a recap and uploads photos. The public /events page splits into
-- Upcoming (default) and Past sections; Past renders a photo-heavy
-- gallery layout. Old events are still queryable from the cron-driven
-- "upcoming events" stat but excluded from the upcoming list once
-- is_past is set or end_time is in the past.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs drizzle/0011_past_events.sql

ALTER TABLE "events"
  -- Admin-controlled flag — overrides the time-based heuristic so a
  -- multi-day retreat doesn't flip to "past" mid-event.
  ADD COLUMN IF NOT EXISTS "is_past"   boolean NOT NULL DEFAULT false,
  -- Markdown-flavored recap. Plain prose, paragraph-separated.
  ADD COLUMN IF NOT EXISTS "recap"     text DEFAULT '',
  -- Photo gallery: array of { url, alt, caption? }. Stored on Vercel Blob.
  ADD COLUMN IF NOT EXISTS "photos"    jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Index for fast "past events" lookup
CREATE INDEX IF NOT EXISTS "events_is_past_idx" ON "events" ("is_past");

-- Backfill: anything whose end_time (or start_time if no end) is in the
-- past becomes is_past=true. Keeps existing data clean without admin
-- having to flip every old row by hand.
UPDATE "events"
   SET "is_past" = true
 WHERE "is_past" = false
   AND COALESCE("end_time", "start_time") < NOW();
