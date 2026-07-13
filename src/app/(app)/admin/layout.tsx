import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import {
  users,
  testimonies,
  locationRequests,
  contactSubmissions,
  locationInterests,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/admin/sign-in");

  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin") {
    redirect("/admin/sign-in");
  }

  const [pendingTestimoniesRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(testimonies)
    .where(eq(testimonies.isApproved, false));

  const [pendingRequestsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(locationRequests)
    .where(eq(locationRequests.status, "pending"));

  const [unreadInboxRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.isRead, false));

  const [newInterestsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(locationInterests)
    .where(eq(locationInterests.status, "new"));

  return (
    <AdminShell
      user={{
        id: me.id,
        name:
          me.firstName || me.lastName
            ? [me.firstName, me.lastName].filter(Boolean).join(" ")
            : null,
        email: me.email,
      }}
      pendingCount={unreadInboxRow?.count ?? 0}
      pendingTestimonies={pendingTestimoniesRow?.count ?? 0}
      pendingLocationRequests={pendingRequestsRow?.count ?? 0}
      pendingLocationInterests={newInterestsRow?.count ?? 0}
    >
      {children}
    </AdminShell>
  );
}
