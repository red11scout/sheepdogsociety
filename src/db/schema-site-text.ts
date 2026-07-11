import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./schema";

// ── Site text (Phase B) ── curated editable copy; registry in
// src/lib/site-text/registry.ts is the source of truth for which keys
// exist. DB stores overrides only; empty/whitespace value = use default.
export const siteText = pgTable("site_text", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  groupName: text("group_name").notNull(),
  value: text("value").notNull(),
  draftValue: text("draft_value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
});
