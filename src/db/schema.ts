import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================
// Enums
// ============================================================

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "group_leader",
  "asst_leader",
  "member",
]);

export const userStatusEnum = pgEnum("user_status", [
  "pending",
  "active",
  "suspended",
]);

export const channelTypeEnum = pgEnum("channel_type", [
  "org",
  "leaders",
  "group",
  "dm",
]);

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "published",
]);

export const privacyLevelEnum = pgEnum("privacy_level", [
  "public",
  "group",
  "private",
  "anonymous",
]);

export const prayerStatusEnum = pgEnum("prayer_status", [
  "active",
  "answered",
  "archived",
]);

export const rsvpStatusEnum = pgEnum("rsvp_status", [
  "going",
  "maybe",
  "declined",
]);

export const accountabilityStatusEnum = pgEnum("accountability_status", [
  "active",
  "paused",
  "ended",
]);

export const resourceTypeEnum = pgEnum("resource_type", [
  "link",
  "file",
  "video",
]);

export const groupMemberRoleEnum = pgEnum("group_member_role", [
  "leader",
  "asst_leader",
  "member",
]);

// ============================================================
// Core Tables
// ============================================================

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // Clerk user ID (text PK; Auth.js adapter accepts this)
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified"),
    image: text("image"), // Auth.js adapter expects "image"; existing avatarUrl preserved separately
    name: text("name"), // Auth.js adapter expects "name"; existing firstName/lastName preserved
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    username: text("username").default(""),
    avatarUrl: text("avatar_url").default(""),
    bio: text("bio").default(""),
    phone: text("phone").default(""),
    role: userRoleEnum("role").notNull().default("member"),
    status: userStatusEnum("status").notNull().default("pending"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_status_idx").on(table.status),
    index("users_role_idx").on(table.role),
  ]
);

// ============================================================
// Groups
// ============================================================

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").default(""),
  meetingSchedule: text("meeting_schedule").default(""),
  meetingLocation: text("meeting_location").default(""),
  maxMembers: integer("max_members").notNull().default(15),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: groupMemberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    invitedBy: text("invited_by"),
  },
  (table) => [
    uniqueIndex("group_members_unique").on(table.groupId, table.userId),
    index("group_members_user_idx").on(table.userId),
  ]
);

// ============================================================
// Channels & Chat
// ============================================================

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: channelTypeEnum("type").notNull(),
    description: text("description").default(""),
    groupId: uuid("group_id").references(() => groups.id, {
      onDelete: "cascade",
    }),
    isArchived: boolean("is_archived").notNull().default(false),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("channels_type_idx").on(table.type),
    index("channels_group_idx").on(table.groupId),
  ]
);

export const channelMembers = pgTable(
  "channel_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("channel_members_unique").on(table.channelId, table.userId),
    index("channel_members_user_idx").on(table.userId),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    parentMessageId: uuid("parent_message_id"),
    isEdited: boolean("is_edited").notNull().default(false),
    isDeleted: boolean("is_deleted").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("messages_channel_idx").on(table.channelId),
    index("messages_user_idx").on(table.userId),
    index("messages_parent_idx").on(table.parentMessageId),
    index("messages_created_idx").on(table.createdAt),
  ]
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reactions_unique").on(
      table.messageId,
      table.userId,
      table.emoji
    ),
    index("reactions_message_idx").on(table.messageId),
  ]
);

// ============================================================
// Blog / Content
// ============================================================

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: jsonb("content"), // TipTap JSON document
    excerpt: text("excerpt").default(""),
    coverImageUrl: text("cover_image_url").default(""),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    status: postStatusEnum("status").notNull().default("draft"),
    category: text("category").default(""),
    isFeatured: boolean("is_featured").notNull().default(false),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("blog_posts_slug_unique").on(table.slug),
    index("blog_posts_status_idx").on(table.status),
    index("blog_posts_author_idx").on(table.authorId),
  ]
);

// ============================================================
// AI Content
// ============================================================

