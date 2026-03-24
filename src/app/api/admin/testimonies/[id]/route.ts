import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { testimonies, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";

const updateSchema = z.object({
  isApproved: z.boolean().optional(),
  approvedBy: z.string().optional().nullable(),
  approvedAt: z.string().optional().nullable(),
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
  if (parsed.data.isApproved !== undefined) updates.isApproved = parsed.data.isApproved;
  if (parsed.data.approvedBy !== undefined) updates.approvedBy = parsed.data.approvedBy;
  if (parsed.data.approvedAt !== undefined)
    updates.approvedAt = parsed.data.approvedAt ? new Date(parsed.data.approvedAt) : null;

  const [testimony] = await db
    .update(testimonies)
    .set(updates)
    .where(eq(testimonies.id, id))
    .returning();

  if (!testimony) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ testimony });
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
    .delete(testimonies)
    .where(eq(testimonies.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
