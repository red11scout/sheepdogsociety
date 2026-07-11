"use server";

// Admin-facing status + kill switch for the letter autopilot (spec Phase C,
// Task 7). getAutopilotStatus is a read used to render the Autopilot card
// on /admin/encouragements; setAutopilotEnabled is the toggle. Disabling
// reverts every still-scheduled letter that belongs to an autopilot-origin
// series back to draft (same fields cancelScheduledLetter sets), so nothing
// unreviewed keeps its place in the send queue once an admin has switched
// the engine off.

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { letterAutopilot, letterSeries, weeklyEncouragements, users } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreatePilotRow } from "@/server/letters/autopilot-state";

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") throw new Error("Forbidden");
  return userId;
}

/** Ids of every non-deleted series created by the autopilot. */
async function autopilotSeriesIds(): Promise<string[]> {
  const rows = await db
    .select({ id: letterSeries.id })
    .from(letterSeries)
    .where(and(eq(letterSeries.origin, "autopilot"), isNull(letterSeries.deletedAt)));
  return rows.map((r) => r.id);
}

export async function getAutopilotStatus() {
  await requireAdmin();
  const pilot = await getOrCreatePilotRow();

  const seriesIds = await autopilotSeriesIds();
  const scheduledLetters =
    seriesIds.length === 0
      ? []
      : await db
          .select({
            id: weeklyEncouragements.id,
            title: weeklyEncouragements.title,
            scheduledFor: weeklyEncouragements.scheduledFor,
          })
          .from(weeklyEncouragements)
          .where(
            and(
              eq(weeklyEncouragements.status, "scheduled"),
              isNull(weeklyEncouragements.deletedAt),
              inArray(weeklyEncouragements.seriesId, seriesIds)
            )
          )
          .orderBy(weeklyEncouragements.scheduledFor);

  // Who the letters are signed as. Null means the autopilot cannot run
  // (it never guesses an author); the card renders a warning for that.
  let authorName: string | null = null;
  if (pilot.defaultAuthorId) {
    const [author] = await db
      .select({ firstName: users.firstName, email: users.email })
      .from(users)
      .where(eq(users.id, pilot.defaultAuthorId));
    if (author) authorName = author.firstName.trim() || author.email;
  }

  // Titles for the last block's letters, regardless of status: after a
  // disable those letters are drafts (not in scheduledLetters), and the
  // card's "View letter" links should still carry real titles.
  const lastBlockIds = Array.isArray(pilot.lastBlockLetterIds)
    ? (pilot.lastBlockLetterIds as string[])
    : [];
  const lastBlockLetters =
    lastBlockIds.length === 0
      ? []
      : await db
          .select({
            id: weeklyEncouragements.id,
            title: weeklyEncouragements.title,
          })
          .from(weeklyEncouragements)
          .where(inArray(weeklyEncouragements.id, lastBlockIds));

  return { pilot, scheduledLetters, authorName, lastBlockLetters };
}

export async function setAutopilotEnabled(
  enabled: boolean
): Promise<{ enabled: boolean; reverted: number }> {
  await requireAdmin();

  const pilot = await getOrCreatePilotRow();

  // One transaction: the flag flip and the letter revert land together
  // or not at all. A disable that flips the flag but dies before the
  // revert would leave unreviewed letters scheduled behind an Off
  // switch; a revert without the flag flip would let the next run
  // simply refill the queue. Atomic or nothing.
  const reverted = await db.transaction(async (tx) => {
    await tx
      .update(letterAutopilot)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(letterAutopilot.id, pilot.id));

    if (enabled) return 0;

    const seriesRows = await tx
      .select({ id: letterSeries.id })
      .from(letterSeries)
      .where(and(eq(letterSeries.origin, "autopilot"), isNull(letterSeries.deletedAt)));
    const seriesIds = seriesRows.map((r) => r.id);
    if (seriesIds.length === 0) return 0;

    const revertedRows = await tx
      .update(weeklyEncouragements)
      .set({ status: "draft", scheduledFor: null, updatedAt: new Date() })
      .where(
        and(
          eq(weeklyEncouragements.status, "scheduled"),
          isNull(weeklyEncouragements.deletedAt),
          inArray(weeklyEncouragements.seriesId, seriesIds)
        )
      )
      .returning({ id: weeklyEncouragements.id });
    return revertedRows.length;
  });

  revalidatePath("/admin/encouragements");
  return { enabled, reverted };
}
