export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, locationInterests, locations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminLocationInterests } from "./admin-location-interests";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";

export default async function AdminLocationInterestsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/");
  }

  const interests = await db
    .select({
      id: locationInterests.id,
      name: locationInterests.name,
      email: locationInterests.email,
      phone: locationInterests.phone,
      message: locationInterests.message,
      status: locationInterests.status,
      wantsNewsletter: locationInterests.wantsNewsletter,
      createdMemberId: locationInterests.createdMemberId,
      createdAt: locationInterests.createdAt,
      locationName: locations.name,
      locationCity: locations.city,
      locationState: locations.state,
    })
    .from(locationInterests)
    .leftJoin(locations, eq(locationInterests.locationId, locations.id))
    .orderBy(locationInterests.createdAt);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <AdminPageIntro
        kicker="Group interest"
        title="Men asking to join a group."
        description="Each row is a man from the /join form or a group's page. Approve to add him to the members database, assigned to his group. Contacted / resolved track the human follow-up."
        hint="When he picked a specific group, its leader already got an automatic intro email with his info. Approve is what moves him into Members."
      />
      <AdminLocationInterests interests={interests} />
    </div>
  );
}
