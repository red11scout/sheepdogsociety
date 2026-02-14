import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/setup
 *
 * Promotes the currently logged-in user to admin.
 * Only works when there are NO existing admins in the database.
 * This is the "first user" bootstrap — once an admin exists, this endpoint is disabled.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // Check if any admin already exists
  const [existingAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  // System user doesn't count
  if (existingAdmin && existingAdmin.id !== "system") {
    return NextResponse.json(
      { error: "Admin already exists. This endpoint is disabled." },
      { status: 403 }
    );
  }

  // Promote current user
  const [updated] = await db
    .update(users)
    .set({
      role: "admin",
      status: "active",
      approvedBy: "system",
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "User not found. Sign up first, then call this endpoint." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message: `${updated.firstName} ${updated.lastName} is now admin`,
    user: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      status: updated.status,
    },
  });
}
