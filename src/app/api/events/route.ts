import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { events, eventRsvps, users } from "@/db/schema";
import { eq, desc, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  groupId: z.string().uuid().optional().nullable(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allEvents = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
      isRecurring: events.isRecurring,
      recurrenceRule: events.recurrenceRule,
      groupId: events.groupId,
      createdBy: events.createdBy,
      createdAt: events.createdAt,
      goingCount: sql<number>`(
        select count(*)::int from event_rsvps
        where event_id = ${events.id} and status = 'going'
      )`,
      maybeCount: sql<number>`(
        select count(*)::int from event_rsvps
        where event_id = ${events.id} and status = 'maybe'
      )`,
      userRsvp: sql<string | null>`(
        select status from event_rsvps
        where event_id = ${events.id} and user_id = ${userId}
        limit 1
      )`,
    })
    .from(events)
    .orderBy(events.startTime);

  return NextResponse.json({ events: allEvents });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (
    !user ||
    !["admin", "group_leader", "asst_leader"].includes(user.role)
  ) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [event] = await db
    .insert(events)
    .values({
      ...parsed.data,
      startTime: new Date(parsed.data.startTime),
      endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : null,
      groupId: parsed.data.groupId ?? null,
      createdBy: userId,
    })
    .returning();

  return NextResponse.json({ event }, { status: 201 });
}
