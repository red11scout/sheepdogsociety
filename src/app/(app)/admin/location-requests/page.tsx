export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, locationRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminLocationRequests } from "./admin-location-requests";

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
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Location Requests</h1>
      <AdminLocationRequests requests={requests} />
    </div>
  );
}
