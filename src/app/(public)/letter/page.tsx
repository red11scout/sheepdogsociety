import Link from "next/link";
import { db } from "@/db";
import { letters } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { IssueKicker } from "@/components/public/issue-kicker";

export const metadata = {
  title: "The Letter — Acts 2028 Sheepdog Society",
  description:
    "A weekly letter for Christian men. One passage, one big idea, one practical step. Anchored in Acts 20:28.",
};

export default async function LetterIndexPage() {
  let issues: Array<{
    slug: string;
    issueNumber: number;
    title: string;
    subtitle: string | null;
    themeWord: string | null;
    excerpt: string | null;
    publishedAt: Date | null;
  }> = [];

  try {
    issues = await db
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
      .limit(12);
  } catch {
    issues = [];
  }

  const featured = issues[0];
  const rest = issues.slice(1);

  return (
    <>
      <section className="border-b border-stone/40 px-6 pt-20 pb-16">
        <div className="mx-auto max-w-6xl">
          <IssueKicker parts={["The Letter", "Weekly · Friday"]} />
          <h1 className="mt-3 font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] max-w-4xl">
            One passage, one big idea, one practical step.
          </h1>
          <p className="mt-6 font-pullquote italic text-xl md:text-2xl text-olive max-w-3xl leading-relaxed">
            A short letter for men who have read their Bible their whole life
            and have nothing to prove.
          </p>
        </div>
      </section>

      {featured ? (
        <section className="border-b border-stone/40 px-6 py-16 md:py-20">
          <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10 items-center">
            <Link
              href={`/letter/${featured.slug}`}
              className="aspect-[4/3] bg-stone/30 border border-stone/60 hover:border-iron transition-colors block"
            />
            <div>
              <IssueKicker
                parts={[`Issue No. ${featured.issueNumber}`, featured.themeWord]}
              />
              <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold tracking-tight leading-tight">
                <Link
                  href={`/letter/${featured.slug}`}
                  className="hover:text-brass transition-colors"
                >
                  {featured.title}
                </Link>
              </h2>
              {featured.subtitle ? (
                <p className="mt-4 font-pullquote italic text-lg md:text-xl text-olive">
                  {featured.subtitle}
                </p>
              ) : null}
              <Link
                href={`/letter/${featured.slug}`}
                className="mt-6 inline-block font-body font-semibold text-iron underline underline-offset-4 hover:text-brass"
              >
                Read this week →
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-stone/40 px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <IssueKicker parts={["Coming soon"]} />
            <h2 className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight">
              The first issue is in flight.
            </h2>
            <p className="mt-4 font-body text-base text-olive leading-relaxed">
              Subscribe and we&apos;ll send it to you the moment it lands.
            </p>
            <Link
              href="/subscribe"
              className="mt-6 inline-block rounded-full bg-iron px-6 py-3 font-body font-semibold text-bone hover:bg-navy transition-colors"
            >
              Subscribe
            </Link>
          </div>
        </section>
      )}

      {rest.length > 0 ? (
        <section className="px-6 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-10">
              Recent issues
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {rest.map((issue) => (
                <article key={issue.slug} className="border-t border-stone pt-6">
                  <Link href={`/letter/${issue.slug}`} className="block aspect-[16/10] bg-stone/30 border border-stone/60 mb-4 hover:border-iron transition-colors" />
                  <IssueKicker
                    parts={[`Issue ${issue.issueNumber}`, issue.themeWord]}
                  />
                  <h3 className="mt-3 font-display text-xl md:text-2xl font-semibold leading-snug tracking-tight">
                    <Link
                      href={`/letter/${issue.slug}`}
                      className="hover:text-brass transition-colors"
                    >
                      {issue.title}
                    </Link>
                  </h3>
                  {issue.excerpt ? (
                    <p className="mt-3 font-body text-sm text-olive line-clamp-3">
                      {issue.excerpt}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link
                href="/letter/archive"
                className="font-body text-sm text-brass hover:text-iron underline underline-offset-4"
              >
                Full archive →
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
