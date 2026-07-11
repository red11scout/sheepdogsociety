-- Migration 0019: Site text (Phase B — admin-editable copy foundation)
--
-- Curated editable copy for the homepage + About page (spec §B.1). The
-- key registry in src/lib/site-text/registry.ts is the source of truth
-- for which keys exist; this table stores overrides only. An empty or
-- whitespace-only value falls back to the shipped default at render time
-- (see src/lib/site-text/resolve.ts) — an admin clearing a textarea can
-- never blank the site.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs

CREATE TABLE IF NOT EXISTS "site_text" (
  "key" text PRIMARY KEY,
  "label" text NOT NULL,
  "group_name" text NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text REFERENCES "users"("id") ON DELETE SET NULL
);