export const scriptureOfDay = pgTable(
  "scripture_of_day",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: text("date").notNull(), // YYYY-MM-DD
    reference: text("reference").notNull(),
    text: text("text").default(""),
    translation: text("translation").notNull().default("ESV"),
    theme: text("theme").default(""),
    reflection: text("reflection").default(""),
    seriesId: text("series_id").default(""),
    seriesName: text("series_name").default(""),
    dayInSeries: integer("day_in_series"),
    isApproved: boolean("is_approved").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("scripture_of_day_date_unique").on(table.date)]
);

export const devotionals = pgTable(
  "devotionals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: text("date").notNull(), // YYYY-MM-DD
    title: text("title").notNull(),
    content: text("content").notNull(),
    scriptureReference: text("scripture_reference").notNull(),
    scriptureText: text("scripture_text").default(""),
    prayerPrompt: text("prayer_prompt").default(""),
    discussionQuestions: jsonb("discussion_questions").$type<string[]>(),
    isApproved: boolean("is_approved").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("devotionals_date_unique").on(table.date)]
);

// ============================================================
// Prayer
// ============================================================

export const prayerRequests = pgTable(
  "prayer_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    content: text("content").notNull(),
    privacyLevel: privacyLevelEnum("privacy_level")
      .notNull()
      .default("public"),
    groupId: uuid("group_id").references(() => groups.id),
    status: prayerStatusEnum("status").notNull().default("active"),
    answeredAt: timestamp("answered_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("prayer_requests_user_idx").on(table.userId),
    index("prayer_requests_status_idx").on(table.status),
    index("prayer_requests_group_idx").on(table.groupId),
  ]
);

export const prayerRequestPrayers = pgTable(
  "prayer_request_prayers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prayerRequestId: uuid("prayer_request_id")
      .notNull()
      .references(() => prayerRequests.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("prayer_prayers_unique").on(
      table.prayerRequestId,
      table.userId
    ),
  ]
);

// ============================================================
// Bible Study
// ============================================================

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(), // e.g., "Genesis 1:1"
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("notes_user_idx").on(table.userId)]
);

export const bibleBookmarks = pgTable(
  "bible_bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
    label: text("label").default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("bible_bookmarks_user_idx").on(table.userId)]
);

export const bibleHighlights = pgTable(
  "bible_highlights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
    color: text("color").notNull().default("gold"), // gold, blue, green, red
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("bible_highlights_user_idx").on(table.userId)]
);

// ============================================================
// Reading Plans
// ============================================================

export const readingPlans = pgTable("reading_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").default(""),
  totalDays: integer("total_days").notNull(),
  readings: jsonb("readings").$type<
    { day: number; readings: string[] }[]
  >(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const readingProgress = pgTable(
  "reading_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readingPlanId: uuid("reading_plan_id")
      .notNull()
      .references(() => readingPlans.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reading_progress_unique").on(
      table.userId,
      table.readingPlanId,
      table.dayNumber
    ),
    index("reading_progress_user_idx").on(table.userId),
  ]
);

// ============================================================
// Accountability
// ============================================================

export const accountabilityPairs = pgTable(
  "accountability_pairs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user1Id: text("user1_id")
      .notNull()
      .references(() => users.id),
    user2Id: text("user2_id")
      .notNull()
      .references(() => users.id),
    status: accountabilityStatusEnum("status")
      .notNull()
      .default("active"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),
  },
  (table) => [
    index("accountability_pairs_user1_idx").on(table.user1Id),
    index("accountability_pairs_user2_idx").on(table.user2Id),
  ]
);

export const accountabilityCheckins = pgTable(
  "accountability_checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pairId: uuid("pair_id")
      .notNull()
      .references(() => accountabilityPairs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    mood: text("mood").default(""),
    highlights: text("highlights").default(""),
    struggles: text("struggles").default(""),
    prayerNeeds: text("prayer_needs").default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("accountability_checkins_pair_idx").on(table.pairId),
    index("accountability_checkins_user_idx").on(table.userId),
  ]
);

