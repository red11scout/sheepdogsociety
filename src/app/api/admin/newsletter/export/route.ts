import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, newsletterSubscribers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const subscribers = await db
    .select({
      email: newsletterSubscribers.email,
      firstName: newsletterSubscribers.firstName,
      subscribedAt: newsletterSubscribers.subscribedAt,
    })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.isActive, true));

  const header = "email,firstName,subscribedAt";
  const rows = subscribers.map(
    (s) =>
      `"${(s.email ?? "").replace(/"/g, '""')}","${(s.firstName ?? "").replace(/"/g, '""')}","${s.subscribedAt?.toISOString() ?? ""}"`
  );
  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition":
        'attachment; filename="newsletter-subscribers.csv"',
    },
  });
}
