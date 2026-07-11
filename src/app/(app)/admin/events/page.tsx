export const dynamic = "force-dynamic";

import { db } from "@/db";
import { events } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { EventsManager, type EventItem } from "./events-manager";

export default async function AdminEventsPage() {
  // Same query the /api/admin/events GET runs (incl. the rsvpCount
  // subquery + createdAt ordering); dates serialized to ISO strings to
  // match the JSON shape the client previously fetched.
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
      isRecurring: events.isRecurring,
      recurrenceRule: events.recurrenceRule,
      eventType: events.eventType,
      imageUrl: events.imageUrl,
      maxAttendees: events.maxAttendees,
      registrationUrl: events.registrationUrl,
      groupId: events.groupId,
      seriesId: events.seriesId,
      isCancelled: events.isCancelled,
      createdBy: events.createdBy,
      createdAt: events.createdAt,
      rsvpCount: sql<number>`(
        select count(*)::int from event_rsvps
        where event_id = ${events.id}
      )`,
    })
    .from(events)
    .orderBy(desc(events.createdAt));

  const initialEvents: EventItem[] = rows.map((r) => ({
    ...r,
    startTime: r.startTime.toISOString(),
    endTime: r.endTime ? r.endTime.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return <EventsManager initialEvents={initialEvents} />;
}
