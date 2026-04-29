import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, prayerRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const prayers = await db
    .select({
      id: prayerRequests.id,
      userId: prayerRequests.userId,
      title: prayerRequests.title,
      content: prayerRequests.content,
      privacyLevel: prayerRequests.privacyLevel,
      groupId: prayerRequests.groupId,
      status: prayerRequests.status,
      answeredAt: prayerRequests.answeredAt,
      createdAt: prayerRequests.createdAt,
      updatedAt: prayerRequests.updatedAt,
      authorFirstName: users.firstName,
      authorEmail: users.email,
    })
    .from(prayerRequests)
    .leftJoin(users, eq(prayerRequests.userId, users.id))
    .orderBy(desc(prayerRequests.createdAt));

  return NextResponse.json({ prayers });
}
