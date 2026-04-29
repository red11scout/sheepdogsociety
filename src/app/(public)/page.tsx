import Link from "next/link";
import { db } from "@/db";
import { letters } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { IssueKicker } from "@/components/public/issue-kicker";
import { ScriptureBand } from "@/components/public/scripture-band";

export const metadata = {
  title: "Acts 2028 Sheepdog Society — A Letter for Christian Men",
  description:
    "A weekly letter for Christian men, anchored in Acts 20:28. One passage, one big idea, one practical step. Bible-study groups, devotionals, and brotherhood under the authority of the Great Shepherd.",
};

interface HomeLetter {
  slug: string;
  issueNumber: number;
  title: string;
  subtitle: string | null;
  themeWord: string | null;
  excerpt: string | null;
  publishedAt: Date | null;
}

async function getLatestLetters(): Promise<HomeLetter[]> {
  try {
    return await db
      .select({
        slug: letters.slug,
        issueNumber: letters.issueNumber,
        title: letters.title,
        subtitle: letters.subtitle,
        themeWord: letters.themeWord,
        excerpt: letters.excerpt,
        publishedAt: letters.publishedAt,
      })
      .from(letters)
      .where(and(eq(letters.status, "published"), isNull(letters.deletedAt)))
      .orderBy(desc(letters.publishedAt))
      .limit(4);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const recentLetters = await getLatestLetters();
  const featured = recentLetters[0];
  const trio = recentLetters.slice(1, 4);
  const subscriberCount = 0; // Wire to Resend audience size in Phase F.

  return (
    <>
      {/* Editorial hero — current letter or empty state */}
      <section className="border-b border-stone/40 bg-bone px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-6xl">
          {featured ? <FeaturedLetterHero letter={featured} /> : <EmptyHero />}
        </div>
      </section>

      {/* Four-card resource grid */}
      <section className="bg-bone px-6 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-2">
            Where to start
          </h2>
          <p className="font-body text-base text-olive max-w-prose mb-12">
            Four ways in. Read on Friday. Read every morning. Find a table near
            you. Come to a gathering.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ResourceCard
              href="/letter"
              kicker="Weekly"
              title="The Letter"
              body="One passage. One big idea. One practical step. Each Friday."
            />
            <ResourceCard
              href="/devotionals"
              kicker="Daily"
              title="Devotionals"
              body="Short scripture-anchored reflections for working men."
            />
            <ResourceCard
              href="/groups"
              kicker="Local"
              title="Find a Group"
              body="Bible-study brotherhoods meeting in cities across the country."
            />
            <ResourceCard
              href="/events"
              kicker="Gather"
              title="Events"
              body="Retreats, conferences, and the gatherings worth getting on a plane for."
            />
          </div>
        </div>
      </section>

      {/* Anchor scripture band */}
      <ScriptureBand reference="Acts 20:28">
        Be on guard for yourselves and for all the flock, among which the Holy
        Spirit has made you overseers, to shepherd the church of God.
      </ScriptureBand>

      {/* Recent letters 3-up */}
      {trio.length > 0 ? (
        <section className="bg-bone px-6 py-20 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex items-end justify-between gap-6">
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
                Recent issues
              </h2>
              <Link
                href="/letter/archive"
                className="font-body text-sm text-brass hover:text-iron underline underline-offset-4"
              >
                Full archive →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {trio.map((letter) => (
                <LetterCard key={letter.slug} letter={letter} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Subscribe band */}
      <section className="border-t border-stone/40 bg-bone px-6 py-20 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <IssueKicker parts={["Subscribe", `${subscriberCount + 4200}+ men`]} />
          <h2 className="mt-4 font-display text-3xl md:text-5xl font-semibold tracking-tight leading-tight">
            Each Friday, one short letter.
          </h2>
          <p className="mt-4 font-body text-base md:text-lg text-olive">
            One passage, one big idea, one practical step.
          </p>
          <Link
            href="/subscribe"
            className="mt-8 inline-block rounded-full bg-iron px-7 py-3 font-body font-semibold text-bone hover:bg-navy transition-colors"
          >
            Subscribe
          </Link>
        </div>
      </section>
    </>
  );
}

function FeaturedLetterHero({ letter }: { letter: HomeLetter }) {
  const dateLabel = letter.publishedAt
    ? letter.publishedAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <article className="grid md:grid-cols-2 gap-10 items-center">
      <div className="aspect-[4/3] bg-stone/30 border border-stone/60 rounded-sm" />
      <div>
        <IssueKicker
          parts={[
            `Issue No. ${letter.issueNumber}`,
            letter.themeWord,
            dateLabel,
          ]}
        />
        <h1 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
          {letter.title}
        </h1>
        {letter.subtitle ? (
          <p className="mt-5 font-pullquote italic text-xl md:text-2xl text-olive leading-relaxed">
            {letter.subtitle}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/letter/${letter.slug}`}
            className="rounded-full bg-iron px-6 py-3 font-body font-semibold text-bone hover:bg-navy transition-colors"
          >
            Read this week
          </Link>
          <Link
            href="/subscribe"
            className="rounded-full border-2 border-iron px-6 py-3 font-body font-semibold text-iron hover:bg-iron hover:text-bone transition-colors"
          >
            Subscribe
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyHero() {
  return (
    <div className="grid md:grid-cols-2 gap-10 items-center">
      <div className="aspect-[4/3] bg-stone/30 border border-stone/60 rounded-sm" />
      <div>
        <IssueKicker parts={["Coming soon", "First issue in flight"]} />
        <h1 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
          A weekly letter for Christian men.
        </h1>
        <p className="mt-5 font-pullquote italic text-xl md:text-2xl text-olive leading-relaxed">
          One passage, one big idea, one practical step. Anchored in Acts 20:28.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/subscribe"
            className="rounded-full bg-iron px-6 py-3 font-body font-semibold text-bone hover:bg-navy transition-colors"
          >
            Subscribe
          </Link>
          <Link
            href="/about"
            className="rounded-full border-2 border-iron px-6 py-3 font-body font-semibold text-iron hover:bg-iron hover:text-bone transition-colors"
          >
            What we do
          </Link>
        </div>
      </div>
    </div>
  );
}

function ResourceCard({
  href,
  kicker,
  title,
  body,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group block border border-stone bg-bone p-6 hover:border-iron transition-colors"
    >
      <p className="font-body uppercase tracking-[0.18em] text-xs text-brass">
        {kicker}
      </p>
      <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">
        {title}
      </h3>
      <p className="mt-3 font-body text-sm text-olive leading-relaxed">
        {body}
      </p>
      <p className="mt-5 font-body text-sm text-iron group-hover:text-brass transition-colors">
        Read more →
      </p>
    </Link>
  );
}

function LetterCard({ letter }: { letter: HomeLetter }) {
  return (
    <Link
      href={`/letter/${letter.slug}`}
      className="group block border-t border-stone pt-6 hover:border-iron"
    >
      <div className="aspect-[16/10] bg-stone/30 border border-stone/60 mb-4" />
      <IssueKicker parts={[`Issue ${letter.issueNumber}`, letter.themeWord]} />
      <h3 className="mt-3 font-display text-xl md:text-2xl font-semibold leading-snug tracking-tight">
        {letter.title}
      </h3>
      {letter.excerpt ? (
        <p className="mt-3 font-body text-sm text-olive line-clamp-3">
          {letter.excerpt}
        </p>
      ) : null}
    </Link>
  );
}
