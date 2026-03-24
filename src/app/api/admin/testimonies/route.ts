import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { testimonies, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const results = await db
    .select({
      id: testimonies.id,
      title: testimonies.title,
      content: testimonies.content,
      isApproved: testimonies.isApproved,
      approvedBy: testimonies.approvedBy,
      approvedAt: testimonies.approvedAt,
      createdAt: testimonies.createdAt,
      userId: testimonies.userId,
      authorFirstName: users.firstName,
      authorEmail: users.email,
    })
    .from(testimonies)
    .leftJoin(users, eq(testimonies.userId, users.id))
    .orderBy(desc(testimonies.createdAt));

  return NextResponse.json({ testimonies: results });
}
