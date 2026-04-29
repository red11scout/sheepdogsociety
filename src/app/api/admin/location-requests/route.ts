import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, locationRequests } from "@/db/schema";
import { eq } from "drizzle-orm";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await db
    .select()
    .from(locationRequests)
    .orderBy(locationRequests.createdAt);

  return NextResponse.json({ requests });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status, notes } = await request.json();
  if (!id || !["approved", "declined"].includes(status)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await db
    .update(locationRequests)
    .set({
      status,
      notes: notes ?? "",
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    })
    .where(eq(locationRequests.id, id));

  return NextResponse.json({ success: true });
}
