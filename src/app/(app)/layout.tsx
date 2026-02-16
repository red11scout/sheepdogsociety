import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  // Webhook hasn't fired yet, or user not in DB
  if (!currentUser) redirect("/pending");

  // User exists but awaiting admin approval
  if (currentUser.status === "pending") redirect("/pending");

  return <AppShell user={currentUser}>{children}</AppShell>;
}
