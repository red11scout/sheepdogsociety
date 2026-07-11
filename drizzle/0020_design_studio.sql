-- Migration 0020: Design Studio (draft/publish site config + version history)
--
-- site_text.draft_value: draft-vs-published split for site text edits, mirroring
-- the Studio's draft/published model (spec DS-1). site_studio: single-row
-- draft/published StudioConfig (letter_autopilot precedent). studio_versions:
-- append-only snapshot history; ordering/pruning key on id (bigint identity),
-- never created_at, to avoid same-transaction ties.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs

ALTER TABLE "site_text" ADD COLUMN IF NOT EXISTS "draft_value" text;

CREATE TABLE IF NOT EXISTS "site_studio" (
  "id" serial PRIMARY KEY,
  "draft" jsonb NOT NULL DEFAULT '{}',
  "published" jsonb NOT NULL DEFAULT '{}',
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "studio_versions" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "snapshot" jsonb NOT NULL,
  "summary" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL
);
