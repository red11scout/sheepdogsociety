import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { letters } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Icon } from "@/components/icons/Icon";
import { format } from "date-fns";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "The Letter — Sheepdog Society",
  description:
    "One letter a week. A scripture. A practice. Read it before the day starts.",
};

async function getLatestAndArchive() {
  try {
    const rows = await db
      .select({
        id: letters.id,
        slug: letters.slug,
        issueNumber: letters.issueNumber,
        title: letters.title,
        subtitle: letters.subtitle,
        themeWord: letters.themeWord,
        excerpt: letters.excerpt,
        coverImageUrl: letters.coverImageUrl,
        publishedAt: letters.publishedAt,
      })
      .from(letters)
      .where(and(eq(letters.status, "published"), isNull(letters.deletedAt)))
      .orderBy(desc(letters.issueNumber))
      .limit(13);
    return rows;
  } catch {
    return [];
  }
}

export default async function LetterPage() {
  const all = await getLatestAndArchive();
  const [latest, ...archive] = all;

  return (
    <>
      {/* Hero / latest */}
      <section className="relative overflow-hidden bg-iron text-bone">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ The Letter</span>
            <div className="hairline flex-1" />
          </div>

          {latest ? (
            <article className="mt-12 grid gap-12 md:grid-cols-[2fr_1fr] md:items-end">
              <div>
                <p className="section-mark text-brass">
                  {latest.themeWord
                    ? `Issue ${latest.issueNumber} · ${latest.themeWord}`
                    : `Issue ${latest.issueNumber}`}
                </p>
                <h1 className="display-xl mt-6 text-[clamp(2.25rem,6vw,5rem)] text-bone">
                  {latest.title}
                </h1>
                {latest.subtitle && (
                  <p className="mt-6 max-w-2xl font-pullquote text-xl italic text-bone/80 md:text-2xl">
                    {latest.subtitle}
                  </p>
                )}
                {latest.excerpt && (
                  <p className="mt-6 max-w-2xl text-lg leading-relaxed text-bone/75">
                    {latest.excerpt}
                  </p>
                )}
                <div className="mt-10 flex flex-wrap items-center gap-6">
                  <Link
                    href={`/letter/${latest.slug}`}
                    className="lift inline-flex h-12 items-center gap-3 bg-brass px-6 text-sm font-medium uppercase tracking-[0.18em] text-iron transition-colors hover:bg-gold"
                  >
                    Read the letter
                    <Icon name="arrow-right" size={16} />
                  </Link>
                  {latest.publishedAt && (
                    <p className="section-mark text-stone/60">
                      Sent {format(latest.publishedAt, "MMMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ) : (
            <div className="mt-16">
              <h1 className="display-xl text-[clamp(2.25rem,6vw,5rem)] text-bone">
                The first letter is coming.
              </h1>
              <p className="mt-6 max-w-2xl font-pullquote text-xl italic text-bone/80">
                One letter a week. A scripture. A practice. Sent before the day
                starts. Sign up below and we will send the first one as soon as
                it ships.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Subscribe band */}
      <section className="border-y border-iron/15 bg-bone">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between md:px-12">
          <div>
            <p className="section-mark text-brass">§ Sunday morning</p>
            <p className="mt-3 font-display text-2xl text-iron md:text-3xl">
              Five minutes. One scripture. One thing to obey.
            </p>
          </div>
          <Link
            href="/join"
            className="lift inline-flex h-12 shrink-0 items-center gap-3 bg-iron px-6 text-sm font-medium uppercase tracking-[0.18em] text-bone transition-colors hover:bg-iron/90"
          >
            Get the Letter
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>

      {/* Archive */}
      <section className="bg-bone">
        <div className="mx-auto max-w-5xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark text-brass">§ Archive</span>
            <div className="hairline flex-1 text-iron/40" />
          </div>

          {archive.length > 0 ? (
            <ul className="mt-12 divide-y divide-iron/10 border-y border-iron/10">
              {archive.map((letter) => (
                <li key={letter.id}>
                  <Link
                    href={`/letter/${letter.slug}`}
                    className="group grid gap-3 py-8 transition-colors hover:bg-iron/[0.02] md:grid-cols-[100px_1fr_auto] md:items-baseline md:gap-8"
                  >
                    <span className="section-mark text-brass">
                      № {letter.issueNumber}
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-semibold text-iron group-hover:text-brass md:text-2xl">
                        {letter.title}
                      </h3>
                      {letter.subtitle && (
                        <p className="mt-1 text-iron/60">{letter.subtitle}</p>
                      )}
                    </div>
                    <span className="section-mark text-iron/50">
                      {letter.publishedAt
                        ? format(letter.publishedAt, "MMM d, yyyy")
                        : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-12 font-pullquote text-xl italic text-iron/60">
              The archive will fill in once the Letter has run for a few weeks.
            </p>
          )}

          {archive.length >= 12 && (
            <div className="mt-12 flex justify-center">
              <Link
                href="/letter/archive"
                className="section-mark text-brass hover:opacity-70"
              >
                See every letter →
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
