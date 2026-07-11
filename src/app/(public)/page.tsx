import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/db";
import { events, eventSeries, locations, testimonies, users } from "@/db/schema";
import { and, asc, desc, eq, gte, ne } from "drizzle-orm";
import { format } from "date-fns";
import { Icon } from "@/components/icons/Icon";
import { Kicker } from "@/components/public/kicker";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerReveal } from "@/components/motion/StaggerReveal";
import { NewsletterForm } from "@/components/public/newsletter-form";
import { LetterCover } from "@/components/letters/LetterCover";
import { listPublishedEncouragements } from "@/server/encouragements";
import { cadenceLabel, type SeriesCadence } from "@/lib/events/series";
import { getSiteTextMap } from "@/lib/site-text/get";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getSiteTextMap();
  return {
    title: t["home.meta.title"],
    description: t["home.meta.description"],
    openGraph: {
      title: t["home.meta.social_title"],
      description: t["home.meta.social_description"],
      images: [{ url: "/api/og/verse", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/api/og/verse"],
    },
  };
}

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

/** When & where, live: distinct meeting day + city pairs from the public
 *  locator's exact visibility gate (spec §A.2 — the status enum has no
 *  "approved" value; /groups gates on displayedOnMap AND isActive). */
async function getMeetingRhythms() {
  try {
    const rows = await db
      .selectDistinct({ day: locations.meetingDay, city: locations.city })
      .from(locations)
      .where(
        and(
          eq(locations.displayedOnMap, true),
          eq(locations.isActive, true),
          ne(locations.meetingDay, "")
        )
      )
      .orderBy(asc(locations.city), asc(locations.meetingDay))
      .limit(4);
    return rows.filter((r) => r.day && r.city);
  } catch {
    return [];
  }
}

const standingOrders = [
  { roman: "I", text: "Show up." },
  { roman: "II", text: "Tell the truth." },
  { roman: "III", text: "Stand watch." },
];

export default async function HomePage() {
  const [gatherings, letter, story, rhythms, t] = await Promise.all([
    getNextGatherings(),
    getLatestLetter(),
    getStory(),
    getMeetingRhythms(),
    getSiteTextMap(),
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
                {t["home.hero.headline1"]}
                <br />
                <em>{t["home.hero.headline2"]}</em>
              </h1>
              <p className="dropcap mt-10 max-w-2xl font-scripture text-lg text-foreground/85">
                {t["home.hero.paragraph"]}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <Link
                  href="/groups"
                  className="lift group inline-flex h-12 items-center gap-3 bg-foreground px-7 text-base font-medium text-background"
                >
                  <Icon name="map-pin" size={18} />
                  Find your group
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

      {/* 3 — What this is: the 5W1H band (spec §A.2) */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <Kicker left="What this is" right="Plain answers" />
          <StaggerReveal className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-5 lg:gap-8">
            <div>
              <p className="folio">Who it&rsquo;s for</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t["home.what.who"]}
              </p>
            </div>
            <div>
              <p className="folio">What happens</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t["home.what.happens"]}
              </p>
            </div>
            <div>
              <p className="folio">Why it exists</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t["home.what.why"]}
              </p>
            </div>
            <div>
              <p className="folio">When &amp; where</p>
              {rhythms.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm leading-relaxed text-muted-foreground">
                  {rhythms.map((r) => (
                    <li key={`${r.day}-${r.city}`}>
                      <span className="text-foreground">{r.day}s</span> · {r.city}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {t["home.what.where_fallback"]}
                </p>
              )}
            </div>
            <div>
              <p className="folio">How to start</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t["home.what.start"]}
              </p>
              <Link
                href="/join"
                className="link-editorial mt-3 inline-block text-sm"
              >
                Start here
              </Link>
            </div>
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
                      <span className="section-mark inline-flex items-center gap-1 text-muted-foreground transition-colors group-hover:text-brass">
                        Details
                        <Icon name="chevron-right" size={12} />
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

      {/* 6 — One story */}
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

      {/* 7 — Final Join CTA */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl border-t border-foreground/15 px-6 py-20 text-center md:px-10 md:py-28">
          <p className="folio">The invitation stands</p>
          <h2 className="display-xl mt-6 text-display-lg">
            {t["home.join.headline1"]}
            <br />
            <em>{t["home.join.headline2"]}</em>
          </h2>
          <div className="mt-10">
            <Link
              href="/join"
              className="lift inline-flex h-12 items-center gap-3 bg-foreground px-8 text-base font-medium text-background"
            >
              {t["home.join.button"]}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
