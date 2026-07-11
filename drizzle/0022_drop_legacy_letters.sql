-- Migration 0022: drop the legacy letters / letter_versions tables
--
-- These were the old parallel Letter CMS, removed from the ORM in PR #49
-- (chore/cleanup-p0-p2). The canonical system is weekly_encouragements.
-- Verified empty before dropping (letters: 0 rows, letter_versions: 0 rows),
-- so no data is lost. IF EXISTS keeps the apply script idempotent.
--
-- letter_versions has an FK to letters, so it goes first.
DROP TABLE IF EXISTS "letter_versions";--> statement-breakpoint
DROP TABLE IF EXISTS "letters";