// ============================================================
// Events
// ============================================================

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").default(""),
    location: text("location").default(""),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurrenceRule: text("recurrence_rule"),
    eventType: text("event_type").default("weekly"), // weekly, monthly, quarterly, annual, conference
    imageUrl: text("image_url").default(""),
    maxAttendees: integer("max_attendees"),
    registrationUrl: text("registration_url").default(""),
    groupId: uuid("group_id").references(() => groups.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("events_start_time_idx").on(table.startTime),
    index("events_group_idx").on(table.groupId),
  ]
);

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: rsvpStatusEnum("status").notNull().default("going"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_rsvps_unique").on(table.eventId, table.userId),
  ]
);

// ============================================================
// Resources
// ============================================================

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").default(""),
    type: resourceTypeEnum("type").notNull().default("link"),
    url: text("url").default(""),
    fileKey: text("file_key").default(""), // Supabase Storage key
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => users.id),
    groupId: uuid("group_id").references(() => groups.id),
    originalResourceId: uuid("original_resource_id"),
    isPublic: boolean("is_public").notNull().default(false),
    category: text("category").default("general"), // general, study_guide, book, reference
    level: text("level").default("all"), // all, entry, mid, advanced
    seriesName: text("series_name").default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("resources_group_idx").on(table.groupId),
    index("resources_uploaded_by_idx").on(table.uploadedBy),
  ]
);

// ============================================================
// Attendance
// ============================================================

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").references(() => events.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    groupId: uuid("group_id").references(() => groups.id),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  },
  (table) => [
    index("attendance_records_user_idx").on(table.userId),
    index("attendance_records_group_idx").on(table.groupId),
    index("attendance_records_event_idx").on(table.eventId),
  ]
);

// ============================================================
// Testimonies
// ============================================================

export const testimonies = pgTable(
  "testimonies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    content: text("content").notNull(),
    isApproved: boolean("is_approved").notNull().default(false),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("testimonies_user_idx").on(table.userId)]
);

// ============================================================
// Relations
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  groupMemberships: many(groupMembers),
  messages: many(messages),
  prayerRequests: many(prayerRequests),
  notes: many(notes),
  bookmarks: many(bibleBookmarks),
  highlights: many(bibleHighlights),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  members: many(groupMembers),
  channels: many(channels),
  events: many(events),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  group: one(groups, {
    fields: [channels.groupId],
    references: [groups.id],
  }),
  members: many(channelMembers),
  messages: many(messages),
}));

export const channelMembersRelations = relations(
  channelMembers,
  ({ one }) => ({
    channel: one(channels, {
      fields: [channelMembers.channelId],
      references: [channels.id],
    }),
    user: one(users, {
      fields: [channelMembers.userId],
      references: [users.id],
    }),
  })
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
  author: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  parentMessage: one(messages, {
    fields: [messages.parentMessageId],
    references: [messages.id],
    relationName: "thread",
  }),
  replies: many(messages, { relationName: "thread" }),
  reactions: many(reactions),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  message: one(messages, {
    fields: [reactions.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id],
  }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
}));

export const prayerRequestsRelations = relations(
  prayerRequests,
  ({ one, many }) => ({
    author: one(users, {
      fields: [prayerRequests.userId],
      references: [users.id],
    }),
    group: one(groups, {
      fields: [prayerRequests.groupId],
      references: [groups.id],
    }),
    prayers: many(prayerRequestPrayers),
  })
);

export const prayerRequestPrayersRelations = relations(
  prayerRequestPrayers,
  ({ one }) => ({
    request: one(prayerRequests, {
      fields: [prayerRequestPrayers.prayerRequestId],
      references: [prayerRequests.id],
    }),
    user: one(users, {
      fields: [prayerRequestPrayers.userId],
      references: [users.id],
    }),
  })
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [events.groupId],
    references: [groups.id],
  }),
  rsvps: many(eventRsvps),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, {
    fields: [eventRsvps.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRsvps.userId],
    references: [users.id],
  }),
}));

// ============================================================
// Locations (F3 Nation-style map system)
// ============================================================

