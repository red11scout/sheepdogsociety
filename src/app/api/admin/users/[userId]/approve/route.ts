import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: adminId } = await auth();
  if (!adminId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify requesting user is an admin
  const [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, adminId));

  if (!adminUser || adminUser.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const { action } = body; // "approve" or "reject"

  if (action === "approve") {
    await db
      .update(users)
      .set({
        status: "active",
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return Response.json({ success: true, status: "active" });
  }

  if (action === "reject") {
    await db
      .update(users)
      .set({
        status: "suspended",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return Response.json({ success: true, status: "suspended" });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
