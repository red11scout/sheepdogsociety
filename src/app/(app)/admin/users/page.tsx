export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminUserList } from "./admin-user-list";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";

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
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <AdminPageIntro
        kicker="Admins"
        title="Who can sign in to this cockpit."
        description="Three tabs: Pending, Active, Suspended. Pending = invited but not yet signed in. Active = signed in at least once and approved. Suspended = revoked, can't sign in."
        hint="Members of the public never log in. This list is admins only — the people who can edit content, approve testimonies, and manage groups."
      />
      <AdminUserList users={allUsers} currentUserId={userId} />
    </div>
  );
}
