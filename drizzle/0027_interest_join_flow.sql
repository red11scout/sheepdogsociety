-- Migration 0027: the /join "Join a group" path files a location_interest
-- (Group Interest inbox) instead of writing members directly.
--
-- - location_id becomes nullable: "no preference yet" interests have no
--   specific group.
-- - wants_newsletter: the weekly-letter checkbox carried into the member
--   row when the admin approves.
-- - created_member_id: set on approval so approving twice never creates a
--   duplicate member (same pattern as location_requests.created_group_id).
ALTER TABLE "location_interests" ALTER COLUMN "location_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "location_interests" ADD COLUMN IF NOT EXISTS "wants_newsletter" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "location_interests" ADD COLUMN IF NOT EXISTS "created_member_id" uuid;
