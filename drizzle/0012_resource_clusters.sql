-- Migration 0012: AI-clustered sub-groups within resource sections
--
-- A `Section` like "Bible Studies" can hold 50+ resources. Showing them as
-- one giant grid is overwhelming and unbrowsable. This migration adds an
-- AI-assigned `cluster` label per row — a short, human-readable bucket
-- (e.g. "Marriage & Family", "Trust & Surrender", "Identity & Calling").
-- The public /resources browser groups rows under their cluster heading
-- within each section, so a man scanning Bible Studies sees a navigable
-- mini-table-of-contents instead of a wall of cards.
--
-- The cluster value is set by the new clusterSection() server action,
-- which sends all titles + summaries to Claude for a single bulk
-- assignment. Admins can re-run it from the admin section toolbar
-- whenever new resources land.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs drizzle/0012_resource_clusters.sql

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "cluster" text DEFAULT '';

-- Index keeps section + cluster lookups fast (the public browser groups
-- by cluster within a section).
CREATE INDEX IF NOT EXISTS "resources_section_cluster_idx"
  ON "resources" ("section_id", "cluster");
