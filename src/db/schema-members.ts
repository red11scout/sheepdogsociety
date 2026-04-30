import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { groups, users } from "./schema";

/**
 * Phase D — additive member-signup schema. Public visitors never log in.
 * Members live in DB rows so admins can assign them to groups and send
 * opt-in email/SMS updates.
 *
 * Three tables, no edits to existing schema.ts exports.
 */

// Why a man is signing up.
export const memberIntentEnum = pgEnum("member_intent", [
  "join",
  "start",
  "just_keep_posted",
]);

// Lifecycle status visible in /admin/members. Mirrors Brief #3's CRM workflow.
export const memberStatusEnum = pgEnum("member_status", [
  "new",
  "reviewed",
  "contacted",
  "connected",
  "needs_followup",
  "not_a_fit",
  "archived",
]);

// "When are you ready" — used when intent = 'start'.
export const memberTimelineEnum = pgEnum("member_timeline", [
  "now",
  "three_months",
  "exploring",
]);

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    intent: memberIntentEnum("intent").notNull(),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    timeline: memberTimelineEnum("timeline"),
    status: memberStatusEnum("status").notNull().default("new"),
    /** Public page they came from. Helps the admin understand source. */
    source: text("source"),
    /** Free-text note from the man. Shown in /admin/members. */
    note: text("note"),
    /** Admin-only notes captured later. Never shown to the member. */
    adminNote: text("admin_note"),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    // Email is unique among non-deleted rows. Soft-delete safe.
    uniqueIndex("members_email_active_unique")
      .on(t.email)
      .where(sql`${t.deletedAt} IS NULL`),
    index("members_status_idx").on(t.status),
    index("members_group_idx").on(t.groupId),
    index("members_created_idx").on(t.createdAt),
  ]
);

export const memberNotificationPrefs = pgTable("member_notification_prefs", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  wantsNewsletter: boolean("wants_newsletter").notNull().default(true),
  wantsEvents: boolean("wants_events").notNull().default(true),
  wantsSms: boolean("wants_sms").notNull().default(false),

  // TCPA / A2P 10DLC consent record. All required if wantsSms is ever true.
  smsConsentAt: timestamp("sms_consent_at", { withTimezone: true }),
  smsConsentIp: text("sms_consent_ip"),
  smsConsentUserAgent: text("sms_consent_user_agent"),
  /** Verbatim snapshot of the disclosure shown at opt-in. Required by A2P 10DLC. */
  smsConsentTextShown: text("sms_consent_text_shown"),
  /** Set when the man replies YES to the double-opt-in confirmation text. */
  smsDoubleOptInAt: timestamp("sms_double_opt_in_at", { withTimezone: true }),

  /** One-click unsubscribe token (signed JWT or random 64-char). Embedded in every email. */
  emailUnsubscribeToken: text("email_unsubscribe_token").notNull().unique(),

  /** Recipient timezone — used for quiet-hour gating in SMS sends (Phase E). */
  timezone: text("timezone"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Per-admin UI prefs — coachmark dismissals, sidebar collapsed state, etc.
 *  Phase C ships the AdminHelp side-sheet without per-admin state; this table
 *  exists for the optional first-login tour and future per-admin polish. */
export const adminPrefs = pgTable("admin_prefs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tourProgress: jsonb("tour_progress").$type<Record<string, true>>().notNull().default({}),
  sidebarCollapsed: boolean("sidebar_collapsed").notNull().default(false),
  lastSeenChangelog: text("last_seen_changelog"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
