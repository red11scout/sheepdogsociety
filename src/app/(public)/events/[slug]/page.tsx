import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { IssueKicker } from "@/components/public/issue-kicker";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  let event: typeof events.$inferSelect | undefined;
  try {
    [event] = await db.select().from(events).where(eq(events.id, slug)).limit(1);
  } catch {
    event = undefined;
  }
  if (!event) notFound();

  const date = event.startTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = event.startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <article className="px-6 pt-16 pb-24">
      <div className="mx-auto max-w-3xl">
        <IssueKicker parts={["Event", date, event.location || null]} />
        <h1 className="mt-4 font-display text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
          {event.title}
        </h1>

        <section className="mt-10 grid sm:grid-cols-3 gap-6 border-y border-stone py-8">
          <Detail label="When" value={`${date} at ${time}`} />
          <Detail label="Where" value={event.location} />
          {event.maxAttendees ? (
            <Detail label="Capacity" value={`${event.maxAttendees} max`} />
          ) : null}
        </section>

        {event.description ? (
          <p className="mt-10 font-body text-[19px] leading-[1.65] whitespace-pre-line">
            {event.description}
          </p>
        ) : null}

        {event.registrationUrl ? (
          <div className="mt-10">
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-iron px-7 py-3 font-body font-semibold text-bone hover:bg-navy transition-colors"
            >
              Register →
            </a>
          </div>
        ) : null}

        <footer className="mt-16 pt-8 border-t border-stone">
          <Link
            href="/events"
            className="font-body text-sm text-brass hover:text-iron underline underline-offset-4"
          >
            ← All events
          </Link>
        </footer>
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="font-body uppercase tracking-[0.18em] text-xs text-brass mb-1">
        {label}
      </p>
      <p className="font-body text-base text-iron">{value}</p>
    </div>
  );
}
