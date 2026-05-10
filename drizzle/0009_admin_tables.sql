-- Migration 0009: rich admin tables for Members + Groups/Locations
-- Adds the columns the admin tables surface (approval status, active flag,
-- structured names, role, signal account, location type, on-map toggle)
-- without touching the legacy `name` field on members so the public
-- signup flow keeps working.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs drizzle/0009_admin_tables.sql

-- ============================================================
-- members: add structured fields + approval/active separated from CRM lifecycle
-- ============================================================
ALTER TABLE "members"
  ADD COLUMN IF NOT EXISTS "approval_status" text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "is_active"       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "role"            text NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS "first_name"      text,
  ADD COLUMN IF NOT EXISTS "last_name"       text,
  ADD COLUMN IF NOT EXISTS "nickname"        text,
  ADD COLUMN IF NOT EXISTS "signal_account"  text,
  ADD COLUMN IF NOT EXISTS "location_id"     uuid;

-- Backfill first_name / last_name from the legacy single-field `name`.
-- Treat the first whitespace-delimited token as first name; the rest as last.
-- Skip rows that already have first_name set so re-runs are safe.
UPDATE "members"
   SET "first_name" = COALESCE(NULLIF(split_part("name", ' ', 1), ''), "name"),
       "last_name"  = NULLIF(
                        substring("name" FROM (position(' ' IN "name") + 1)),
                        ''
                      )
 WHERE "first_name" IS NULL
   AND "name" IS NOT NULL;

-- Map the existing CRM `status` enum onto approval_status defaults.
UPDATE "members"
   SET "approval_status" = CASE
         WHEN "status" IN ('connected') THEN 'approved'
         WHEN "status" IN ('not_a_fit') THEN 'rejected'
         ELSE 'pending'
       END
 WHERE "approval_status" = 'pending';

-- Soft-deactivate archived/not-a-fit rows.
UPDATE "members"
   SET "is_active" = false
 WHERE "status" IN ('not_a_fit', 'archived');

CREATE INDEX IF NOT EXISTS "members_approval_idx"  ON "members" ("approval_status");
CREATE INDEX IF NOT EXISTS "members_active_idx"    ON "members" ("is_active");
CREATE INDEX IF NOT EXISTS "members_location_idx"  ON "members" ("location_id");

-- ============================================================
-- locations: add UI-explicit fields the admin table surfaces
-- ============================================================
ALTER TABLE "locations"
  ADD COLUMN IF NOT EXISTS "is_active"             boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "displayed_on_map"      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "location_type"         text DEFAULT 'in_person',
  ADD COLUMN IF NOT EXISTS "special_instructions"  text DEFAULT '';

-- Default existing rows to "displayed on map = (status == 'active')"
-- so the admin doesn't have to re-toggle every existing row to keep
-- the public locator looking the same. The legacy status enum is
-- (pending | active | inactive); 'active' is the equivalent of 'approved
-- and visible' under the new scheme.
UPDATE "locations"
   SET "displayed_on_map" = CASE WHEN "status" = 'active' THEN true ELSE false END;

CREATE INDEX IF NOT EXISTS "locations_displayed_idx" ON "locations" ("displayed_on_map");
CREATE INDEX IF NOT EXISTS "locations_active_idx"    ON "locations" ("is_active");
