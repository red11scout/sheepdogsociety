// Plain server module (NOT "use server") — shared state helpers for the
// letter autopilot. Exists separately from autopilot.ts and
// autopilot-admin.ts so both can import from it: autopilot.ts is a plain
// module and can import a "use server" file's exported actions, but
// autopilot-admin.ts is "use server" and may ONLY export async actions —
// it cannot export a plain helper like getOrCreatePilotRow for autopilot.ts
// to call. A third, importable-by-both plain module is the fix.

import { asc } from "drizzle-orm";
import { db } from "@/db";
import { letterAutopilot, type LetterAutopilot } from "@/db/schema";
import { computeScheduledFor } from "@/server/letters/series-core";
import { chicagoDateParts } from "@/lib/letters/theme-calendar";

// Single source of truth for the block shape; autopilot.ts imports these.
export const BLOCK_SIZE = 4;
export const PUBLISH_HOUR = 6; // 6am Central, same as the manual series wizard default.

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Loads the single letter_autopilot row, creating it (disabled) if missing.
 * Shared by autopilot.ts (the engine's own load) and autopilot-admin.ts
 * (getAutopilotStatus + setAutopilotEnabled), which previously duplicated
 * this select-then-insert-if-missing block three times.
 *
 * Theoretical race: two concurrent first-callers (e.g. the cron and an
 * admin page load, at the exact same instant before any row exists) could
 * both see no row and both insert, producing two rows — letter_autopilot
 * has no unique constraint to prevent it. Accepted risk: this is a
 * single-admin tool and callers only ever read the first row via
 * .limit(1); the ORDER BY id below makes that read deterministic, so
 * every caller (engine and admin toggle alike) always sees the SAME row
 * even if a duplicate exists. Not worth an advisory lock.
 */
export async function getOrCreatePilotRow(): Promise<LetterAutopilot> {
  let [pilot] = await db
    .select()
    .from(letterAutopilot)
    .orderBy(asc(letterAutopilot.id))
    .limit(1);
  if (!pilot) {
    [pilot] = await db.insert(letterAutopilot).values({ enabled: false }).returning();
  }
  return pilot;
}

/**
 * Pure: computes the four weekly publish dates for the next autopilot
 * block. The block starts one week after `anchor` (the latest scheduledFor
 * among currently-scheduled letters), or one week after `now` if there is
 * no anchor (nothing scheduled yet). A stale anchor — at or before `now` —
 * is clamped to `now`, so a leftover past date can never schedule letters
 * into the past (they would publish instantly, unreviewed). Letters land
 * at +7d, +14d, +21d, +28d from that start, at the 6am-Central publish
 * hour, exactly as computeScheduledFor persists them.
 *
 * Extracted from runAutopilot's inline block-date computation (identical
 * behavior) so it can be unit tested without a database.
 */
export function computeBlockDates(anchor: Date | null, now: Date): Date[] {
  const effectiveAnchor =
    !anchor || anchor.getTime() <= now.getTime() ? now : anchor;
  const startParts = chicagoDateParts(new Date(effectiveAnchor.getTime() + 7 * 86400000));
  const startDate = `${startParts.year}-${pad2(startParts.month)}-${pad2(startParts.day)}`;
  const startDateObj = new Date(`${startDate}T00:00:00Z`);

  const dates: Date[] = [];
  for (let position = 1; position <= BLOCK_SIZE; position++) {
    dates.push(computeScheduledFor(startDateObj, position, "weekly", PUBLISH_HOUR));
  }
  return dates;
}
