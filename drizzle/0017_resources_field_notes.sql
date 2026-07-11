-- Migration 0017: resources field notes
--
-- AI-drafted, admin-approved "field notes" per resource: what it says,
-- key scripture references, how to use it in a study. Drafts never
-- render publicly; only status='approved' does. status='none' means
-- never generated (or source material insufficient). Spec §A-FN.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "field_notes_html" text DEFAULT '';

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "field_notes_status" text NOT NULL DEFAULT 'none';

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "field_notes_generated_at" timestamp;
