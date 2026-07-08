import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { eventSeries, users } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  ensureSeriesHorizon,
  propagateCosmetics,
  regenerateFutureInstances,
  removeCleanFutureInstances,
  softDeleteSeries,
} from "@/server/event-series";

const PATTERN_KEYS = [
  "cadence",
  "dayOfWeek",
  "nthWeek",
  "startTimeOfDay",
  "durationMinutes",
  "timezone",
  "startDate",
] as const;

const COSMETIC_KEYS = [
  "title",
  "description",
  "location",
  "eventType",
  "imageUrl",
  "registrationUrl",
] as const;

const updateSeriesSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  location: z.string().max(300).optional(),
  cadence: z.enum(["weekly", "biweekly", "monthly_nth_weekday"]).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  nthWeek: z.number().int().min(1).max(5).nullable().optional(),
  startTimeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  durationMinutes: z.number().int().positive().max(1440).nullable().optional(),
  timezone: z.string().min(1).max(64).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  eventType: z.string().max(50).optional(),
  imageUrl: z.string().max(2000).optional(),
  registrationUrl: z.string().url().optional().or(z.literal("")),
  active: z.boolean().optional(),
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { id } = await params;
  const [row] = await db
    .select()
    .from(eventSeries)
    .where(and(eq(eventSeries.id, id), isNull(eventSeries.deletedAt)));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ series: row });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(eventSeries)
    .where(and(eq(eventSeries.id, id), isNull(eventSeries.deletedAt)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = parsed.data;

  // Validate the MERGED record: partial payloads must not leave a
  // monthly series without an nthWeek (the generator throws on it).
  const mergedCadence = d.cadence ?? existing.cadence;
  const mergedNth = d.nthWeek !== undefined ? d.nthWeek : existing.nthWeek;
  if (mergedCadence === "monthly_nth_weekday" && mergedNth == null) {
    return NextResponse.json(
      { error: "nthWeek is required for monthly series" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (d.title !== undefined) updates.title = d.title;
  if (d.description !== undefined) updates.description = d.description;
  if (d.location !== undefined) updates.location = d.location;
  if (d.cadence !== undefined) updates.cadence = d.cadence;
  if (d.dayOfWeek !== undefined) updates.dayOfWeek = d.dayOfWeek;
  if (d.nthWeek !== undefined) updates.nthWeek = d.nthWeek;
  if (d.startTimeOfDay !== undefined) updates.startTimeOfDay = d.startTimeOfDay;
  if (d.durationMinutes !== undefined) updates.durationMinutes = d.durationMinutes;
  if (d.timezone !== undefined) updates.timezone = d.timezone;
  if (d.startDate !== undefined) updates.startDate = d.startDate;
  if (d.eventType !== undefined) updates.eventType = d.eventType;
  if (d.imageUrl !== undefined) updates.imageUrl = d.imageUrl;
  if (d.registrationUrl !== undefined) updates.registrationUrl = d.registrationUrl;
  if (d.active !== undefined) updates.active = d.active;

  const [updated] = await db
    .update(eventSeries)
    .set(updates)
    .where(eq(eventSeries.id, id))
    .returning();

  const patternChanged = PATTERN_KEYS.some((k) => d[k] !== undefined);
  const cosmeticChanged = COSMETIC_KEYS.some((k) => d[k] !== undefined);

  // Cosmetics propagate no matter which branch runs next: surviving
  // (photographed/detached-content…) future instances must not keep a
  // stale title while regenerated siblings get the new one.
  if (cosmeticChanged) await propagateCosmetics(id);

  if (d.active === false) {
    await removeCleanFutureInstances(id, { keepCancelled: true });
  } else if (patternChanged) {
    await regenerateFutureInstances(id);
  } else if (d.active === true) {
    await ensureSeriesHorizon(id);
  }

  return NextResponse.json({ series: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { id } = await params;
  const [existing] = await db
    .select()
    .from(eventSeries)
    .where(and(eq(eventSeries.id, id), isNull(eventSeries.deletedAt)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await softDeleteSeries(id);
  return NextResponse.json({ success: true });
}
