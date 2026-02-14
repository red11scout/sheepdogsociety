import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BlogList } from "./blog-list";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const { userId } = await auth();
  const [user] = await db.select().from(users).where(eq(users.id, userId!));

  return <BlogList currentUser={user} />;
}
