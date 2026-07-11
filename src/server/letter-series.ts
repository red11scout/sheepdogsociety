"use server";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { weeklyEncouragements, letterSeries } from "@/db/schema-new";
import { users } from "@/db/schema";
import { eq, isNull, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createSeriesWithLettersCore } from "@/server/letters/series-core";

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") throw new Error("Forbidden");
  return userId;
}

// Local shape, kept separate from the canonical DraftLetter in
// server/letters/series-core.ts (do not restructure to share it across
// the server/client boundary) — but it must stay a superset of every
// field series-core.ts's createSeriesWithLettersCore reads.
interface DraftLetter {
  position: number;
  title: string;
  intro: string;
  scriptures: { ref: string; note: string }[];
  guidance: string;
  notes: string;
  callToAction?: string;
}

/**
 * Create a series + insert N draft encouragements with status='scheduled',
 * each populated with the AI-generated content and a scheduled_for time
 * computed from the cadence. Thin authenticated wrapper — the actual
 * insert/scheduling logic lives in the session-less
 * createSeriesWithLettersCore so the autopilot cron can call it too.
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
  const result = await createSeriesWithLettersCore(userId, {
    ...input,
    origin: "manual",
  });
  revalidatePath("/admin/encouragements");
  return result;
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
