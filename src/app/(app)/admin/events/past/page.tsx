import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, events } from "@/db/schema";
import { eq, desc, or, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PastEventsManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function AdminPastEventsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/admin/sign-in");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin") redirect("/admin/sign-in");

  // "Past" = is_past flag set OR end_time is in the past. Either qualifies.
  // Order by start_time desc so most-recent past events lead the list.
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
      eventType: events.eventType,
      isPast: events.isPast,
      recap: events.recap,
      photos: events.photos,
    })
    .from(events)
    .where(
      or(
        eq(events.isPast, true),
        lt(events.endTime, new Date())
      )
    )
    .orderBy(desc(events.startTime))
    .limit(200);

  return (
    <PastEventsManager
      initial={rows.map((r) => ({
        id: r.id,
        title: r.title,
        location: r.location ?? "",
        startTime: r.startTime.toISOString(),
        endTime: r.endTime?.toISOString() ?? null,
        eventType: r.eventType ?? "",
        isPast: r.isPast,
        recap: r.recap ?? "",
        photos: (r.photos as Array<{ url: string; alt?: string; caption?: string }> | null) ?? [],
      }))}
    />
  );
}
