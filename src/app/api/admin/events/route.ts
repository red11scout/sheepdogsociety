import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { events, eventRsvps, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(300).optional(),
  startTime: z.string().min(1),
  endTime: z.string().optional(),
  eventType: z.string().max(50).optional(),
  maxAttendees: z.number().int().positive().optional().nullable(),
  registrationUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const results = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
      isRecurring: events.isRecurring,
      recurrenceRule: events.recurrenceRule,
      eventType: events.eventType,
      imageUrl: events.imageUrl,
      maxAttendees: events.maxAttendees,
      registrationUrl: events.registrationUrl,
      groupId: events.groupId,
      createdBy: events.createdBy,
      createdAt: events.createdAt,
      rsvpCount: sql<number>`(
        select count(*)::int from event_rsvps
        where event_id = ${events.id}
      )`,
    })
    .from(events)
    .orderBy(desc(events.createdAt));

  return NextResponse.json({ events: results });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, location, startTime, endTime, eventType, maxAttendees, registrationUrl } = parsed.data;

  const [event] = await db
    .insert(events)
    .values({
      title,
      description: description ?? "",
      location: location ?? "",
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      eventType: eventType ?? "weekly",
      maxAttendees: maxAttendees ?? null,
      registrationUrl: registrationUrl ?? "",
      createdBy: userId,
    })
    .returning();

  return NextResponse.json({ event }, { status: 201 });
}
