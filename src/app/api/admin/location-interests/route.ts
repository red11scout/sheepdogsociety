import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, locationInterests, locations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { approveInterest } from "@/server/interest-approval";

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
      wantsNewsletter: locationInterests.wantsNewsletter,
      createdMemberId: locationInterests.createdMemberId,
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
  if (!id || !["new", "contacted", "approved", "resolved"].includes(status)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Approve populates the members database — see interest-approval.ts.
  if (status === "approved") {
    const [interest] = await db
      .select()
      .from(locationInterests)
      .where(eq(locationInterests.id, id));
    if (!interest) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const result = await approveInterest(interest);
    revalidatePath("/admin/members");
    revalidatePath("/admin/location-interests");
    return NextResponse.json({ success: true, memberId: result.memberId });
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
