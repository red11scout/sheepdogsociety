import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/db";
import { events, eventSeries } from "@/db/schema";
import { and, asc, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { Icon } from "@/components/icons/Icon";
import { format } from "date-fns";
import { cadenceLabel, type SeriesCadence } from "@/lib/events/series";
import { Kicker } from "@/components/public/kicker";
import { StaggerReveal } from "@/components/motion/StaggerReveal";
import { getSiteTextMap } from "@/lib/site-text/get";
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge } from "@/lib/studio/config";

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
        seriesId: events.seriesId,
        seriesCadence: eventSeries.cadence,
        seriesDayOfWeek: eventSeries.dayOfWeek,
        seriesNthWeek: eventSeries.nthWeek,
      })
      .from(events)
      .leftJoin(eventSeries, eq(events.seriesId, eventSeries.id))
      .where(
        and(
          gte(events.startTime, now),
          eq(events.isPast, false),
          eq(events.isCancelled, false)
        )
      )
      .orderBy(asc(events.startTime))
      .limit(60);
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
          eq(events.isCancelled, false),
          or(
            eq(events.isPast, true),
            lt(events.endTime, new Date()),
            and(isNull(events.endTime), lt(events.startTime, new Date()))
          ),
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

type UpcomingRow = Awaited<ReturnType<typeof getUpcoming>>[number];

type UpcomingItem =
  | { kind: "single"; row: UpcomingRow }
  | { kind: "series"; row: UpcomingRow; later: UpcomingRow[]; label: string };

/**
 * One card per series (its next date leads; the rest fold under it),
 * one-time gatherings as-is. Rows arrive sorted by startTime so the
 * first row seen for a series is its next date, and overall order
 * stays chronological.
 */
function groupUpcoming(rows: UpcomingRow[]): UpcomingItem[] {
  const bySeries = new Map<string, UpcomingRow[]>();
  const items: UpcomingItem[] = [];
  for (const row of rows) {
    if (!row.seriesId) {
      items.push({ kind: "single", row });
      continue;
    }
    const bucket = bySeries.get(row.seriesId);
    if (bucket) {
      bucket.push(row);
      continue;
    }
    bySeries.set(row.seriesId, [row]);
    items.push({
      kind: "series",
      row,
      later: [],
      label: row.seriesCadence
        ? cadenceLabel({
            cadence: row.seriesCadence as SeriesCadence,
            dayOfWeek: row.seriesDayOfWeek ?? 0,
            nthWeek: row.seriesNthWeek,
          })
        : "Recurring",
    });
  }
  return items.map((it) =>
    it.kind === "series"
      ? { ...it, later: (bySeries.get(it.row.seriesId as string) ?? []).slice(1) }
      : it
  );
}

