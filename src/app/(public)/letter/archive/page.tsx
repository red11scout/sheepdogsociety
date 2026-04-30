import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { letters } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { format } from "date-fns";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Letter archive — Sheepdog Society",
  description:
    "Every letter we have sent. Read them in order, or skim and find one for the week you are in.",
};

async function getAllLetters() {
  try {
    return await db
      .select({
        id: letters.id,
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
      .orderBy(desc(letters.issueNumber));
  } catch {
    return [];
  }
}

export default async function LetterArchivePage() {
  const all = await getAllLetters();

  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-5xl px-6 py-24 md:px-12 md:py-32">
        <div className="flex items-center gap-4">
          <span className="section-mark text-brass">§ Archive</span>
          <div className="hairline flex-1 text-iron/40" />
        </div>
        <h1 className="display-xl mt-10 text-[clamp(2.25rem,5vw,4rem)] text-iron">
          Every letter,
          <br />
          <span className="text-brass">in order.</span>
        </h1>

        {all.length > 0 ? (
          <ul className="mt-16 divide-y divide-iron/10 border-y border-iron/10">
            {all.map((letter) => (
              <li key={letter.id}>
                <Link
                  href={`/letter/${letter.slug}`}
                  className="group grid gap-3 py-8 transition-colors hover:bg-iron/[0.02] md:grid-cols-[80px_1fr_120px] md:items-baseline md:gap-8"
                >
                  <span className="section-mark text-brass">
                    № {letter.issueNumber}
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-iron group-hover:text-brass md:text-2xl">
                      {letter.title}
                    </h2>
                    {letter.subtitle && (
                      <p className="mt-1 text-iron/60">{letter.subtitle}</p>
                    )}
                    {letter.excerpt && (
                      <p className="mt-3 max-w-prose text-iron/70">
                        {letter.excerpt}
                      </p>
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
            Nothing here yet. The first letter is on the way.
          </p>
        )}
      </div>
    </section>
  );
}
