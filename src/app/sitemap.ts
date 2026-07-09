import type { MetadataRoute } from "next";
import { db } from "@/db";
import { events, locations, resources } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { listPublishedEncouragements } from "@/server/encouragements";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com";

export const revalidate = 3600;

/**
 * Canonical public URLs only — every legacy path (/locations*,
 * /encouragements*, /get-started, /groups/start) 308s via next.config.ts
 * and must NOT appear here. Each dynamic block degrades to nothing on a
 * DB hiccup so the sitemap never 500s.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/groups",
    "/events",
    "/letter",
    "/letter/archive",
    "/join",
    "/resources",
    "/about",
    "/stories",
    "/how-we-gather",
    "/what-to-expect",
    "/faq",
    "/contact",
    "/acts-20-28",
    "/giving",
    "/partnerships",
    "/privacy",
    "/sms-terms",
  ].map((p) => ({ url: `${SITE}${p}`, lastModified: now }));

  let groupRoutes: MetadataRoute.Sitemap = [];
  try {
    // Intersection of BOTH visibility gates: the /groups list shows
    // displayedOnMap+isActive, but the detail page 404s unless
    // status='active' (preserved gate mismatch, Task 4 Interfaces).
    // A sitemap row must satisfy the DETAIL gate or crawlers get 404s.
    const rows = await db
      .select({ id: locations.id, slug: locations.slug, updatedAt: locations.updatedAt })
      .from(locations)
      .where(
        and(
          eq(locations.displayedOnMap, true),
          eq(locations.isActive, true),
          eq(locations.status, "active")
        )
      );
    groupRoutes = rows.map((r) => ({
      url: `${SITE}/groups/${r.slug ?? r.id}`,
      lastModified: r.updatedAt ?? now,
    }));
  } catch {
    /* degrade to static routes */
  }

  let letterRoutes: MetadataRoute.Sitemap = [];
  try {
    const rows = await listPublishedEncouragements();
    letterRoutes = rows.map((r) => ({
      url: `${SITE}/letter/${r.slug}`,
      lastModified: r.publishDate ? new Date(r.publishDate) : now,
    }));
  } catch {
    /* degrade */
  }

  let eventRoutes: MetadataRoute.Sitemap = [];
  try {
    const rows = await db
      .select({ id: events.id, startTime: events.startTime })
      .from(events)
      .where(eq(events.isCancelled, false))
      .orderBy(desc(events.startTime))
      .limit(100);
    eventRoutes = rows.map((r) => ({
      url: `${SITE}/events/${r.id}`,
      lastModified: r.startTime,
    }));
  } catch {
    /* degrade */
  }

  let resourceRoutes: MetadataRoute.Sitemap = [];
  try {
    // isPublic=true is the /resources list gate, and a strict subset of what
    // the detail page serves (getPublicResourceBySlug filters on slug only),
    // so nothing listed here can 404. Soft delete sets isPublic=false, so
    // deleted rows are excluded by the same predicate.
    const rows = await db
      .select({ slug: resources.slug, createdAt: resources.createdAt })
      .from(resources)
      .where(eq(resources.isPublic, true));
    resourceRoutes = rows.map((r) => ({
      url: `${SITE}/resources/${r.slug}`,
      lastModified: r.createdAt ?? now,
    }));
  } catch {
    /* degrade */
  }

  return [
    ...staticRoutes,
    ...groupRoutes,
    ...letterRoutes,
    ...eventRoutes,
    ...resourceRoutes,
  ];
}
