export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, locations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminLocationList } from "./admin-location-list";

export default async function AdminLocationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const allLocations = await db
    .select()
    .from(locations)
    .orderBy(locations.createdAt);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Manage Locations</h1>
      <AdminLocationList locations={allLocations} />
    </div>
  );
}
