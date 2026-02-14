import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AccountabilityView } from "./accountability-view";

export const dynamic = "force-dynamic";

export default async function AccountabilityPage() {
  const { userId } = await auth();
  const [user] = await db.select().from(users).where(eq(users.id, userId!));

  // Get active members for partner selection
  const activeMembers = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.status, "active"));

  const others = activeMembers.filter((m) => m.id !== userId);

  return <AccountabilityView currentUser={user} members={others} />;
}
