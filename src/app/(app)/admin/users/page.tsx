export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminUserList } from "./admin-user-list";

export default async function AdminUsersPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/");
  }

  const allUsers = await db.select().from(users).orderBy(users.createdAt);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Manage Members</h1>
      <AdminUserList users={allUsers} currentUserId={userId} />
    </div>
  );
}
