import type { MetadataRoute } from "next";
import { db } from "@/db";
import { letters, devotionals, locations, events, resources, blogPosts } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com";

export const revalidate = 3600; // hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/contact",
    "/get-started",
    "/giving",
    "/faq",
    "/how-we-gather",
    "/partnerships",
    "/stories",
    "/scripture-reader",
    "/daily-scripture",
    "/locations",
    "/locations/request",
    "/letter",
    "/letter/archive",
    "/devotionals",
    "/groups",
    "/groups/start",
    "/events",
    "/resources",
    "/subscribe",
    "/merch",
    "/statement-of-faith",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? ("daily" as const) : ("weekly" as const),
    priority: path === "" ? 1.0 : 0.7,
  }));

  // Dynamic routes — wrapped in try/catch so a DB outage doesn't kill the sitemap.
  const dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const [publishedLetters, publishedDevotionals, activeLocations, allEvents, allResources, publishedBlog] = await Promise.all([
      db
        .select({ slug: letters.slug, updatedAt: letters.updatedAt })
        .from(letters)
        .where(and(eq(letters.status, "published"), isNull(letters.deletedAt))),
      db
        .select({ slug: devotionals.id, updatedAt: devotionals.createdAt })
        .from(devotionals)
        .where(eq(devotionals.isApproved, true)),
      db
        .select({ id: locations.id, updatedAt: locations.updatedAt })
        .from(locations)
        .where(eq(locations.status, "active")),
      db
        .select({ id: events.id, updatedAt: events.createdAt })
        .from(events),
      db
        .select({ id: resources.id, updatedAt: resources.createdAt })
        .from(resources),
      db
        .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
        .from(blogPosts)
        .where(eq(blogPosts.status, "published")),
    ]);

    for (const l of publishedLetters) {
      dynamicRoutes.push({
        url: `${SITE_URL}/letter/${l.slug}`,
        lastModified: l.updatedAt,
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }
    for (const d of publishedDevotionals) {
      dynamicRoutes.push({
        url: `${SITE_URL}/devotionals/${d.slug}`,
        lastModified: d.updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
    for (const loc of activeLocations) {
      dynamicRoutes.push({
        url: `${SITE_URL}/groups/${loc.id}`,
        lastModified: loc.updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
      });
      dynamicRoutes.push({
        url: `${SITE_URL}/locations/${loc.id}`,
        lastModified: loc.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
    for (const ev of allEvents) {
      dynamicRoutes.push({
        url: `${SITE_URL}/events/${ev.id}`,
        lastModified: ev.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
    for (const r of allResources) {
      dynamicRoutes.push({
        url: `${SITE_URL}/resources/${r.id}`,
        lastModified: r.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
    for (const post of publishedBlog) {
      dynamicRoutes.push({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // DB unreachable during build → return only static routes.
  }

  return [...staticRoutes, ...dynamicRoutes];
}
