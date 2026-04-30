import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  pgEnum,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./schema";

/**
 * Phase D — additive block-based pages schema. Three pages migrate to this
 * model in Phase D (`/`, `/about`, `/what-to-expect`); other public pages
 * stay hardcoded for now.
 *
 * `blocks` is a JSONB array validated against the zod discriminated union in
 * `src/lib/blocks.ts` on every save. Eight block types: hero, feature_grid,
 * testimonial, cta, rich_text, faq, stat_row, verse_callout.
 */

export const pageStatusEnum = pgEnum("page_status_v2", ["draft", "published"]);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    status: pageStatusEnum("status").notNull().default("draft"),
    /** zod-validated discriminated union; see src/lib/blocks.ts */
    blocks: jsonb("blocks").notNull().default([]),
    /** Per-page SEO. metaTitle, metaDescription, ogImageUrl. */
    seo: jsonb("seo").notNull().default({}),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("pages_slug_active_unique")
      .on(t.slug)
      .where(sql`${t.deletedAt} IS NULL`),
  ]
);

/** Version-history snapshots of `pages.blocks` so admins can revert. */
export const pageVersions = pgTable("page_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  blocks: jsonb("blocks").notNull(),
  seo: jsonb("seo").notNull(),
  savedBy: text("saved_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
