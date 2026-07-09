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
    redirect("/dashboard");
  }

  const interests = await db
    .select({
      id: locationInterests.id,
      name: locationInterests.name,
      email: locationInterests.email,
      phone: locationInterests.phone,
      message: locationInterests.message,
      status: locationInterests.status,
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
        title="Men who raised a hand on a group's page."
        description="Each row is a man who clicked 'I'm interested' on a specific group. New = no one's reached out. Contacted = you or the leader followed up. Resolved = it's settled either way."
        hint="The leader already has this man's info in the notification email. Use this page to track whether anyone actually followed up."
      />
      <AdminLocationInterests interests={interests} />
    </div>
  );
}
