"use server";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { weeklyEncouragements, letterSeries } from "@/db/schema-new";
import { users } from "@/db/schema";
import { eq, sql, isNull, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") throw new Error("Forbidden");
  return userId;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

interface DraftLetter {
  position: number;
  title: string;
  intro: string;
  scriptures: { ref: string; note: string }[];
  guidance: string;
  notes: string;
}

const CADENCE_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 28,
};

function computeScheduledFor(
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

/**
 * Create a series + insert N draft encouragements with status='scheduled',
 * each populated with the AI-generated content and a scheduled_for time
 * computed from the cadence.
 */
export async function createSeriesWithLetters(input: {
  title: string;
  theme: string;
  voice: string;
  totalCount: number;
  cadence: "weekly" | "biweekly" | "monthly";
  startDate: string; // ISO date "YYYY-MM-DD"
  publishHour: number;
  letters: DraftLetter[];
}) {
  const userId = await requireAdmin();
  if (input.letters.length !== input.totalCount) {
    throw new Error(
      `Expected ${input.totalCount} letters, got ${input.letters.length}`
    );
  }

  // 1. Create the series row.
  const [series] = await db
    .insert(letterSeries)
    .values({
      title: input.title.trim() || "Untitled series",
      theme: input.theme.trim(),
      voice: input.voice ?? "",
      totalCount: input.totalCount,
      cadence: input.cadence,
      startDate: input.startDate,
      publishHour: input.publishHour,
      createdBy: userId,
    })
    .returning();

  // 2. Find the next issue number (each letter gets one in series order).
  const [{ next: nextIssue }] = await db
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
      const [existing] = await db
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

    const [row] = await db
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
        theme: input.theme.trim(),
        voice: input.voice ?? "",
        seriesId: series.id,
        seriesPosition: draft.position,
        scheduledFor,
        publishDate: scheduledFor.toISOString().slice(0, 10),
        authorId: userId,
      })
      .returning({ id: weeklyEncouragements.id, slug: weeklyEncouragements.slug });

    inserted.push({ id: row.id, slug: row.slug, position: draft.position });
  }

  revalidatePath("/admin/encouragements");
  return { series, letters: inserted };
}

export async function listSeries() {
  await requireAdmin();
  return await db
    .select()
    .from(letterSeries)
    .where(isNull(letterSeries.deletedAt))
    .orderBy(desc(letterSeries.createdAt));
}

export async function listScheduledLetters() {
  await requireAdmin();
  return await db
    .select({
      id: weeklyEncouragements.id,
      issueNumber: weeklyEncouragements.issueNumber,
      title: weeklyEncouragements.title,
      slug: weeklyEncouragements.slug,
      theme: weeklyEncouragements.theme,
      seriesId: weeklyEncouragements.seriesId,
      seriesPosition: weeklyEncouragements.seriesPosition,
      scheduledFor: weeklyEncouragements.scheduledFor,
      status: weeklyEncouragements.status,
    })
    .from(weeklyEncouragements)
    .where(eq(weeklyEncouragements.status, "scheduled"))
    .orderBy(weeklyEncouragements.scheduledFor);
}

export async function cancelScheduledLetter(id: string) {
  await requireAdmin();
  await db
    .update(weeklyEncouragements)
    .set({ status: "draft", scheduledFor: null, updatedAt: new Date() })
    .where(eq(weeklyEncouragements.id, id));
  revalidatePath("/admin/encouragements");
}
