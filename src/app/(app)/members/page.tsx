import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MemberDirectory } from "./member-directory";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const { userId } = await auth();

  const activeMembers = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.status, "active"));

  return <MemberDirectory members={activeMembers} currentUserId={userId!} />;
}
