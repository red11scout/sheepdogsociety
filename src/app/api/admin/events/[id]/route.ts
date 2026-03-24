import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  location: z.string().max(300).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional().nullable(),
  eventType: z.string().max(50).optional(),
  maxAttendees: z.number().int().positive().optional().nullable(),
  registrationUrl: z.string().url().optional().or(z.literal("")),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.location !== undefined) updates.location = parsed.data.location;
  if (parsed.data.startTime !== undefined) updates.startTime = new Date(parsed.data.startTime);
  if (parsed.data.endTime !== undefined) updates.endTime = parsed.data.endTime ? new Date(parsed.data.endTime) : null;
  if (parsed.data.eventType !== undefined) updates.eventType = parsed.data.eventType;
  if (parsed.data.maxAttendees !== undefined) updates.maxAttendees = parsed.data.maxAttendees;
  if (parsed.data.registrationUrl !== undefined) updates.registrationUrl = parsed.data.registrationUrl;

  const [event] = await db
    .update(events)
    .set(updates)
    .where(eq(events.id, id))
    .returning();

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [deleted] = await db
    .delete(events)
    .where(eq(events.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
