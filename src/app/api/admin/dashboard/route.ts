import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import {
  users,
  groups,
  messages,
  prayerRequests,
  events,
  blogPosts,
  testimonies,
  channels,
  letters,
  aiGenerations,
  newsletterSubscribers,
} from "@/db/schema";
import { eq, sql, gte, desc, isNull, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel
  const [
    totalUsersResult,
    activeUsersResult,
    pendingUsersResult,
    totalGroupsResult,
    totalMessagesResult,
    recentMessagesResult,
    activePrayerResult,
    answeredPrayerResult,
    upcomingEventsResult,
    publishedPostsResult,
    pendingTestimoniesResult,
    totalChannelsResult,
    // NEW: Letters + AI + subscribers
    draftLettersResult,
    publishedLettersResult,
    recentLettersList,
    aiGenerationsThisWeekResult,
    aiGenerationsTotalResult,
    activeSubscribersResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.status, "active")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.status, "pending")),
    db.select({ count: sql<number>`count(*)::int` }).from(groups),
    db.select({ count: sql<number>`count(*)::int` }).from(messages),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(gte(messages.createdAt, sevenDaysAgo)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(prayerRequests)
      .where(eq(prayerRequests.status, "active")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(prayerRequests)
      .where(eq(prayerRequests.status, "answered")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(gte(events.startTime, now)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(blogPosts)
      .where(eq(blogPosts.status, "published")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(testimonies)
      .where(eq(testimonies.isApproved, false)),
    db.select({ count: sql<number>`count(*)::int` }).from(channels),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(letters)
      .where(and(eq(letters.status, "draft"), isNull(letters.deletedAt))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(letters)
      .where(and(eq(letters.status, "published"), isNull(letters.deletedAt))),
    db
      .select({
        id: letters.id,
        title: letters.title,
        themeWord: letters.themeWord,
        issueNumber: letters.issueNumber,
        status: letters.status,
        updatedAt: letters.updatedAt,
      })
      .from(letters)
      .where(isNull(letters.deletedAt))
      .orderBy(desc(letters.updatedAt))
      .limit(5),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, sevenDaysAgo)),
    db.select({ count: sql<number>`count(*)::int` }).from(aiGenerations),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.isActive, true)),
  ]);

  return NextResponse.json({
    stats: {
      totalUsers: totalUsersResult[0].count,
      activeUsers: activeUsersResult[0].count,
      pendingUsers: pendingUsersResult[0].count,
      totalGroups: totalGroupsResult[0].count,
      totalMessages: totalMessagesResult[0].count,
      messagesThisWeek: recentMessagesResult[0].count,
      activePrayers: activePrayerResult[0].count,
      answeredPrayers: answeredPrayerResult[0].count,
      upcomingEvents: upcomingEventsResult[0].count,
      publishedPosts: publishedPostsResult[0].count,
      pendingTestimonies: pendingTestimoniesResult[0].count,
      totalChannels: totalChannelsResult[0].count,
      draftLetters: draftLettersResult[0].count,
      publishedLetters: publishedLettersResult[0].count,
      activeSubscribers: activeSubscribersResult[0].count,
      aiGenerationsThisWeek: aiGenerationsThisWeekResult[0].count,
      aiGenerationsTotal: aiGenerationsTotalResult[0].count,
    },
    recentLetters: recentLettersList,
  });
}