export default async function EventsPage() {
  const [upcoming, past, t, config] = await Promise.all([
    getUpcoming(),
    getPast(),
    getSiteTextMap(),
    getStudioConfig(),
  ]);
  const upcomingItems = groupUpcoming(upcoming);

  const sections: Record<string, React.ReactNode> = {
    hero: (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 md:px-10 md:pt-24">
          <Kicker left="Gatherings" right="Come once · Come often" />
          <h1 className="display-xl mt-10 text-display-xl">
            {t["events.hero.headline1"]}
            <br />
            <em>{t["events.hero.headline2"]}</em>
          </h1>
          <p className="mt-8 max-w-2xl font-pullquote text-lede italic text-muted-foreground">
            Weekly tables. Monthly breakfasts. Prayer nights. Camping. The
            calendar below is what is on the books.
          </p>
        </div>
      </section>
    ),
    // When nothing is on the books, the whole Upcoming section is hidden
    // (no "Upcoming" heading, no empty-state box) so the page just shows
    // past gatherings.
    upcoming: upcomingItems.length > 0 ? (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
          <Kicker left="Upcoming" />

          <ul className="mt-10 divide-y divide-foreground/10 border-y border-foreground/15">
              {upcomingItems.map((item) => {
                const ev = item.row;
                const start = new Date(ev.startTime);
                return (
                  <li key={ev.id}>
                    <Link
                      href={`/events/${ev.id}`}
                      className="group grid cursor-pointer gap-4 py-8 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[140px_1fr_auto] md:items-start md:gap-8"
                    >
                      <div className="flex items-baseline gap-3 md:flex-col md:items-start md:gap-1">
                        <span className="display-xl text-3xl text-brass-deep">
                          {format(start, "MMM")}
                        </span>
                        <span className="display-xl text-3xl">
                          {format(start, "d")}
                        </span>
                      </div>
                      <div>
                        <span className="flex flex-wrap items-center gap-3">
                          {item.kind === "series" && (
                            <span className="section-mark">{item.label}</span>
                          )}
                          {ev.eventType && (
                            <span className="section-mark text-muted-foreground">
                              {ev.eventType}
                            </span>
                          )}
                        </span>
                        <h3 className="mt-2 font-display text-xl transition-colors group-hover:text-brass md:text-2xl">
                          {ev.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
                          <p className="mt-3 max-w-prose text-foreground/70">
                            {ev.description}
                          </p>
                        )}
                      </div>
                      <span className="section-mark text-muted-foreground transition-colors group-hover:text-brass">
                        Details →
                      </span>
                    </Link>
                    {item.kind === "series" && item.later.length > 0 && (
                      <details className="-mt-4 pb-6 pl-4 md:pl-[172px]">
                        <summary className="section-mark cursor-pointer list-none transition-colors hover:text-brass">
                          + {item.later.length} more date
                          {item.later.length === 1 ? "" : "s"}
                        </summary>
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                          {item.later.map((r) => (
                            <li key={r.id}>
                              <Link
                                href={`/events/${r.id}`}
                                className="transition-colors hover:text-brass"
                              >
                                {format(new Date(r.startTime), "EEEE, MMMM d · h:mm a")}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
        </div>
      </section>
    ) : null,
    "past-gatherings": past.length > 0 ? (
      <section className="bg-background text-foreground">
          <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
            <Kicker left="Past gatherings" />
            <p className="mt-4 max-w-2xl font-pullquote text-lg italic text-muted-foreground">
              The brothers who showed up, and what they came home with.
            </p>
            <StaggerReveal
              className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              selector=":scope > a"
            >
              {past.map((ev) => {
                const photos =
                  (ev.photos as Array<{ url: string; alt?: string; caption?: string }> | null) ??
                  [];
                const cover = photos[0];
                const start = new Date(ev.startTime);
                return (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="paper-card lift group/past block overflow-hidden"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-foreground/5">
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
                        <div className="flex h-full items-center justify-center text-foreground/25">
                          <Icon name="calendar" size={48} />
                        </div>
                      )}
                      {photos.length > 0 && (
                        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex h-6 items-center gap-1 bg-foreground/85 px-2 text-[0.625rem] uppercase tracking-[0.14em] text-background">
                          <Icon name="image" size={10} />
                          {photos.length} photo{photos.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="folio">
                        {format(start, "MMMM d, yyyy")}
                        {ev.eventType && <> · {ev.eventType}</>}
                      </p>
                      <h3 className="mt-2 font-display text-xl transition-colors group-hover/past:text-brass">
                        {ev.title}
                      </h3>
                      {ev.recap && (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {ev.recap}
                        </p>
                      )}
                      <p className="section-mark mt-4 inline-flex items-center gap-2">
                        See the night
                        <Icon
                          name="arrow-right"
                          size={12}
                          className="transition-transform group-hover/past:translate-x-1"
                        />
                      </p>
                    </div>
                  </Link>
                );
              })}
            </StaggerReveal>
          </div>
        </section>
      ) : null,
  };

  return (
    <>
      {renderMerge("events", config)
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{sections[s.id]}</Fragment>
        ))}
    </>
  );
}
