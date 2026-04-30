import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { events } from "@/db/schema";
import { asc, gte } from "drizzle-orm";
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
      .where(gte(events.startTime, now))
      .orderBy(asc(events.startTime))
      .limit(24);
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const upcoming = await getUpcoming();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-iron text-bone">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Gatherings</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 text-[clamp(2.25rem,6vw,5rem)] text-bone">
            Bring a brother.
            <br />
            <span className="text-brass">Bring a friend.</span>
          </h1>
          <p className="mt-8 max-w-2xl font-pullquote text-xl italic text-bone/80 md:text-2xl">
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
                      className="group grid gap-4 py-8 transition-colors hover:bg-iron/[0.02] md:grid-cols-[140px_1fr_auto] md:items-start md:gap-8"
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
    </>
  );
}
