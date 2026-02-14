import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TestimoniesWall } from "./testimonies-wall";

export const dynamic = "force-dynamic";

export default async function TestimoniesPage() {
  const { userId } = await auth();
  const [user] = await db.select().from(users).where(eq(users.id, userId!));

  return <TestimoniesWall currentUser={user} />;
}
