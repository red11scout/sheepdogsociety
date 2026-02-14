import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GroupDetail } from "./group-detail";

export const dynamic = "force-dynamic";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { userId } = await auth();
  const [user] = await db.select().from(users).where(eq(users.id, userId!));
  const { groupId } = await params;

  return <GroupDetail groupId={groupId} currentUser={user} />;
}