export const locationStatusEnum = pgEnum("location_status", [
  "active",
  "pending",
  "inactive",
]);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").default(""),
    latitude: text("latitude").notNull(),
    longitude: text("longitude").notNull(),
    address: text("address").default(""),
    city: text("city").notNull(),
    state: text("state").notNull(),
    zipCode: text("zip_code").default(""),
    country: text("country").notNull().default("US"),
    meetingDay: text("meeting_day").default(""),
    meetingTime: text("meeting_time").default(""),
    meetingPlace: text("meeting_place").default(""),
    groupSize: integer("group_size").default(0),
    maxSize: integer("max_size").notNull().default(12),
    signalGroupUrl: text("signal_group_url").default(""),
    contactName: text("contact_name").default(""),
    contactEmail: text("contact_email").default(""),
    status: locationStatusEnum("status").notNull().default("pending"),
    leaderId: text("leader_id").references(() => users.id),
    groupId: uuid("group_id").references(() => groups.id),
    imageUrl: text("image_url").default(""),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("locations_city_idx").on(table.city),
    index("locations_state_idx").on(table.state),
    index("locations_status_idx").on(table.status),
  ]
);

export const locationRequests = pgTable("location_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterName: text("requester_name").notNull(),
  requesterEmail: text("requester_email").notNull(),
  requesterPhone: text("requester_phone").default(""),
  proposedCity: text("proposed_city").notNull(),
  proposedState: text("proposed_state").notNull(),
  proposedMeetingDetails: text("proposed_meeting_details").default(""),
  reason: text("reason").default(""),
  status: text("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const locationInterests = pgTable("location_interests", {
  id: uuid("id").primaryKey().defaultRandom(),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").default(""),
  message: text("message").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================
// Contact & Newsletter
// ============================================================

export const contactSubmissions = pgTable("contact_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  topic: text("topic").default("general"),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    firstName: text("first_name").default(""),
    subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [uniqueIndex("newsletter_email_unique").on(table.email)]
);

// ============================================================
// Location Relations
// ============================================================

export const locationsRelations = relations(locations, ({ one, many }) => ({
  leader: one(users, {
    fields: [locations.leaderId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [locations.groupId],
    references: [groups.id],
  }),
  interests: many(locationInterests),
}));

export const locationInterestsRelations = relations(
  locationInterests,
  ({ one }) => ({
    location: one(locations, {
      fields: [locationInterests.locationId],
      references: [locations.id],
    }),
  })
);

// ============================================================
// Auth.js v5 adapter tables
// (Added for migration from Clerk; users.id stays text since 30+ tables FK it)
// ============================================================

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    uniqueIndex("accounts_provider_account_unique").on(
      table.provider,
      table.providerAccountId
    ),
    index("accounts_user_idx").on(table.userId),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires").notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (table) => [
    uniqueIndex("verification_tokens_identifier_token_unique").on(
      table.identifier,
      table.token
    ),
  ]
);

// ============================================================
// Newsletter / Letters (brief Phase 1 + 2)
// "letter" rather than "blog" — issue-based weekly editorial
// ============================================================

export const letterStatusEnum = pgEnum("letter_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const letters = pgTable(
  "letters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    issueNumber: integer("issue_number").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    themeWord: text("theme_word"),
    coverImageUrl: text("cover_image_url"),
    body: jsonb("body").notNull(), // Tiptap ProseMirror JSON
    bodyHtml: text("body_html").notNull().default(""), // pre-rendered for SEO/email
    excerpt: text("excerpt").default(""),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    status: letterStatusEnum("status").notNull().default("draft"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    emailSubject: text("email_subject"),
    emailPreviewText: text("email_preview_text"),
    metaDescription: text("meta_description"),
    socialCopy: text("social_copy"),
    broadcastId: text("broadcast_id"), // Resend Broadcast ID
    publishedAt: timestamp("published_at"),
    scheduledFor: timestamp("scheduled_for"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"), // soft delete; 30-day cron purge
  },
  (table) => [
    uniqueIndex("letters_slug_active_unique")
      .on(table.slug)
      .where(notDeletedPredicate),
    uniqueIndex("letters_issue_active_unique")
      .on(table.issueNumber)
      .where(notDeletedPredicate),
    index("letters_status_published_idx").on(
      table.status,
      table.publishedAt
    ),
    index("letters_author_idx").on(table.authorId),
  ]
);

export const letterVersions = pgTable(
  "letter_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    letterId: uuid("letter_id")
      .notNull()
      .references(() => letters.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    body: jsonb("body").notNull(),
    bodyHtml: text("body_html").notNull().default(""),
    editedById: text("edited_by_id").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("letter_versions_unique").on(
      table.letterId,
      table.versionNumber
    ),
    index("letter_versions_letter_idx").on(table.letterId),
  ]
);

// ============================================================
// Group Leaders (brief Phase 2; separates leader from member identity)
// ============================================================

export const groupLeaders = pgTable(
  "group_leaders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email"), // never exposed publicly
    phone: text("phone"),
    bio: text("bio").default(""),
    photoUrl: text("photo_url"),
    userId: text("user_id").references(() => users.id), // optional link to existing user
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("group_leaders_user_idx").on(table.userId)]
);

