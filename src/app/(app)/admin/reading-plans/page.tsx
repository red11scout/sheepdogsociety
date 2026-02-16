export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, readingPlans } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminReadingPlanManager } from "./admin-reading-plan-manager";

export default async function AdminReadingPlansPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser || currentUser.role !== "admin") redirect("/");

  const allPlans = await db
    .select()
    .from(readingPlans)
    .orderBy(desc(readingPlans.createdAt));

  return (
    <div className="mx-auto max-w-5xl p-6">
      <AdminReadingPlanManager initialPlans={allPlans} />
    </div>
  );
}
