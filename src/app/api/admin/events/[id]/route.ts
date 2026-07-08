import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";

const photoSchema = z.object({
  url: z.string().min(1).max(2000),
  alt: z.string().max(200).optional(),
  caption: z.string().max(400).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  location: z.string().max(300).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional().nullable(),
  eventType: z.string().max(50).optional(),
  maxAttendees: z.number().int().positive().optional().nullable(),
  registrationUrl: z.string().url().optional().or(z.literal("")),
  // Past-event additions (migration 0011)
  isPast: z.boolean().optional(),
  // Series-instance addition (migration 0014)
  isCancelled: z.boolean().optional(),
  recap: z.string().max(20000).optional(),
  photos: z.array(photoSchema).max(60).optional(),
});

/**
 * GET — admin-only fetch of a single event row including photos.
 * The admin gallery manager calls this when the admin opens an event's
 * editor (the outer list only carries a photo count, not the full
 * jsonb, to keep the list payload light).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [row] = await db.select().from(events).where(eq(events.id, id));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ event: row });
}

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

  const [existing] = await db.select().from(events).where(eq(events.id, id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Series instances cannot be moved to another instant. Identical
  // instants (the gallery editor round-trips ISO strings) pass through.
  if (existing.seriesId && parsed.data.startTime !== undefined) {
    const incoming = new Date(parsed.data.startTime).getTime();
    if (Number.isNaN(incoming) || incoming !== existing.startTime.getTime()) {
      return NextResponse.json(
        {
          error:
            "This gathering is part of a series. Cancel this date and create a one-time event instead of moving it.",
        },
        { status: 400 }
      );
    }
  }

  const updates: Record<string, unknown> = {};

  // Content edits detach a series instance so series edits leave it be.
  // Detach fires only when a sent value actually differs from the row;
  // photos, recap, isPast, and isCancelled never detach.
  if (existing.seriesId) {
    const str = (v: string | null | undefined) => v ?? "";
    const p = parsed.data;
    let contentChanged = false;
    if (p.title !== undefined && p.title !== existing.title) contentChanged = true;
    if (p.description !== undefined && str(p.description) !== str(existing.description)) contentChanged = true;
    if (p.location !== undefined && str(p.location) !== str(existing.location)) contentChanged = true;
    if (p.eventType !== undefined && str(p.eventType) !== str(existing.eventType)) contentChanged = true;
    if (p.registrationUrl !== undefined && str(p.registrationUrl) !== str(existing.registrationUrl)) contentChanged = true;
    if (p.maxAttendees !== undefined && (p.maxAttendees ?? null) !== existing.maxAttendees) contentChanged = true;
    if (p.endTime !== undefined) {
      const incomingEnd = p.endTime ? new Date(p.endTime).getTime() : null;
      const existingEnd = existing.endTime ? existing.endTime.getTime() : null;
      if (incomingEnd !== existingEnd) contentChanged = true;
    }
    if (contentChanged) updates.isDetached = true;
  }
  if (parsed.data.isCancelled !== undefined) {
    updates.isCancelled = parsed.data.isCancelled;
  }
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.location !== undefined) updates.location = parsed.data.location;
  if (parsed.data.startTime !== undefined) updates.startTime = new Date(parsed.data.startTime);
  if (parsed.data.endTime !== undefined) updates.endTime = parsed.data.endTime ? new Date(parsed.data.endTime) : null;
  if (parsed.data.eventType !== undefined) updates.eventType = parsed.data.eventType;
  if (parsed.data.maxAttendees !== undefined) updates.maxAttendees = parsed.data.maxAttendees;
  if (parsed.data.registrationUrl !== undefined) updates.registrationUrl = parsed.data.registrationUrl;
  if (parsed.data.isPast !== undefined) updates.isPast = parsed.data.isPast;
  if (parsed.data.recap !== undefined) updates.recap = parsed.data.recap;
  if (parsed.data.photos !== undefined) updates.photos = parsed.data.photos;

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
