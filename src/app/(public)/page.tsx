import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/db";
import { events, eventSeries, testimonies, users } from "@/db/schema";
import { and, asc, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { format } from "date-fns";
import { Icon } from "@/components/icons/Icon";
import { Kicker } from "@/components/public/kicker";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerReveal } from "@/components/motion/StaggerReveal";
import { NewsletterForm } from "@/components/public/newsletter-form";
import { LetterCover } from "@/components/letters/LetterCover";
import { listPublishedEncouragements } from "@/server/encouragements";
import { cadenceLabel, type SeriesCadence } from "@/lib/events/series";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sheepdog Society — Acts 20:28",
  description:
    "Find your brothers. A brotherhood of men anchored in Acts 20:28, who tell the truth and grow stronger in Christ together.",
  openGraph: {
    title: "Sheepdog Society — Find your brothers.",
    description: "Brothers who tell the truth and hear yours. Acts 20:28.",
    images: [{ url: "/api/og/verse", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og/verse"],
  },
};

type Photo = { url: string; alt?: string; caption?: string };

/** Next gatherings: one row per series (its next date), one-offs as-is,
 *  first four overall. Same filters as /events (Phase 1 semantics). */
async function getNextGatherings() {
  try {
    const now = new Date();
    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        location: events.location,
        startTime: events.startTime,
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
      .limit(24);

    const seen = new Set<string>();
    const strip: Array<(typeof rows)[number] & { label: string | null }> = [];
    for (const row of rows) {
      if (row.seriesId) {
        if (seen.has(row.seriesId)) continue;
        seen.add(row.seriesId);
      }
      strip.push({
        ...row,
        label: row.seriesCadence
          ? cadenceLabel({
              cadence: row.seriesCadence as SeriesCadence,
              dayOfWeek: row.seriesDayOfWeek ?? 0,
              nthWeek: row.seriesNthWeek,
            })
          : null,
      });
      if (strip.length === 4) break;
    }
    return strip;
  } catch {
    return [];
  }
}

async function getLatestLetter() {
  try {
    const rows = await listPublishedEncouragements();
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Three most recent past gatherings that have photos (Phase 1 predicate). */
async function getPhotoStrip() {
  try {
    return await db
      .select({
        id: events.id,
        title: events.title,
        startTime: events.startTime,
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
          sql`jsonb_array_length(coalesce(${events.photos}, '[]'::jsonb)) > 0`
        )
      )
      .orderBy(desc(events.startTime))
      .limit(3);
  } catch {
    return [];
  }
}

async function getStory() {
  try {
    const [story] = await db
      .select({
        id: testimonies.id,
        title: testimonies.title,
        content: testimonies.content,
        authorFirstName: users.firstName,
      })
      .from(testimonies)
      .leftJoin(users, eq(testimonies.userId, users.id))
      .where(eq(testimonies.isApproved, true))
      .orderBy(desc(testimonies.createdAt))
      .limit(1);
    return story ?? null;
  } catch {
    return null;
  }
}

const standingOrders = [
  { roman: "I", text: "Show up." },
  { roman: "II", text: "Tell the truth." },
  { roman: "III", text: "Stand watch." },
];

const howItWorks = [
  {
    roman: "I",
    title: "Find a table",
    copy: "Pick a group near you. Diners, garages, church basements.",
  },
  {
    roman: "II",
    title: "Show up as you are",
    copy: "No application. No interview. Sit down, read the Word, be honest.",
  },
  {
    roman: "III",
    title: "Keep showing up",
    copy: "The work is weekly. Scripture, straight talk, prayer. Steadier every week.",
  },
];

export default async function HomePage() {
  const [gatherings, letter, photoEvents, story] = await Promise.all([
    getNextGatherings(),
    getLatestLetter(),
    getPhotoStrip(),
    getStory(),
  ]);

  return (
    <>
      {/* 1 — Hero: the front page */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:px-10 md:pb-24 md:pt-16">
          <Kicker left="The front page" right="Every man needs a watch to stand" />
          <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-8">
              {/* Front-page-only raw clamp (documented Model-rules
                  exception): the prototype's 120px hero, above the
                  6rem cap of the locked --text-display-xl token. */}
              <h1 className="display-xl text-[clamp(3.25rem,9vw,7.5rem)]">
                Find your
                <br />
                <em>brothers.</em>
              </h1>
              <p className="dropcap mt-10 max-w-2xl font-scripture text-lg text-foreground/85">
                You have walked alone a long time. There is honor in that, and
                a limit to it. Find brothers who will tell you the truth and
                hear yours, men who know the Word, who will stand watch beside
                you and grow stronger in Christ. That is the work. That is
                enough.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <Link
                  href="/groups"
                  className="lift group inline-flex h-12 items-center gap-3 bg-foreground px-7 text-base font-medium text-background"
                >
                  <Icon name="map-pin" size={18} />
                  Find a group near you
                  <Icon
                    name="arrow-right"
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
                <Link href="/letter" className="link-editorial text-base">
                  Read this week&rsquo;s Letter
                </Link>
              </div>
              <p className="mt-10 max-w-xl text-sm leading-relaxed text-muted-foreground">
                We do not meet to perform. We do not meet to debate. We meet to
                be honest with each other, anchored in Scripture, and to send
                each other back into the week steadier than we came.
              </p>
            </div>

            {/* Right rail — standing orders */}
            <aside className="border-t-2 border-foreground/60 pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:border-foreground/15 lg:pl-10 lg:pt-1">
              <p className="folio">Standing orders</p>
              <ol className="mt-6 space-y-5">
                {standingOrders.map((o) => (
                  <li key={o.roman} className="flex items-baseline gap-4">
                    <span className="section-mark w-6 shrink-0">{o.roman}.</span>
                    <span className="font-display text-2xl">{o.text}</span>
                  </li>
                ))}
              </ol>
              <Link
                href="/what-to-expect"
                className="link-editorial mt-8 inline-block text-sm text-foreground/80"
              >
                What to expect at a table
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {/* 2 — The why: Acts 20:28 ember band */}
      <section className="ember-band">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center md:px-10 md:py-28">
          <p className="section-mark">§ Acts 20:28</p>
          <blockquote className="mt-8 font-pullquote text-2xl italic leading-relaxed md:text-4xl">
            &ldquo;Keep watch over yourselves and all the flock of which the
            Holy Spirit has made you overseers. Be shepherds of the church of
            God, which he bought with his own blood.&rdquo;
          </blockquote>
          <Link href="/acts-20-28" className="link-editorial mt-8 inline-block text-sm">
            Read the verse
          </Link>
        </div>
      </section>

      {/* 3 — How it works */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <Kicker left="How it works" right="Three steps, no hoops" />
          <StaggerReveal className="mt-10 grid gap-10 md:grid-cols-3">
            {howItWorks.map((s) => (
              <div key={s.roman}>
                <span className="section-mark">{s.roman}</span>
                <h3 className="display-soft mt-4 text-display-md">{s.title}</h3>
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
                  {s.copy}
                </p>
              </div>
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* 4 — Next gatherings (live series data) */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
          <Kicker left="Next gatherings" right="Come once · Come often" />
          {gatherings.length > 0 ? (
            <ul className="mt-8 divide-y divide-foreground/10 border-y border-foreground/15">
              {gatherings.map((g) => {
                const start = new Date(g.startTime);
                return (
                  <li key={g.id}>
                    <Link
                      href={`/events/${g.id}`}
                      className="group grid cursor-pointer gap-3 py-6 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[140px_1fr_auto] md:items-center md:gap-8"
                    >
                      <span className="flex items-baseline gap-2 md:flex-col md:gap-0">
                        <span className="display-xl text-2xl text-brass-deep">
                          {format(start, "MMM")}
                        </span>
                        <span className="display-xl text-2xl">
                          {format(start, "d")}
                        </span>
                      </span>
                      <span>
                        {g.label && (
                          <span className="section-mark">{g.label}</span>
                        )}
                        <span className="mt-1 block font-display text-xl">
                          {g.title}
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {format(start, "EEEE · h:mm a")}
                          {g.location ? ` · ${g.location}` : ""}
                        </span>
                      </span>
                      <span className="section-mark text-muted-foreground transition-colors group-hover:text-brass">
                        Details →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-8 font-pullquote text-lede italic text-muted-foreground">
              The calendar is refilling. Check the gatherings page.
            </p>
          )}
          <Link
            href="/events"
            className="link-editorial mt-6 inline-block text-sm"
          >
            All gatherings
          </Link>
        </div>
      </section>

      {/* 5 — The latest Letter */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
          <Kicker
            left="The Letter"
            right={
              letter?.publishDate
                ? `No. ${letter.issueNumber} · ${format(new Date(letter.publishDate), "MMMM d, yyyy")}`
                : "Sunday mornings"
            }
          />
          <Reveal className="mt-10">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              {letter ? (
                <Link
                  href={`/letter/${letter.slug}`}
                  className="paper-card lift group/cover block overflow-hidden"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    {letter.coverImageUrl ? (
                      <Image
                        src={letter.coverImageUrl}
                        alt={letter.coverImageAlt ?? ""}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover/cover:scale-[1.03]"
                      />
                    ) : (
                      <LetterCover
                        id={letter.id}
                        title={letter.title}
                        theme={letter.theme}
                        className="h-full w-full transition-transform duration-500 group-hover/cover:scale-[1.03]"
                      />
                    )}
                  </div>
                </Link>
              ) : (
                <div className="border border-dashed border-foreground/15 p-10 text-center">
                  <Icon name="sparkles" size={32} className="mx-auto text-brass" />
                  <p className="mt-4 font-pullquote text-lg italic text-muted-foreground">
                    The first letter is on the way.
                  </p>
                </div>
              )}
              <div>
                {letter && (
                  <>
                    <h2 className="display-soft text-display-md">{letter.title}</h2>
                    {letter.intro && (
                      <p className="mt-4 line-clamp-3 leading-relaxed text-muted-foreground">
                        {letter.intro}
                      </p>
                    )}
                    <Link
                      href={`/letter/${letter.slug}`}
                      className="link-editorial mt-4 inline-block text-sm"
                    >
                      Read this week&rsquo;s
                    </Link>
                  </>
                )}
                <p className="mt-8 max-w-xl font-pullquote text-lede italic text-muted-foreground">
                  One letter a week. A scripture. A practice. Sent at sunrise.
                  Read in five minutes. Carry it the rest of the week.
                </p>
                <div className="mt-5 max-w-xl">
                  <NewsletterForm />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6 — Past gatherings photo strip */}
      {photoEvents.length > 0 && (
        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
            <Kicker left="Past gatherings" right="What we came home with" />
            <StaggerReveal className="mt-10 grid gap-6 md:grid-cols-3" selector=":scope > a">
              {photoEvents.map((ev) => {
                const photos = (ev.photos as Photo[] | null) ?? [];
                const cover = photos[0];
                return (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="paper-card lift group/past block overflow-hidden"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-foreground/5">
                      {cover && (
                        <Image
                          src={cover.url}
                          alt={cover.alt ?? ev.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          unoptimized
                          className="object-cover transition-transform duration-500 group-hover/past:scale-[1.03]"
                        />
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
                        {format(new Date(ev.startTime), "MMMM d, yyyy")}
                      </p>
                      <h3 className="mt-2 font-display text-xl">{ev.title}</h3>
                      <p className="section-mark mt-3 inline-flex items-center gap-2">
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
      )}

      {/* 7 — One story */}
      {story && (
        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-4xl px-6 pb-20 md:px-10 md:pb-28">
            <Kicker left="One story" right="Told plain" />
            <Reveal className="mt-10">
              <blockquote className="border-l-2 border-brass pl-6">
                <p className="font-pullquote text-xl italic leading-relaxed text-foreground/85 md:text-2xl">
                  {story.content.slice(0, 280)}
                  {story.content.length > 280 ? "..." : ""}
                </p>
                <footer className="section-mark mt-6">
                  {story.authorFirstName || "A brother"}
                </footer>
              </blockquote>
              <Link
                href="/stories"
                className="link-editorial mt-8 inline-block text-sm"
              >
                More stories
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* 8 — Final Join CTA */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl border-t border-foreground/15 px-6 py-20 text-center md:px-10 md:py-28">
          <p className="folio">The invitation stands</p>
          <h2 className="display-xl mt-6 text-display-lg">
            There is a chair.
            <br />
            <em>Sit in it.</em>
          </h2>
          <div className="mt-10">
            <Link
              href="/join"
              className="lift inline-flex h-12 items-center gap-3 bg-foreground px-8 text-base font-medium text-background"
            >
              Join the brotherhood
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
