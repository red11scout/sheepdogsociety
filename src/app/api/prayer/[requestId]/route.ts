import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { prayerRequests, prayerRequestPrayers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ requestId: string }> };

// Toggle "praying for you"
export async function POST(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId } = await params;

  // Check if already praying
  const [existing] = await db
    .select()
    .from(prayerRequestPrayers)
    .where(
      and(
        eq(prayerRequestPrayers.prayerRequestId, requestId),
        eq(prayerRequestPrayers.userId, userId)
      )
    );

  if (existing) {
    await db
      .delete(prayerRequestPrayers)
      .where(eq(prayerRequestPrayers.id, existing.id));
    return NextResponse.json({ praying: false });
  }

  await db.insert(prayerRequestPrayers).values({
    prayerRequestId: requestId,
    userId,
  });

  return NextResponse.json({ praying: true });
}

const updateSchema = z.object({
  status: z.enum(["active", "answered", "archived"]).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(2000).optional(),
});

// Update prayer request (author only)
export async function PATCH(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId } = await params;

  const [request] = await db
    .select()
    .from(prayerRequests)
    .where(eq(prayerRequests.id, requestId));

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (request.userId !== userId && user?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.status === "answered") {
    updates.answeredAt = new Date();
  }

  const [updated] = await db
    .update(prayerRequests)
    .set(updates)
    .where(eq(prayerRequests.id, requestId))
    .returning();

  return NextResponse.json({ request: updated });
}
