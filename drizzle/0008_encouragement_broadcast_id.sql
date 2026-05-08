-- Migration 0008: track Resend broadcast id on weekly_encouragements
-- so publishing twice doesn't double-send the email blast.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs drizzle/0008_encouragement_broadcast_id.sql

ALTER TABLE "weekly_encouragements"
  ADD COLUMN IF NOT EXISTS "broadcast_id" text;

ALTER TABLE "weekly_encouragements"
  ADD COLUMN IF NOT EXISTS "broadcast_at" timestamp;
