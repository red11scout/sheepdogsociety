-- Migration 0005: Add theme + voice columns to weekly_encouragements
-- Apply via: NEON_DATABASE_URL='...' node scripts/apply-neon-migration.mjs drizzle/0005_encouragement_theme_voice.sql
-- Both columns default to '' so existing rows render fine without code changes.

ALTER TABLE "weekly_encouragements"
  ADD COLUMN IF NOT EXISTS "theme" text DEFAULT '';

ALTER TABLE "weekly_encouragements"
  ADD COLUMN IF NOT EXISTS "voice" text DEFAULT '';
