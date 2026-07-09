import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, locationInterests, locations } from "@/db/schema";
import { eq } from "drizzle-orm";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin") return null;
  return user;
}

async function listInterests() {
  return db
    .select({
      id: locationInterests.id,
      name: locationInterests.name,
      email: locationInterests.email,
      phone: locationInterests.phone,
      message: locationInterests.message,
      status: locationInterests.status,
      createdAt: locationInterests.createdAt,
      locationName: locations.name,
      locationCity: locations.city,
      locationState: locations.state,
    })
    .from(locationInterests)
    .leftJoin(locations, eq(locationInterests.locationId, locations.id))
    .orderBy(locationInterests.createdAt);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const interests = await listInterests();
  return NextResponse.json({ interests });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status } = await request.json();
  if (!id || !["new", "contacted", "resolved"].includes(status)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await db
    .update(locationInterests)
    .set({
      status,
      respondedAt: status === "new" ? null : new Date(),
    })
    .where(eq(locationInterests.id, id));

  return NextResponse.json({ success: true });
}
