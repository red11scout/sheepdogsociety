-- 0015: locations.slug — pretty public URLs for /groups/[slug].
-- Additive + re-run safe (the GH Action re-applies on push to main).
-- Backfill mirrors locationSlug() in src/lib/locations/slug.ts:
-- slugify(name + city), '-2'/'-3'... suffixes by creation order for
-- duplicates. Only NULL-slug rows are written, so re-runs never rename
-- a live URL.

ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "slug" text;

UPDATE "locations" AS l
SET "slug" = d.final_slug
FROM (
  SELECT id,
         CASE WHEN rn = 1 THEN base_slug
              ELSE base_slug || '-' || rn::text END AS final_slug
  FROM (
    SELECT id,
           base_slug,
           row_number() OVER (PARTITION BY base_slug ORDER BY created_at, id) AS rn
    FROM (
      SELECT id,
             created_at,
             COALESCE(
               NULLIF(
                 trim(both '-' from
                   regexp_replace(
                     lower(coalesce(name, '') || '-' || coalesce(city, '')),
                     '[^a-z0-9]+', '-', 'g')),
                 ''),
               'group') AS base_slug
      FROM "locations"
    ) s
  ) numbered
) d
WHERE l.id = d.id AND l."slug" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "locations_slug_unique"
  ON "locations" ("slug")
  WHERE "slug" IS NOT NULL;