// ============================================================
// AI Generations log + Audit log (brief §9 mandatory)
// ============================================================

export const aiTypeEnum = pgEnum("ai_generation_type", [
  "draft",
  "improve",
  "pullquote",
  "publish_meta",
  "alt_text",
  "image",
]);

export const aiGenerations = pgTable(
  "ai_generations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: aiTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    promptVersion: text("prompt_version"),
    model: text("model").notNull(),
    output: text("output").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    estimatedCostCents: integer("estimated_cost_cents"),
    entityType: text("entity_type"), // letter | devotional | etc
    entityId: text("entity_id"),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("ai_generations_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
    index("ai_generations_entity_idx").on(table.entityType, table.entityId),
  ]
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // create | update | soft_delete | restore | publish | broadcast | etc
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("audit_entity_idx").on(table.entityType, table.entityId),
    index("audit_user_idx").on(table.userId),
    index("audit_created_idx").on(table.createdAt),
  ]
);

// ============================================================
// Group Inquiries (brief §5 — public "I'm interested" form)
// (Separate from existing locationInterests so we can track followups)
// ============================================================

export const groupInquiries = pgTable(
  "group_inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    inquirerName: text("inquirer_name").notNull(),
    inquirerEmail: text("inquirer_email").notNull(),
    inquirerPhone: text("inquirer_phone"),
    message: text("message"),
    leaderRespondedAt: timestamp("leader_responded_at"),
    followupSentAt: timestamp("followup_sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("group_inquiries_location_idx").on(table.locationId),
    index("group_inquiries_followup_idx").on(table.followupSentAt),
  ]
);

// ============================================================
// Relations for new tables
// ============================================================

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const lettersRelations = relations(letters, ({ one, many }) => ({
  author: one(users, {
    fields: [letters.authorId],
    references: [users.id],
  }),
  versions: many(letterVersions),
}));

export const letterVersionsRelations = relations(
  letterVersions,
  ({ one }) => ({
    letter: one(letters, {
      fields: [letterVersions.letterId],
      references: [letters.id],
    }),
    editor: one(users, {
      fields: [letterVersions.editedById],
      references: [users.id],
    }),
  })
);

export const groupLeadersRelations = relations(groupLeaders, ({ one }) => ({
  user: one(users, {
    fields: [groupLeaders.userId],
    references: [users.id],
  }),
}));

export const aiGenerationsRelations = relations(aiGenerations, ({ one }) => ({
  user: one(users, {
    fields: [aiGenerations.userId],
    references: [users.id],
  }),
}));

export const groupInquiriesRelations = relations(
  groupInquiries,
  ({ one }) => ({
    location: one(locations, {
      fields: [groupInquiries.locationId],
      references: [locations.id],
    }),
  })
);

// Partial unique indexes exclude soft-deleted rows.
// Defined as a const SQL fragment so the same predicate is reused everywhere.
const notDeletedPredicate = sql`deleted_at IS NULL`;
