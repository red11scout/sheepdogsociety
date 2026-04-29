import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { devotionals } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { IssueKicker } from "@/components/public/issue-kicker";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DevotionalPage({ params }: PageProps) {
  const { slug } = await params;
  let row: typeof devotionals.$inferSelect | undefined;
  try {
    [row] = await db
      .select()
      .from(devotionals)
      .where(and(eq(devotionals.id, slug), eq(devotionals.isApproved, true)))
      .limit(1);
  } catch {
    row = undefined;
  }
  if (!row) notFound();

  return (
    <article className="px-6 pt-16 pb-24">
      <div className="mx-auto max-w-3xl">
        <IssueKicker parts={["Devotional", row.date]} />
        <h1 className="mt-4 font-display text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
          {row.title}
        </h1>
        <p className="mt-6 font-body uppercase tracking-[0.18em] text-xs text-brass">
          {row.scriptureReference}
        </p>

        {row.scriptureText ? (
          <blockquote className="mt-8 font-pullquote italic text-2xl border-l-2 border-brass pl-6 text-olive">
            {row.scriptureText}
          </blockquote>
        ) : null}

        <div className="mt-10 font-body text-[19px] leading-[1.65] whitespace-pre-line">
          {row.content}
        </div>

        {row.prayerPrompt ? (
          <section className="mt-12 border-t border-stone pt-8">
            <p className="font-body uppercase tracking-[0.18em] text-xs text-brass mb-3">
              Pray
            </p>
            <p className="font-body text-base text-olive leading-relaxed">
              {row.prayerPrompt}
            </p>
          </section>
        ) : null}

        <footer className="mt-16 pt-8 border-t border-stone">
          <Link
            href="/devotionals"
            className="font-body text-sm text-brass hover:text-iron underline underline-offset-4"
          >
            ← All devotionals
          </Link>
        </footer>
      </div>
    </article>
  );
}
