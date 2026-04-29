import Link from "next/link";
import { db } from "@/db";
import { letters } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { IssueKicker } from "@/components/public/issue-kicker";

export const metadata = {
  title: "Archive — The Letter — Acts 2028 Sheepdog Society",
  description: "Every issue of The Letter, grouped by year.",
};

export default async function ArchivePage() {
  let issues: Array<{
    slug: string;
    issueNumber: number;
    title: string;
    themeWord: string | null;
    publishedAt: Date | null;
  }> = [];
  try {
    issues = await db
      .select({
        slug: letters.slug,
        issueNumber: letters.issueNumber,
        title: letters.title,
        themeWord: letters.themeWord,
        publishedAt: letters.publishedAt,
      })
      .from(letters)
      .where(and(eq(letters.status, "published"), isNull(letters.deletedAt)))
      .orderBy(desc(letters.publishedAt));
  } catch {
    issues = [];
  }

  // Group by year
  const byYear = new Map<number, typeof issues>();
  for (const issue of issues) {
    const year = issue.publishedAt?.getFullYear() ?? new Date().getFullYear();
    const list = byYear.get(year) ?? [];
    list.push(issue);
    byYear.set(year, list);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <article className="px-6 pt-16 pb-24">
      <div className="mx-auto max-w-4xl">
        <IssueKicker parts={["Archive"]} />
        <h1 className="mt-3 font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          Every issue.
        </h1>
        <p className="mt-6 font-body text-base text-olive">
          {issues.length === 0
            ? "The first issue is in flight. Subscribe to be there for it."
            : `${issues.length} ${issues.length === 1 ? "issue" : "issues"} so far.`}
        </p>

        {years.length === 0 ? (
          <div className="mt-16 text-center">
            <Link
              href="/subscribe"
              className="inline-block rounded-full bg-iron px-6 py-3 font-body font-semibold text-bone hover:bg-navy transition-colors"
            >
              Subscribe
            </Link>
          </div>
        ) : (
          <div className="mt-16 space-y-16">
            {years.map((year) => (
              <section key={year}>
                <h2 className="font-display text-2xl font-semibold mb-6 pb-3 border-b border-stone">
                  {year}
                </h2>
                <ul className="divide-y divide-stone/60">
                  {byYear.get(year)!.map((issue) => (
                    <li key={issue.slug} className="py-4 grid grid-cols-[6rem_1fr_auto] gap-4 items-baseline">
                      <span className="font-body uppercase tracking-[0.18em] text-xs text-olive">
                        Issue {issue.issueNumber}
                      </span>
                      <Link
                        href={`/letter/${issue.slug}`}
                        className="font-display text-lg md:text-xl text-iron hover:text-brass tracking-tight"
                      >
                        {issue.title}
                        {issue.themeWord ? (
                          <span className="ml-2 font-body text-xs uppercase tracking-[0.18em] text-stone">
                            {issue.themeWord}
                          </span>
                        ) : null}
                      </Link>
                      <span className="font-body text-xs text-olive">
                        {issue.publishedAt?.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
