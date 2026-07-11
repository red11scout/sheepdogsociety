-- Migration 0018: Letter autopilot (spec §Phase C)
--
-- call_to_action: discrete CTA per letter (nullable-as-empty; wizard
-- letters simply leave it blank). origin: tags autopilot-generated series
-- so the kill switch can revert ONLY autopilot letters to draft.
-- letter_autopilot: single-row state — enabled flag, voice rotation,
-- last-run metadata. Ships with enabled=false; Jeremy flips it on.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs

ALTER TABLE "weekly_encouragements"
  ADD COLUMN IF NOT EXISTS "call_to_action" text DEFAULT '';

ALTER TABLE "letter_series"
  ADD COLUMN IF NOT EXISTS "origin" text NOT NULL DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS "letter_autopilot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "enabled" boolean NOT NULL DEFAULT false,
  "default_author_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "voice_rotation_index" integer NOT NULL DEFAULT 0,
  "last_run_at" timestamp,
  "last_block_theme" text DEFAULT '',
  "last_block_voice" text DEFAULT '',
  "last_block_letter_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
