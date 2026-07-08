/**
 * Series materialization. Turns event_series patterns into real events
 * rows so the public calendar, gallery, and recaps all work on plain
 * dated events. Idempotent by construction:
 *  - inserts use ON CONFLICT (series_id, start_time) DO NOTHING;
 *  - any existing future instance (detached, photographed, or a
 *    cancelled tombstone) blocks its whole local calendar day via
 *    excludeOccupiedDays, so shifted-time regeneration cannot
 *    double-book a day.
 * The pure math lives (and is unit-tested) in src/lib/events/series.ts;
 * this file is a thin DB wrapper.
 */
import { db } from "@/db";
import { events, eventSeries } from "@/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  excludeOccupiedDays,
  generateOccurrences,
  type SeriesCadence,
  type SeriesPattern,
} from "@/lib/events/series";

/** How far ahead instances exist. 8 weeks. */
export const HORIZON_DAYS = 56;

type SeriesRow = typeof eventSeries.$inferSelect;

export function patternFrom(row: SeriesRow): SeriesPattern {
  return {
    cadence: row.cadence as SeriesCadence,
    dayOfWeek: row.dayOfWeek,
    nthWeek: row.nthWeek,
    startTimeOfDay: row.startTimeOfDay,
    durationMinutes: row.durationMinutes,
    timezone: row.timezone,
    startDate: row.startDate,
  };
}

/**
 * Insert any missing future instances for one series (or every active
 * series when no id is given). Safe to call repeatedly.
 */
export async function ensureSeriesHorizon(
  seriesId?: string
): Promise<{ created: number }> {
  const now = new Date();
  const to = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);

  const conditions = [isNull(eventSeries.deletedAt), eq(eventSeries.active, true)];
  if (seriesId) conditions.push(eq(eventSeries.id, seriesId));
  const rows = await db
    .select()
    .from(eventSeries)
    .where(and(...conditions));

  let created = 0;
  for (const s of rows) {
    const existingFuture = await db
      .select({ startTime: events.startTime })
      .from(events)
      .where(and(eq(events.seriesId, s.id), gt(events.startTime, now)));

    const occurrences = excludeOccupiedDays(
      generateOccurrences(patternFrom(s), now, to),
      existingFuture.map((r) => r.startTime),
      s.timezone
    );
    if (occurrences.length === 0) continue;

    const inserted = await db
      .insert(events)
      .values(
        occurrences.map((o) => ({
          title: s.title,
          description: s.description ?? "",
          location: s.location ?? "",
          startTime: o.start,
          endTime: o.end,
          eventType: s.eventType ?? "weekly",
          imageUrl: s.imageUrl ?? "",
          registrationUrl: s.registrationUrl ?? "",
          groupId: s.groupId,
          seriesId: s.id,
          createdBy: s.createdBy,
        }))
      )
      .onConflictDoNothing({ target: [events.seriesId, events.startTime] })
      .returning({ id: events.id });
    created += inserted.length;
  }
  return { created };
}

/**
 * Delete future instances the admin has not touched: not detached, no
 * photos, no recap. Pattern edits clear cancelled tombstones too (the
 * edit dialog says so); pause keeps them (`keepCancelled`) so resume
 * does not resurrect cancelled dates.
 */
export async function removeCleanFutureInstances(
  seriesId: string,
  opts: { keepCancelled?: boolean } = {}
): Promise<void> {
  const conditions = [
    eq(events.seriesId, seriesId),
    gt(events.startTime, new Date()),
    eq(events.isDetached, false),
    sql`jsonb_array_length(coalesce(${events.photos}, '[]'::jsonb)) = 0`,
    sql`length(coalesce(${events.recap}, '')) = 0`,
  ];
  if (opts.keepCancelled) conditions.push(eq(events.isCancelled, false));
  await db.delete(events).where(and(...conditions));
}

/** Pattern changed: reset clean future instances and refill the horizon. */
export async function regenerateFutureInstances(
  seriesId: string
): Promise<{ created: number }> {
  await removeCleanFutureInstances(seriesId);
  return ensureSeriesHorizon(seriesId);
}

/** Content-only change: push it to future, untouched instances. */
export async function propagateCosmetics(seriesId: string): Promise<void> {
  const [s] = await db
    .select()
    .from(eventSeries)
    .where(eq(eventSeries.id, seriesId));
  if (!s) return;
  await db
    .update(events)
    .set({
      title: s.title,
      description: s.description ?? "",
      location: s.location ?? "",
      eventType: s.eventType ?? "weekly",
      imageUrl: s.imageUrl ?? "",
      registrationUrl: s.registrationUrl ?? "",
    })
    .where(
      and(
        eq(events.seriesId, seriesId),
        gt(events.startTime, new Date()),
        eq(events.isDetached, false)
      )
    );
}

/**
 * Retire a series: remove every future instance without photos and
 * without a recap (detached or cancelled included, matching the retire
 * dialog copy), detach the history (past gatherings keep their photos),
 * soft-delete the pattern.
 */
export async function softDeleteSeries(seriesId: string): Promise<void> {
  await db
    .delete(events)
    .where(
      and(
        eq(events.seriesId, seriesId),
        gt(events.startTime, new Date()),
        sql`jsonb_array_length(coalesce(${events.photos}, '[]'::jsonb)) = 0`,
        sql`length(coalesce(${events.recap}, '')) = 0`
      )
    );
  await db
    .update(events)
    .set({ seriesId: null })
    .where(eq(events.seriesId, seriesId));
  await db
    .update(eventSeries)
    .set({ deletedAt: new Date(), active: false, updatedAt: new Date() })
    .where(eq(eventSeries.id, seriesId));
}
