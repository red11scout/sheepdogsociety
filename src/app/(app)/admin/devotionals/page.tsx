export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, devotionals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminDevotionalList } from "./admin-devotional-list";

export default async function AdminDevotionalsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser || currentUser.role !== "admin") redirect("/");

  const allDevotionals = await db
    .select()
    .from(devotionals)
    .orderBy(desc(devotionals.date));

  return (
    <div className="mx-auto max-w-5xl p-6">
      <AdminDevotionalList initialDevotionals={allDevotionals} />
    </div>
  );
}
