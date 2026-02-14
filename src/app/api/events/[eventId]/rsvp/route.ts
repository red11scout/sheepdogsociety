import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { eventRsvps } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ eventId: string }> };

const rsvpSchema = z.object({
  status: z.enum(["going", "maybe", "declined"]),
});

export async function POST(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const body = await req.json();
  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Upsert RSVP
  const [existing] = await db
    .select()
    .from(eventRsvps)
    .where(
      and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId))
    );

  if (existing) {
    const [updated] = await db
      .update(eventRsvps)
      .set({ status: parsed.data.status })
      .where(eq(eventRsvps.id, existing.id))
      .returning();
    return NextResponse.json({ rsvp: updated });
  }

  const [rsvp] = await db
    .insert(eventRsvps)
    .values({
      eventId,
      userId,
      status: parsed.data.status,
    })
    .returning();

  return NextResponse.json({ rsvp }, { status: 201 });
}
