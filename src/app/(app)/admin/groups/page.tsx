export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminGroupManager } from "./admin-group-manager";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";

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
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <AdminPageIntro
        kicker="Groups"
        title="Where men gather."
        description="Each group has a city, a leader, a meeting cadence. The locator pulls from this list. Leader email and phone stay private — never shown publicly."
        hint="Add a new group below. Required: name, city, state, latitude/longitude. Toggle Active to publish it. Capacity hits the soft cap and status flips to full automatically."
      />
      <AdminGroupManager availableUsers={activeUsers} />
    </div>
  );
}
