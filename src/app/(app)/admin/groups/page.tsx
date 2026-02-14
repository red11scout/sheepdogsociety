export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminGroupManager } from "./admin-group-manager";

export default async function AdminGroupsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
  if (!currentUser || currentUser.role !== "admin") redirect("/");

  const activeUsers = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(users)
    .where(eq(users.status, "active"));

  return (
    <div className="mx-auto max-w-5xl p-6">
      <AdminGroupManager availableUsers={activeUsers} />
    </div>
  );
}
