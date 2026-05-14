-- Migration 0013: contact_phone on locations
--
-- locations already has contact_name + contact_email, but no phone.
-- The admin asked for a place to capture group leaders' email AND
-- cell numbers privately — accessible inside /admin/groups but never
-- exposed on the public locator API.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs drizzle/0013_location_contact_phone.sql

ALTER TABLE "locations"
  ADD COLUMN IF NOT EXISTS "contact_phone" text DEFAULT '';
