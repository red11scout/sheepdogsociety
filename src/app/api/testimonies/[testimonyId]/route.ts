import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { testimonies, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ testimonyId: string }> };

const updateSchema = z.object({
  isApproved: z.boolean().optional(),
});

// Admin approval
export async function PATCH(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { testimonyId } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.isApproved !== undefined) {
    updates.isApproved = parsed.data.isApproved;
    updates.approvedBy = userId;
    updates.approvedAt = new Date();
  }

  const [updated] = await db
    .update(testimonies)
    .set(updates)
    .where(eq(testimonies.id, testimonyId))
    .returning();

  return NextResponse.json({ testimony: updated });
}
