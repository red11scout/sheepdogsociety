import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { devotionals } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { Icon } from "@/components/icons/Icon";
import { format, parseISO } from "date-fns";

export const revalidate = 60;

async function getDevotional(date: string) {
  try {
    const [row] = await db
      .select()
      .from(devotionals)
      .where(and(eq(devotionals.date, date), eq(devotionals.isApproved, true)))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = await getDevotional(slug);
  if (!d) return { title: "Devotional — Sheepdog Society" };
  return {
    title: `${d.title} — Devotional`,
    description: `${d.scriptureReference}. ${d.content.slice(0, 140)}…`,
  };
}

export default async function DevotionalDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = await getDevotional(slug);
  if (!d) notFound();

  const questions = (d.discussionQuestions ?? []) as string[];

  return (
    <article className="bg-bone">
      <header className="bg-iron text-bone">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-12 md:py-28">
          <div className="flex items-center gap-4">
            <span className="section-mark">
              § {format(parseISO(d.date), "EEEE, MMMM d, yyyy")}
            </span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 text-[clamp(2.25rem,6vw,5rem)] text-bone">
            {d.title}
          </h1>
          <p className="mt-8 font-pullquote text-xl italic text-bone/80 md:text-2xl">
            {d.scriptureReference}
          </p>
          {d.scriptureText && (
            <blockquote className="mt-8 border-l-2 border-brass pl-6 font-pullquote text-lg italic leading-relaxed text-bone/85">
              {d.scriptureText}
            </blockquote>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-20 md:px-12 md:py-28">
        <div className="font-display text-lg leading-[1.7] text-iron whitespace-pre-line">
          {d.content}
        </div>

        {questions.length > 0 && (
          <section className="mt-16 border-t border-iron/15 pt-12">
            <span className="section-mark text-brass">§ For the table</span>
            <ol className="mt-6 space-y-4 text-iron/85">
              {questions.map((q, i) => (
                <li key={i} className="grid grid-cols-[2rem_1fr] gap-2">
                  <span className="font-mono text-sm text-brass">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed">{q}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {d.prayerPrompt && (
          <section className="mt-16 border-t border-iron/15 pt-12">
            <span className="section-mark text-brass">§ Pray</span>
            <p className="mt-6 font-pullquote text-xl italic leading-relaxed text-iron/80">
              {d.prayerPrompt}
            </p>
          </section>
        )}

        <div className="mt-16 flex flex-wrap items-center gap-4 border-t border-iron/15 pt-8">
          <Link
            href="/devotionals"
            className="section-mark text-brass hover:opacity-70"
          >
            ← All devotionals
          </Link>
          <Link
            href="/letter"
            className="lift inline-flex h-11 items-center gap-3 border border-iron/20 px-5 text-xs font-medium uppercase tracking-[0.18em] text-iron transition-colors hover:border-brass hover:text-brass"
          >
            The weekly Letter
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
