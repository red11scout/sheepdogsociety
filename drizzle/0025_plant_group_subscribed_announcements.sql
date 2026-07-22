-- Migration 0025: plant-request full group fields, members.subscribed, announcements
--
-- 1. location_requests gains the fields the admin "add a group" form holds, so
--    a public plant request carries everything needed to auto-create the group
--    on approval. latitude/longitude are geocoded best-effort at submit time;
--    created_group_id / created_location_id are set on approval so approving
--    twice can never create a duplicate group.
-- 2. members.subscribed — the admin checkbox (default yes) controlling whether
--    the man is in the weekly-letter audience.
-- 3. announcements — send history for the /admin/announcements email section.
--
-- ADD COLUMN IF NOT EXISTS keeps this idempotent under the re-run-all apply
-- script (scripts/apply-neon-migration.mjs).

ALTER TABLE "location_requests" ADD COLUMN IF NOT EXISTS "proposed_group_name" text DEFAULT '';
--> statement-breakpoint
ALTER TABLE "location_requests" ADD COLUMN IF NOT EXISTS "address" text DEFAULT '';
--> statement-breakpoint
ALTER TABLE "location_requests" ADD COLUMN IF NOT EXISTS "zip_code" text DEFAULT '';
--> statement-breakpoint
ALTER TABLE "location_requests" ADD COLUMN IF NOT EXISTS "meeting_day" text DEFAULT '';
--> statement-breakpoint
ALTER TABLE "location_requests" ADD COLUMN IF NOT EXISTS "meeting_time" text DEFAULT '';
--> statement-breakpoint
ALTER TABLE "location_requests" ADD COLUMN IF NOT EXISTS "meeting_place" text DEFAULT '';
--> statement-breakpoint
ALTER TABLE "location_requests" ADD COLUMN IF NOT EXISTS "location_type" text DEFAULT 'in_person';
--> statement-breakpoint
ALTER TABLE "location_requests" ADD COLUMN IF NOT EXISTS "latitude" text DEFAULT '';
--> statement-breakpoint
ALTER TABLE "location_requests" ADD COLUMN IF NOT EXISTS "longitude" text DEFAULT '';
--> statement-breakpoint
ALTER TABLE "location_requests" ADD COLUMN IF NOT EXISTS "created_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "location_requests" ADD COLUMN IF NOT EXISTS "created_location_id" uuid;
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "subscribed" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "cta_label" text DEFAULT '',
  "cta_url" text DEFAULT '',
  "audience" text NOT NULL,
  "sent_by" text NOT NULL,
  "recipient_count" integer DEFAULT 0 NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
