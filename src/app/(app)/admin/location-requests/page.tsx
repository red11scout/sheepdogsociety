export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, locationRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminLocationRequests } from "./admin-location-requests";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";

export default async function AdminLocationRequestsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const requests = await db
    .select()
    .from(locationRequests)
    .orderBy(locationRequests.createdAt);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <AdminPageIntro
        kicker="Plant requests"
        title="Men asking to start a group."
        description="Each row is a man who filled out the start-a-group form. Pending = no one's looked yet. Reviewed = you've responded or moved them to vetting. Mark each as you go so the inbox count stays honest."
        hint="Click a request to see the city, contact details, and any note. Reach out by email or phone. The man's contact info stays private to admins."
      />
      <AdminLocationRequests requests={requests} />
    </div>
  );
}
