// Plain server module (NOT "use server") — the session-less core of
// series creation. Both the admin wizard (via letter-series.ts's
// requireAdmin-gated wrapper) and the autopilot cron call into this;
// neither an admin session nor a request context is required here.
//
// The whole issueNumber-MAX+1-plus-inserts flow runs inside one
// db.transaction for atomicity. The transaction alone does NOT prevent
// duplicate issue numbers — READ COMMITTED lets two concurrent writers
// (wizard + autopilot cron) read the same MAX(issue_number) — so the
// transaction takes a pg_advisory_xact_lock as its first statement to
// serialize series creation. Slugs are additionally backstopped by the
// we_slug_unique index; issue_number has no unique constraint, making
// the lock the only guard.

import { db } from "@/db";
import { weeklyEncouragements, letterSeries } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export interface DraftLetter {
  position: number;
  title: string;
  intro: string;
  scriptures: { ref: string; note: string }[];
  guidance: string;
  notes: string;
  callToAction?: string;
}

export const CADENCE_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 28,
};

export function computeScheduledFor(
  startDate: Date,
  position: number, // 1-indexed
  cadence: string,
  publishHour: number
): Date {
  const days = CADENCE_DAYS[cadence] ?? 7;
  const d = new Date(startDate.getTime());
  d.setUTCDate(d.getUTCDate() + (position - 1) * days);
  // Set local America/Chicago publish hour. Stored as UTC; the cron
  // converts. America/Chicago is UTC-5 (CDT) or UTC-6 (CST). We store
  // as UTC = local + 6 to be conservative for CST; CDT will publish 1h
  // earlier which is fine for a "morning" send.
  d.setUTCHours(publishHour + 6, 0, 0, 0);
  return d;
}

export interface SeriesCoreInput {
  title: string;
  theme: string;
  voice: string;
  totalCount: number;
  cadence: "weekly" | "biweekly" | "monthly";
  startDate: string; // ISO date "YYYY-MM-DD"
  publishHour: number;
  origin: "manual" | "autopilot";
  letters: DraftLetter[];
}

/**
 * Create a series + insert N draft encouragements with status='scheduled',
 * each populated with the AI-generated content and a scheduled_for time
 * computed from the cadence. Session-less: authorId is supplied by the
 * caller (an authenticated admin's userId for the wizard, or the
 * autopilot's configured default_author_id for the cron).
 */
export async function createSeriesWithLettersCore(
  authorId: string,
  input: SeriesCoreInput
) {
  if (input.letters.length !== input.totalCount) {
    throw new Error(
      `Expected ${input.totalCount} letters, got ${input.letters.length}`
    );
  }

  return await db.transaction(async (tx) => {
    // Serialize series creation across concurrent writers (wizard +
    // autopilot cron): READ COMMITTED lets two transactions read the same
    // MAX(issue_number). The xact-scoped advisory lock releases on
    // commit/rollback automatically. 815551 = arbitrary app-wide constant
    // reserved for letter-series creation.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(815551)`);

    // 1. Create the series row.
    const [series] = await tx
      .insert(letterSeries)
      .values({
        title: input.title.trim() || "Untitled series",
        theme: input.theme.trim(),
        voice: input.voice ?? "",
        totalCount: input.totalCount,
        cadence: input.cadence,
        startDate: input.startDate,
        publishHour: input.publishHour,
        origin: input.origin,
        createdBy: authorId,
      })
      .returning();

    // 2. Find the next issue number (each letter gets one in series order).
    const [{ next: nextIssue }] = await tx
      .select({
        next: sql<number>`COALESCE(MAX(${weeklyEncouragements.issueNumber}), 0) + 1`,
      })
      .from(weeklyEncouragements);

    const startDateObj = new Date(`${input.startDate}T00:00:00Z`);
    const inserted: { id: string; slug: string; position: number }[] = [];

    // 3. Insert each letter as scheduled.
    for (let i = 0; i < input.letters.length; i++) {
      const draft = input.letters[i];
      const issueNumber = nextIssue + i;
      const baseSlug = slugify(`issue-${issueNumber}-${draft.title}`);
      let slug = baseSlug;
      let suffix = 1;
      while (true) {
        const [existing] = await tx
          .select({ id: weeklyEncouragements.id })
          .from(weeklyEncouragements)
          .where(eq(weeklyEncouragements.slug, slug));
        if (!existing) break;
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }

      const scheduledFor = computeScheduledFor(
        startDateObj,
        draft.position,
        input.cadence,
        input.publishHour
      );

      const [row] = await tx
        .insert(weeklyEncouragements)
        .values({
          issueNumber,
          title: draft.title,
          slug,
          status: "scheduled",
          intro: draft.intro,
          scriptures: draft.scriptures,
          guidance: draft.guidance,
          notes: draft.notes,
          callToAction: draft.callToAction ?? "",
          theme: input.theme.trim(),
          voice: input.voice ?? "",
          seriesId: series.id,
          seriesPosition: draft.position,
          scheduledFor,
          publishDate: scheduledFor.toISOString().slice(0, 10),
          authorId,
        })
        .returning({
          id: weeklyEncouragements.id,
          slug: weeklyEncouragements.slug,
        });

      inserted.push({ id: row.id, slug: row.slug, position: draft.position });
    }

    return { series, letters: inserted };
  });
}
