import { bigint, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./schema";

// Single row (letter_autopilot precedent). draft/published hold StudioConfig
// (src/lib/studio/config.ts). Empty object = DEFAULT_CONFIG semantics.
export const siteStudio = pgTable("site_studio", {
  id: serial("id").primaryKey(),
  draft: jsonb("draft").notNull().default({}),
  published: jsonb("published").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
});

// Snapshot arithmetic: newest row == current published state. ALL ordering
// and pruning key on id (identity), never created_at (same-transaction ties).
export const studioVersions = pgTable("studio_versions", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  snapshot: jsonb("snapshot").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
});
