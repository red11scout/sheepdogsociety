export const dynamic = "force-dynamic";

import { db } from "@/db";
import { prayerRequests, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { PrayerList, type Prayer } from "./prayer-list";

export default async function AdminPrayerPage() {
  // Same query the /api/admin/prayer GET runs (incl. the users left
  // join for author fields); dates serialized to ISO strings to match
  // the JSON shape the client previously fetched.
  const rows = await db
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

  const initialPrayers: Prayer[] = rows.map((r) => ({
    ...r,
    answeredAt: r.answeredAt ? r.answeredAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return <PrayerList initialPrayers={initialPrayers} />;
}
