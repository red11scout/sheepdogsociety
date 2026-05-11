import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/db";
import { events } from "@/db/schema";
import { and, asc, desc, eq, gte, lt, or, sql } from "drizzle-orm";
import { Icon } from "@/components/icons/Icon";
import { format } from "date-fns";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Gatherings — Sheepdog Society",
  description:
    "Breakfasts, prayer nights, leader huddles, service days. Come once. Come often.",
};

async function getUpcoming() {
  try {
    const now = new Date();
    return await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        location: events.location,
        startTime: events.startTime,
        endTime: events.endTime,
        eventType: events.eventType,
        imageUrl: events.imageUrl,
        registrationUrl: events.registrationUrl,
      })
      .from(events)
      .where(and(gte(events.startTime, now), eq(events.isPast, false)))
      .orderBy(asc(events.startTime))
      .limit(24);
  } catch {
    return [];
  }
}

/**
 * Past events that have either a recap or photos. Anything older without
 * either is still in the DB but not surfaced — admins might not have
 * gotten around to writing it up yet.
 */
async function getPast() {
  try {
    return await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        location: events.location,
        startTime: events.startTime,
        endTime: events.endTime,
        eventType: events.eventType,
        recap: events.recap,
        photos: events.photos,
      })
      .from(events)
      .where(
        and(
          or(eq(events.isPast, true), lt(events.endTime, new Date())),
          or(
            sql`length(coalesce(${events.recap}, '')) > 0`,
            sql`jsonb_array_length(coalesce(${events.photos}, '[]'::jsonb)) > 0`
          )
        )
      )
      .orderBy(desc(events.startTime))
      .limit(24);
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([getUpcoming(), getPast()]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-background text-foreground">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Gatherings</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 text-[clamp(2.25rem,6vw,5rem)] text-foreground">
            Bring a brother.
            <br />
            <span className="text-brass">Bring a friend.</span>
          </h1>
          <p className="mt-8 max-w-2xl font-pullquote text-xl italic text-foreground/80 md:text-2xl">
            Weekly tables. Monthly breakfasts. Prayer nights. Camping. The
            calendar below is what is on the books.
          </p>
        </div>
      </section>

      {/* List */}
      <section className="bg-bone">
        <div className="mx-auto max-w-5xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark text-brass">§ Upcoming</span>
            <div className="hairline flex-1 text-iron/40" />
          </div>

          {upcoming.length > 0 ? (
            <ul className="mt-12 divide-y divide-iron/10 border-y border-iron/10">
              {upcoming.map((ev) => {
                const start = new Date(ev.startTime);
                return (
                  <li key={ev.id}>
                    <Link
                      href={`/events/${ev.id}`}
                      className="group grid gap-4 py-8 transition-colors hover:bg-background/[0.02] md:grid-cols-[140px_1fr_auto] md:items-start md:gap-8"
                    >
                      <div className="flex items-baseline gap-3 md:flex-col md:items-start md:gap-1">
                        <span className="font-display text-3xl font-semibold text-brass">
                          {format(start, "MMM").toUpperCase()}
                        </span>
                        <span className="font-display text-3xl font-semibold text-iron">
                          {format(start, "d")}
                        </span>
                      </div>
                      <div>
                        {ev.eventType && (
                          <span className="section-mark text-brass">
                            {ev.eventType}
                          </span>
                        )}
                        <h3 className="mt-2 font-display text-xl font-semibold text-iron group-hover:text-brass md:text-2xl">
                          {ev.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-iron/60">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="clock" size={14} />
                            {format(start, "EEEE · h:mm a")}
                          </span>
                          {ev.location && (
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="map-pin" size={14} />
                              {ev.location}
                            </span>
                          )}
                        </div>
                        {ev.description && (
                          <p className="mt-3 max-w-prose text-iron/70">
                            {ev.description}
                          </p>
                        )}
                      </div>
                      <span className="section-mark text-iron/40 group-hover:text-brass">
                        Details →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-12 border border-dashed border-iron/15 p-12 text-center">
              <Icon
                name="calendar"
                size={32}
                className="mx-auto text-iron/30"
              />
              <p className="mt-4 font-pullquote text-xl italic text-iron/60">
                No gatherings on the books yet.
              </p>
              <p className="mt-3 text-iron/60">
                Check back soon, or{" "}
                <Link
                  href="/locations"
                  className="text-brass underline decoration-brass/40 underline-offset-4 hover:text-gold"
                >
                  find a weekly group
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Past Events — only renders sections with at least one recap'd event */}
      {past.length > 0 && (
        <section className="bg-bone">
          <div className="mx-auto max-w-7xl px-6 pb-24 md:px-12 md:pb-32">
            <div className="flex items-center gap-4">
              <span className="section-mark text-brass">§ Past gatherings</span>
              <div className="hairline flex-1 text-iron/40" />
            </div>
            <p className="mt-4 max-w-2xl font-pullquote text-lg italic text-iron/60">
              The brothers who showed up, and what they came home with.
            </p>
            <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {past.map((ev) => {
                const photos = (ev.photos as Array<{ url: string; alt?: string; caption?: string }> | null) ?? [];
                const cover = photos[0];
                const start = new Date(ev.startTime);
                return (
                  <li key={ev.id}>
                    <Link
                      href={`/events/${ev.id}`}
                      className="lift group/past block border border-iron/10 bg-bone transition-colors hover:border-brass"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-iron/5">
                        {cover ? (
                          <Image
                            src={cover.url}
                            alt={cover.alt ?? ev.title}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="object-cover transition-transform duration-500 group-hover/past:scale-[1.03]"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-iron/25">
                            <Icon name="calendar" size={48} />
                          </div>
                        )}
                        {photos.length > 1 && (
                          <span className="pointer-events-none absolute bottom-3 right-3 inline-flex h-6 items-center gap-1 bg-iron/85 px-2 text-[0.625rem] font-medium text-bone backdrop-blur-sm">
                            <Icon name="image" size={10} />
                            {photos.length} photos
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <p className="section-mark text-iron/55">
                          {format(start, "MMMM d, yyyy")}
                          {ev.eventType && <> · {ev.eventType}</>}
                        </p>
                        <h3 className="display-xl mt-2 text-lg text-iron group-hover/past:text-brass md:text-xl">
                          {ev.title}
                        </h3>
                        {ev.recap && (
                          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-iron/70">
                            {ev.recap}
                          </p>
                        )}
                        <p className="mt-4 inline-flex items-center gap-2 section-mark text-brass">
                          See the night
                          <Icon
                            name="arrow-right"
                            size={12}
                            className="transition-transform group-hover/past:translate-x-1"
                          />
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
