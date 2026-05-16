/**
 * Gallery data — wraps the existing events.photos jsonb so the public
 * /gallery surface and the unified admin /admin/gallery page share one
 * source of truth. No new tables; no migration.
 *
 * An "event with photos" = any events row whose photos jsonb has at
 * least one element. We surface BOTH past and upcoming, because the
 * gallery is a photo-first browse, not a calendar — a retreat last
 * Saturday should land in the gallery whether or not the admin has
 * flipped its is_past flag yet.
 */
import { db } from "@/db";
import { events } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export interface GalleryPhoto {
  url: string;
  alt?: string;
  caption?: string;
}

export interface GalleryEvent {
  id: string;
  title: string;
  description: string | null;
  recap: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date | null;
  eventType: string | null;
  photos: GalleryPhoto[];
}

/**
 * Every event with at least one photo, newest first. The gallery list
 * page uses this directly; each row becomes a card.
 */
export async function listEventsWithPhotos(): Promise<GalleryEvent[]> {
  try {
    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        recap: events.recap,
        location: events.location,
        startTime: events.startTime,
        endTime: events.endTime,
        eventType: events.eventType,
        photos: events.photos,
      })
      .from(events)
      // jsonb_array_length filters out events with empty/no photos.
      // COALESCE guards against rare null rows from older inserts.
      .where(sql`jsonb_array_length(coalesce(${events.photos}, '[]'::jsonb)) > 0`)
      .orderBy(desc(events.startTime))
      .limit(200);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      recap: r.recap,
      location: r.location,
      startTime: r.startTime,
      endTime: r.endTime,
      eventType: r.eventType,
      photos: (r.photos as GalleryPhoto[] | null) ?? [],
    }));
  } catch {
    return [];
  }
}

/**
 * Single event with photos. The gallery detail page + admin manager
 * both use this. Returns null when not found; the page calls notFound().
 */
export async function getGalleryEvent(id: string): Promise<GalleryEvent | null> {
  try {
    const [row] = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        recap: events.recap,
        location: events.location,
        startTime: events.startTime,
        endTime: events.endTime,
        eventType: events.eventType,
        photos: events.photos,
      })
      .from(events)
      .where(sql`${events.id} = ${id}`)
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      recap: row.recap,
      location: row.location,
      startTime: row.startTime,
      endTime: row.endTime,
      eventType: row.eventType,
      photos: (row.photos as GalleryPhoto[] | null) ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Every event (with or without photos), used by the admin gallery
 * manager so admin can pick an event to add photos to. Returns
 * lightweight rows; the detail page fetches full photo arrays.
 */
export async function listAllEventsForAdminGallery(): Promise<
  Array<{
    id: string;
    title: string;
    startTime: Date;
    location: string | null;
    eventType: string | null;
    description: string | null;
    photoCount: number;
  }>
> {
  try {
    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        startTime: events.startTime,
        location: events.location,
        eventType: events.eventType,
        description: events.description,
        photoCount: sql<number>`jsonb_array_length(coalesce(${events.photos}, '[]'::jsonb))::int`,
      })
      .from(events)
      .orderBy(desc(events.startTime))
      .limit(400);
    return rows;
  } catch {
    return [];
  }
}
