-- Migration 0026: link a plant request to the member row that filed it.
--
-- The /join signup's "Start a group" path now files a location_request
-- alongside the members row; approval creates the group AND promotes that
-- member to its leader. member_id makes the link explicit instead of
-- relying on email matching (kept as fallback for tab-II plant requests).
ALTER TABLE "location_requests" ADD COLUMN IF NOT EXISTS "member_id" uuid;
