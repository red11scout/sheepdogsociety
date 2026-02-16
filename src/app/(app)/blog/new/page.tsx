import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { BlogEditor } from "../blog-editor";

export const dynamic = "force-dynamic";

export default async function NewBlogPostPage() {
  const { userId } = await auth();
  const [user] = await db.select().from(users).where(eq(users.id, userId!));

  if (!user || user.role !== "admin") {
    redirect("/blog");
  }

  return <BlogEditor />;
}
