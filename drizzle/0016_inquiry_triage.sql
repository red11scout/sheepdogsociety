-- Migration 0016: inquiry triage columns
--
-- contact_submissions had isRead but no "handled" state — a submission
-- can be read and still sitting untouched. location_interests had NO
-- triage column at all: submissions from the public group-interest
-- form landed in the DB with zero admin visibility anywhere in the
-- codebase (a write-only black hole). This adds the minimum needed
-- for both to show up in an admin triage view.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs

ALTER TABLE "contact_submissions"
  ADD COLUMN IF NOT EXISTS "resolved_at" timestamp;

ALTER TABLE "location_interests"
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'new';

ALTER TABLE "location_interests"
  ADD COLUMN IF NOT EXISTS "responded_at" timestamp;
