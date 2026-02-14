import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, groups, groupMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PrayerWall } from "./prayer-wall";

export const dynamic = "force-dynamic";

export default async function PrayerPage() {
  const { userId } = await auth();
  const [user] = await db.select().from(users).where(eq(users.id, userId!));

  // Get user's groups for the privacy dropdown
  const myGroups = await db
    .select({ id: groups.id, name: groups.name })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId!));

  return <PrayerWall currentUser={user} myGroups={myGroups} />;
}
