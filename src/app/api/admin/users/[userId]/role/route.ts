import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const roleSchema = z.object({
  role: z.enum(["admin", "group_leader", "asst_leader", "member"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: adminId } = await auth();
  if (!adminId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [adminUser] = await db.select().from(users).where(eq(users.id, adminId));
  if (!adminUser || adminUser.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  if (userId === adminId) {
    return Response.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set({ role: parsed.data.role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) return Response.json({ error: "User not found" }, { status: 404 });
  return Response.json({ user: updated });
}
