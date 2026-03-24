import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, prayerRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  status: z.enum(["active", "answered", "archived"]).optional(),
  answeredAt: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
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

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status) updateData.status = parsed.data.status;
  if (parsed.data.answeredAt !== undefined) {
    updateData.answeredAt = parsed.data.answeredAt
      ? new Date(parsed.data.answeredAt)
      : null;
  }

  const [updated] = await db
    .update(prayerRequests)
    .set(updateData)
    .where(eq(prayerRequests.id, id))
    .returning();

  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ prayer: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [deleted] = await db
    .delete(prayerRequests)
    .where(eq(prayerRequests.id, id))
    .returning();

  if (!deleted)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
