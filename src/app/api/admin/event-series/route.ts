import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { events, eventSeries, users } from "@/db/schema";
import { asc, desc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { ensureSeriesHorizon, patternFrom } from "@/server/event-series";
import {
  cadenceLabel,
  previewOccurrences,
  type SeriesCadence,
} from "@/lib/events/series";

const createSeriesSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    location: z.string().max(300).optional(),
    cadence: z.enum(["weekly", "biweekly", "monthly_nth_weekday"]),
    dayOfWeek: z.number().int().min(0).max(6),
    nthWeek: z.number().int().min(1).max(5).nullable().optional(),
    startTimeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    durationMinutes: z.number().int().positive().max(1440).nullable().optional(),
    timezone: z.string().min(1).max(64).default("America/Chicago"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    eventType: z.string().max(50).optional(),
    imageUrl: z.string().max(2000).optional(),
    registrationUrl: z.string().url().optional().or(z.literal("")),
  })
  .refine((v) => v.cadence !== "monthly_nth_weekday" || v.nthWeek != null, {
    message: "nthWeek is required for monthly series",
    path: ["nthWeek"],
  });

async function requireAdmin(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const { userId } = await auth();
  if (!userId)
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { userId };
}

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const rows = await db
    .select({
      series: eventSeries,
      instanceCount: sql<number>`(
        select count(*)::int from events where series_id = ${eventSeries.id}
      )`,
    })
    .from(eventSeries)
    .where(isNull(eventSeries.deletedAt))
    .orderBy(desc(eventSeries.createdAt));

  const now = new Date();
  const series = rows.map(({ series: s, instanceCount }) => ({
    id: s.id,
    title: s.title,
    description: s.description ?? "",
    location: s.location ?? "",
    cadence: s.cadence as SeriesCadence,
    dayOfWeek: s.dayOfWeek,
    nthWeek: s.nthWeek,
    startTimeOfDay: s.startTimeOfDay,
    durationMinutes: s.durationMinutes,
    timezone: s.timezone,
    startDate: s.startDate,
    eventType: s.eventType ?? "weekly",
    active: s.active,
    label: cadenceLabel({
      cadence: s.cadence as SeriesCadence,
      dayOfWeek: s.dayOfWeek,
      nthWeek: s.nthWeek,
    }),
    nextDates: s.active
      ? previewOccurrences(patternFrom(s), now, 5).map((d) => d.toISOString())
      : [],
    instanceCount,
  }));

  return NextResponse.json({ series });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const body = await req.json();
  const parsed = createSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const [series] = await db
    .insert(eventSeries)
    .values({
      title: d.title,
      description: d.description ?? "",
      location: d.location ?? "",
      cadence: d.cadence,
      dayOfWeek: d.dayOfWeek,
      nthWeek: d.nthWeek ?? null,
      startTimeOfDay: d.startTimeOfDay,
      durationMinutes: d.durationMinutes ?? null,
      timezone: d.timezone,
      startDate: d.startDate,
      eventType: d.eventType ?? "weekly",
      imageUrl: d.imageUrl ?? "",
      registrationUrl: d.registrationUrl ?? "",
      createdBy: gate.userId,
    })
    .returning();

  const { created } = await ensureSeriesHorizon(series.id);

  const instances = await db
    .select({
      id: events.id,
      title: events.title,
      startTime: events.startTime,
      location: events.location,
      eventType: events.eventType,
      description: events.description,
    })
    .from(events)
    .where(eq(events.seriesId, series.id))
    .orderBy(asc(events.startTime));

  return NextResponse.json({ series, instances, created }, { status: 201 });
}
