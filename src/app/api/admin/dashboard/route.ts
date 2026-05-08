import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import {
  users,
  groups,
  events,
  testimonies,
  letters,
  aiGenerations,
  newsletterSubscribers,
} from "@/db/schema";
import { weeklyEncouragements } from "@/db/schema-new";
import { sql, gte, desc, isNull, and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * Dashboard stats endpoint. Tightened in May 2026 from 18 queries down to 7
 * by:
 *   1. Dropping queries the UI doesn't render (messages, prayer requests,
 *      channels, blog posts, total users, aiGenerationsTotal — all
 *      member-area / unused-on-dashboard).
 *   2. Combining same-table counts with `count(*) FILTER (WHERE ...)` so
 *      three queries on `users` and three on `letters` become one each.
 *
 * The tradeoff: dropped fields disappear from the response. The dashboard
 * component only reads the fields below; legacy callers (none currently)
 * will see undefined for the dropped fields and should treat as zero.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    userStats,
    groupStats,
    upcomingEvents,
    pendingTestimoniesRow,
    letterStats,
    recentLettersList,
    aiThisWeekRow,
    activeSubscribersRow,
    encouragementSnapshot,
  ] = await Promise.all([
    // 1: All user-status counts in one pass.
    db
      .select({
        active: sql<number>`count(*) FILTER (WHERE status = 'active')::int`,
        pending: sql<number>`count(*) FILTER (WHERE status = 'pending')::int`,
      })
      .from(users),

    // 2: Groups total.
    db.select({ count: sql<number>`count(*)::int` }).from(groups),

    // 3: Upcoming events.
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(gte(events.startTime, now)),

    // 4: Pending testimonies (Inbox panel).
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(testimonies)
      .where(eq(testimonies.isApproved, false)),

    // 5: Letter stats — drafts + published in one pass, soft-delete aware.
    db
      .select({
        draft: sql<number>`count(*) FILTER (WHERE status = 'draft')::int`,
        published: sql<number>`count(*) FILTER (WHERE status = 'published')::int`,
      })
      .from(letters)
      .where(isNull(letters.deletedAt)),

    // 6: Recent letters list for the bento bottom row.
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

    // 7: AI generations in last 7 days (single tile).
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, sevenDaysAgo)),

    // 8: Active newsletter subscribers.
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.isActive, true)),

    // 9: Most recent encouragement (any status). Drives the "This week" hero.
    // Wrapped in try/catch so a missing migration doesn't break the dashboard.
    (async () => {
      try {
        return await db
          .select({
            id: weeklyEncouragements.id,
            title: weeklyEncouragements.title,
            slug: weeklyEncouragements.slug,
            status: weeklyEncouragements.status,
            publishDate: weeklyEncouragements.publishDate,
            updatedAt: weeklyEncouragements.updatedAt,
            issueNumber: weeklyEncouragements.issueNumber,
            theme: weeklyEncouragements.theme,
          })
          .from(weeklyEncouragements)
          .where(isNull(weeklyEncouragements.deletedAt))
          .orderBy(desc(weeklyEncouragements.updatedAt))
          .limit(1);
      } catch {
        return [] as never[];
      }
    })(),
  ]);

  // "This week" snapshot for the hero — is the most recent encouragement
  // already published, or still a draft, or missing entirely?
  const latest = encouragementSnapshot[0] ?? null;
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  let thisWeekStatus: "missing" | "draft" | "scheduled" | "published" = "missing";
  if (latest) {
    const updated = new Date(latest.updatedAt).getTime();
    if (latest.status === "published") {
      thisWeekStatus = "published";
    } else if (now.getTime() - updated < oneWeekMs) {
      thisWeekStatus =
        latest.status === "scheduled" ? "scheduled" : "draft";
    } else {
      // Latest row is older than a week and unpublished — treat as missing.
      thisWeekStatus = "missing";
    }
  }

  return NextResponse.json({
    stats: {
      activeUsers: userStats[0].active,
      pendingUsers: userStats[0].pending,
      totalGroups: groupStats[0].count,
      upcomingEvents: upcomingEvents[0].count,
      pendingTestimonies: pendingTestimoniesRow[0].count,
      draftLetters: letterStats[0].draft,
      publishedLetters: letterStats[0].published,
      activeSubscribers: activeSubscribersRow[0].count,
      aiGenerationsThisWeek: aiThisWeekRow[0].count,
    },
    thisWeek: {
      status: thisWeekStatus,
      latest: latest
        ? {
            id: latest.id,
            title: latest.title,
            slug: latest.slug,
            status: latest.status,
            issueNumber: latest.issueNumber,
            theme: latest.theme ?? "",
            updatedAt: latest.updatedAt,
          }
        : null,
    },
    recentLetters: recentLettersList,
  });
}
