-- Migration 0002: Weekly Encouragements + Resource Sections
-- Apply via: NEON_DATABASE_URL='...' node scripts/apply-neon-migration.mjs

CREATE TABLE IF NOT EXISTS "weekly_encouragements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "issue_number" integer NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "publish_date" date,
  "status" text NOT NULL DEFAULT 'draft',
  "intro" text DEFAULT '',
  "updates" text DEFAULT '',
  "scriptures" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "guidance" text DEFAULT '',
  "notes" text DEFAULT '',
  "cover_image_url" text DEFAULT '',
  "cover_image_alt" text DEFAULT '',
  "author_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW(),
  "deleted_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "we_slug_unique" ON "weekly_encouragements" ("slug");
CREATE INDEX IF NOT EXISTS "we_status_idx" ON "weekly_encouragements" ("status");
CREATE INDEX IF NOT EXISTS "we_publish_date_idx" ON "weekly_encouragements" ("publish_date");

CREATE TABLE IF NOT EXISTS "resource_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text DEFAULT '',
  "icon" text DEFAULT 'scroll',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "deleted_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "rs_slug_unique" ON "resource_sections" ("slug");

-- Seed common sections so admins start with a sensible structure
INSERT INTO "resource_sections" ("name", "slug", "description", "icon", "sort_order")
VALUES
  ('Bible Studies', 'bible-studies', 'Multi-week studies and study guides for groups.', 'scroll', 10),
  ('Leader Guides', 'leader-guides', 'Practical guides for men leading their groups.', 'shield', 20),
  ('Workout Plans', 'workout-plans', 'Train the body alongside the spirit.', 'anchor', 30),
  ('Sermons', 'sermons', 'Audio and notes from teaching.', 'lamp', 40),
  ('Devotional Series', 'devotional-series', 'Daily and weekly devotionals.', 'flame', 50)
ON CONFLICT ("slug") DO NOTHING;
