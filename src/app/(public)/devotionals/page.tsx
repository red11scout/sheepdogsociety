import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { devotionals } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Icon } from "@/components/icons/Icon";
import { format, parseISO } from "date-fns";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Devotionals — Sheepdog Society",
  description:
    "A short reading. A scripture. A prayer. One thing to do today.",
};

async function getApproved() {
  try {
    return await db
      .select({
        id: devotionals.id,
        date: devotionals.date,
        title: devotionals.title,
        scriptureReference: devotionals.scriptureReference,
        content: devotionals.content,
      })
      .from(devotionals)
      .where(eq(devotionals.isApproved, true))
      .orderBy(desc(devotionals.date))
      .limit(60);
  } catch {
    return [];
  }
}

export default async function DevotionalsPage() {
  const all = await getApproved();
  const [latest, ...rest] = all;

  return (
    <>
      {/* Hero / latest */}
      <section className="relative overflow-hidden bg-iron text-bone">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Devotionals</span>
            <div className="hairline flex-1" />
          </div>

          {latest ? (
            <article className="mt-12">
              <p className="section-mark text-brass">
                {format(parseISO(latest.date), "EEEE, MMMM d, yyyy")}
              </p>
              <h1 className="display-xl mt-6 text-[clamp(2.25rem,6vw,5rem)] text-bone">
                {latest.title}
              </h1>
              <p className="mt-6 font-pullquote text-xl italic text-bone/80 md:text-2xl">
                {latest.scriptureReference}
              </p>
              <Link
                href={`/devotionals/${latest.date}`}
                className="lift mt-10 inline-flex h-12 items-center gap-3 bg-brass px-6 text-sm font-medium uppercase tracking-[0.18em] text-iron transition-colors hover:bg-gold"
              >
                Read today
                <Icon name="arrow-right" size={16} />
              </Link>
            </article>
          ) : (
            <div className="mt-12">
              <h1 className="display-xl text-[clamp(2.25rem,6vw,5rem)] text-bone">
                Daily readings,
                <br />
                <span className="text-brass">in plain language.</span>
              </h1>
              <p className="mt-6 max-w-2xl font-pullquote text-xl italic text-bone/80">
                The first devotionals are being prepared. Check back tomorrow.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Archive */}
      <section className="bg-bone">
        <div className="mx-auto max-w-4xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark text-brass">§ Recent</span>
            <div className="hairline flex-1 text-iron/40" />
          </div>

          {rest.length > 0 ? (
            <ul className="mt-12 divide-y divide-iron/10 border-y border-iron/10">
              {rest.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/devotionals/${d.date}`}
                    className="group grid gap-3 py-6 transition-colors hover:bg-iron/[0.02] md:grid-cols-[140px_1fr_auto] md:items-baseline md:gap-8"
                  >
                    <span className="section-mark text-iron/50">
                      {format(parseISO(d.date), "MMM d, yyyy")}
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-iron group-hover:text-brass md:text-xl">
                        {d.title}
                      </h3>
                      <p className="mt-1 text-sm text-iron/60">
                        {d.scriptureReference}
                      </p>
                    </div>
                    <span className="section-mark text-iron/40 group-hover:text-brass">
                      Read →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-12 font-pullquote text-xl italic text-iron/60">
              No archive yet. Tomorrow morning, a new one.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
