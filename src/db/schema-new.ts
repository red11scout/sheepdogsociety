// Additive schema for Weekly Encouragements + Resource Sections.
// Imported by code that needs these tables. Migration in
// drizzle/0002_encouragements_resources.sql is applied via
// scripts/apply-neon-migration.mjs.

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./schema";

// ============================================================
// Weekly Encouragements — structured newsletter content type
// ============================================================
export const weeklyEncouragements = pgTable(
  "weekly_encouragements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueNumber: integer("issue_number").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    publishDate: date("publish_date"),
    status: text("status").notNull().default("draft"),
    intro: text("intro").default(""),
    updates: text("updates").default(""),
    scriptures: jsonb("scriptures").default([]).notNull(),
    guidance: text("guidance").default(""),
    notes: text("notes").default(""),
    coverImageUrl: text("cover_image_url").default(""),
    coverImageAlt: text("cover_image_alt").default(""),
    theme: text("theme").default(""),
    voice: text("voice").default(""),
    seriesId: uuid("series_id"),
    seriesPosition: integer("series_position"),
    scheduledFor: timestamp("scheduled_for"),
    broadcastId: text("broadcast_id"),
    broadcastAt: timestamp("broadcast_at"),
    authorId: text("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("we_slug_unique").on(table.slug),
    index("we_status_idx").on(table.status),
    index("we_publish_date_idx").on(table.publishDate),
  ]
);

export type WeeklyEncouragement = typeof weeklyEncouragements.$inferSelect;
export type WeeklyEncouragementInsert = typeof weeklyEncouragements.$inferInsert;

// Scriptures is jsonb: array of { ref: string, note?: string, text?: string }
export interface ScriptureRef {
  ref: string;
  note?: string;
  text?: string;
}

// ============================================================
// Resource Sections — structured categories for Resources
// ============================================================
export const resourceSections = pgTable(
  "resource_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").default(""),
    icon: text("icon").default("scroll"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [uniqueIndex("rs_slug_unique").on(table.slug)]
);

export type ResourceSection = typeof resourceSections.$inferSelect;
export type ResourceSectionInsert = typeof resourceSections.$inferInsert;

// ============================================================
// Letter Series — a themed batch of weekly encouragements published
// on a recurring cadence. Created by the admin via the "Schedule a
// series" composer; the cron at /api/cron/publish-scheduled-letters
// publishes each letter when its scheduled_for window arrives.
// ============================================================
export const letterSeries = pgTable(
  "letter_series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    theme: text("theme").notNull(),
    voice: text("voice").default(""),
    totalCount: integer("total_count").notNull(),
    cadence: text("cadence").notNull().default("weekly"), // weekly | biweekly | monthly | custom
    startDate: date("start_date").notNull(),
    publishHour: integer("publish_hour").notNull().default(6),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("letter_series_created_idx").on(table.createdAt)]
);

export type LetterSeries = typeof letterSeries.$inferSelect;
export type LetterSeriesInsert = typeof letterSeries.$inferInsert;

// Relations
export const weeklyEncouragementsRelations = relations(
  weeklyEncouragements,
  ({ one }) => ({
    author: one(users, {
      fields: [weeklyEncouragements.authorId],
      references: [users.id],
    }),
  })
);

export const letterSeriesRelations = relations(letterSeries, ({ one }) => ({
  creator: one(users, {
    fields: [letterSeries.createdBy],
    references: [users.id],
  }),
}));
