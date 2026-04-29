import Link from "next/link";
import { db } from "@/db";
import { events } from "@/db/schema";
import { gte, asc, desc, lt } from "drizzle-orm";
import { IssueKicker } from "@/components/public/issue-kicker";

export const metadata = {
  title: "Events — Acts 2028 Sheepdog Society",
  description:
    "Retreats, conferences, and the gatherings worth getting on a plane for.",
};

export default async function EventsIndexPage() {
  const now = new Date();
  let upcoming: Array<typeof events.$inferSelect> = [];
  let past: Array<typeof events.$inferSelect> = [];
  try {
    upcoming = await db
      .select()
      .from(events)
      .where(gte(events.startTime, now))
      .orderBy(asc(events.startTime));
    past = await db
      .select()
      .from(events)
      .where(lt(events.startTime, now))
      .orderBy(desc(events.startTime))
      .limit(6);
  } catch {
    upcoming = [];
    past = [];
  }

  return (
    <article className="px-6 pt-20 pb-24">
      <div className="mx-auto max-w-5xl">
        <IssueKicker parts={["Events"]} />
        <h1 className="mt-3 font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
          Gatherings worth showing up for.
        </h1>
        <p className="mt-6 font-pullquote italic text-xl md:text-2xl text-olive max-w-3xl leading-relaxed">
          Retreats, conferences, and weekends together. Where men sharpen men.
        </p>

        <Section title="Coming up" empty="Nothing scheduled yet — subscribe to the letter and we'll tell you the moment something is on the calendar.">
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </Section>

        {past.length > 0 ? (
          <Section title="Past events" empty="">
            {past.map((e) => (
              <EventCard key={e.id} event={e} muted />
            ))}
          </Section>
        ) : null}
      </div>
    </article>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const childArr = Array.isArray(children) ? children : [children];
  const hasContent = childArr.filter(Boolean).length > 0;
  return (
    <section className="mt-16 first:mt-12">
      <h2 className="font-display text-2xl font-semibold mb-6 pb-3 border-b border-stone">
        {title}
      </h2>
      {hasContent ? (
        <div className="space-y-6">{children}</div>
      ) : (
        <p className="font-body text-base text-olive">{empty}</p>
      )}
    </section>
  );
}

function EventCard({
  event,
  muted = false,
}: {
  event: typeof events.$inferSelect;
  muted?: boolean;
}) {
  const date = event.startTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <Link
      href={`/events/${event.id}`}
      className={`block border border-stone p-6 hover:border-iron transition-colors ${muted ? "opacity-70" : ""}`}
    >
      <p className="font-body uppercase tracking-[0.18em] text-xs text-brass">
        {date}
        {event.location ? ` · ${event.location}` : null}
      </p>
      <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">
        {event.title}
      </h3>
      {event.description ? (
        <p className="mt-3 font-body text-sm text-olive line-clamp-2">
          {event.description}
        </p>
      ) : null}
    </Link>
  );
}
