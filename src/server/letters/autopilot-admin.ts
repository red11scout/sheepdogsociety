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
import { letterAutopilot, letterSeries, weeklyEncouragements } from "@/db/schema-new";
import { users } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
  let [pilot] = await db.select().from(letterAutopilot).limit(1);
  if (!pilot) {
    [pilot] = await db.insert(letterAutopilot).values({ enabled: false }).returning();
  }

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

  return { pilot, scheduledLetters };
}

export async function setAutopilotEnabled(
  enabled: boolean
): Promise<{ enabled: boolean; reverted: number }> {
  await requireAdmin();

  let [pilot] = await db.select().from(letterAutopilot).limit(1);
  if (!pilot) {
    [pilot] = await db.insert(letterAutopilot).values({ enabled: false }).returning();
  }

  await db
    .update(letterAutopilot)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(letterAutopilot.id, pilot.id));

  let reverted = 0;
  if (!enabled) {
    const seriesIds = await autopilotSeriesIds();
    if (seriesIds.length > 0) {
      const revertedRows = await db
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
      reverted = revertedRows.length;
    }
  }

  revalidatePath("/admin/encouragements");
  return { enabled, reverted };
}
