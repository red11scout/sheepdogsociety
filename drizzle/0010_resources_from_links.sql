-- Migration 0010: link-based resources for Sermon Studies + Book Studies
--
-- The original resources flow assumed file uploads (.docx → mammoth HTML,
-- PDFs as downloads). Sermon and Book sections need URL-based resources
-- with rich metadata (YouTube embed, Amazon book covers, OG cards). This
-- migration adds the columns the new "Add from link" composer fills.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs drizzle/0010_resources_from_links.sql

ALTER TABLE "resources"
  -- Source provider that the row came from. Drives the public render.
  --   youtube | amazon | web | file
  ADD COLUMN IF NOT EXISTS "provider"           text,
  -- For embeddable providers (YouTube, Vimeo): the iframe HTML the public
  -- detail page can drop into the page. Server-trusted.
  ADD COLUMN IF NOT EXISTS "embed_html"         text,
  -- Display image: YouTube thumbnail, Amazon book cover, OG og:image.
  ADD COLUMN IF NOT EXISTS "thumbnail_url"      text,
  -- For YouTube: channel name. For Amazon books: author.
  ADD COLUMN IF NOT EXISTS "author"             text,
  -- For YouTube: parsed length in seconds. NULL for non-video.
  ADD COLUMN IF NOT EXISTS "duration_seconds"   integer,
  -- Admin-only annotations the public never sees. Free text.
  ADD COLUMN IF NOT EXISTS "admin_notes"        text DEFAULT '',
  -- For Book Studies: the book itself is the primary `url`. The companion
  -- (study guide) gets these three fields. The companion can be a URL, a
  -- file in Vercel Blob, or both. Label is what the admin called it.
  ADD COLUMN IF NOT EXISTS "companion_url"      text,
  ADD COLUMN IF NOT EXISTS "companion_file_key" text,
  ADD COLUMN IF NOT EXISTS "companion_label"    text;

-- Backfill provider for existing rows so the public render can branch.
-- Old rows with a fileKey set are 'file'; everything else is 'web'.
UPDATE "resources"
   SET "provider" = CASE
         WHEN "file_key" IS NOT NULL AND "file_key" != '' THEN 'file'
         WHEN "url" IS NOT NULL AND "url" != '' THEN 'web'
         ELSE 'file'
       END
 WHERE "provider" IS NULL;

CREATE INDEX IF NOT EXISTS "resources_provider_idx" ON "resources" ("provider");
