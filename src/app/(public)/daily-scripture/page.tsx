export const dynamic = "force-dynamic";

import { db } from "@/db";
import { scriptureOfDay, devotionals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { format } from "date-fns";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

export const metadata = {
  title: "Daily Scripture — Sheepdog Society",
  description:
    "Start each day grounded in God's Word. Daily scripture, devotionals, discussion questions for men of faith.",
};

export default async function DailyScripturePage() {
  const today = format(new Date(), "yyyy-MM-dd");

  const [todayScripture] = await db
    .select()
    .from(scriptureOfDay)
    .where(eq(scriptureOfDay.date, today));

  const [todayDevotional] = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.date, today));

  const recentScriptures = await db
    .select()
    .from(scriptureOfDay)
    .orderBy(desc(scriptureOfDay.date))
    .limit(14);

  const pastScriptures = recentScriptures.filter((s) => s.date !== today);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-iron text-bone">
        <div className="aurora" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark">
              § {format(new Date(), "EEEE, MMMM d, yyyy")}
            </span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6rem)] text-bone">
            Today&rsquo;s word.
          </h1>
        </div>
      </section>

      {/* Today's Scripture */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-5xl px-6 pb-20 md:px-12 md:pb-32">
          {todayScripture ? (
            <article className="border-y border-stone/15 py-16 md:py-24">
              <div className="flex flex-wrap items-center gap-4">
                <span className="display-xl text-3xl text-brass md:text-5xl">
                  {todayScripture.reference}
                </span>
                <span className="section-mark text-stone/60">
                  {todayScripture.translation}
                </span>
              </div>

              {todayScripture.text && (
                <blockquote className="mt-10 border-l-2 border-brass pl-8 font-pullquote text-2xl italic leading-relaxed text-bone md:text-4xl">
                  {todayScripture.text}
                </blockquote>
              )}

              {todayScripture.theme && (
                <div className="mt-12">
                  <span className="section-mark text-brass">§ Theme</span>
                  <p className="mt-3 text-lg leading-relaxed text-bone">
                    {todayScripture.theme}
                  </p>
                </div>
              )}

              {todayScripture.reflection && (
                <div className="mt-10">
                  <span className="section-mark text-brass">§ Reflection</span>
                  <p className="mt-3 text-base leading-relaxed text-stone md:text-lg">
                    {todayScripture.reflection}
                  </p>
                </div>
              )}

              {todayScripture.seriesName && (
                <p className="mt-12 section-mark text-stone/60">
                  {todayScripture.seriesName}
                  {todayScripture.dayInSeries != null
                    ? ` · Day ${todayScripture.dayInSeries}`
                    : ""}
                </p>
              )}
            </article>
          ) : (
            <article className="border border-dashed border-stone/20 p-12 text-center md:p-16">
              <Icon
                name="scroll"
                size={48}
                strokeWidth={2}
                className="mx-auto text-brass"
              />
              <h2 className="display-xl mt-8 text-2xl text-bone md:text-3xl">
                Today&rsquo;s scripture is being prepared.
              </h2>
              <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-stone">
                Open your Bible to wherever God leads. His Word never returns
                void.
              </p>
              <p className="mt-8 section-mark text-brass">Psalm 119:105</p>
            </article>
          )}
        </div>
      </section>

      {/* Devotional */}
      {todayDevotional && (
        <section className="bg-bone text-iron">
          <div className="mx-auto max-w-5xl px-6 py-20 md:px-12 md:py-32">
            <div className="flex items-center gap-4">
              <span className="section-mark">§ Devotional</span>
              <div className="hairline flex-1" />
            </div>
            <h2 className="display-xl mt-10 text-4xl md:text-6xl">
              {todayDevotional.title}
            </h2>
            <p className="mt-4 section-mark text-brass">
              {todayDevotional.scriptureReference}
            </p>
            <p className="mt-10 whitespace-pre-line text-base leading-relaxed text-iron/80 md:text-lg">
              {todayDevotional.content}
            </p>

            {todayDevotional.prayerPrompt && (
              <div className="mt-12 border-l-2 border-brass pl-6">
                <span className="section-mark text-brass">§ Prayer prompt</span>
                <p className="mt-3 font-pullquote text-lg italic leading-relaxed text-iron md:text-xl">
                  {todayDevotional.prayerPrompt}
                </p>
              </div>
            )}

            {todayDevotional.discussionQuestions &&
              (todayDevotional.discussionQuestions as string[]).length > 0 && (
                <div className="mt-12">
                  <span className="section-mark text-brass">
                    § Discussion questions
                  </span>
                  <ol className="mt-6 divide-y divide-iron/10 border-y border-iron/10">
                    {(todayDevotional.discussionQuestions as string[]).map(
                      (q, i) => (
                        <li
                          key={i}
                          className="grid grid-cols-[60px_1fr] gap-4 py-6"
                        >
                          <span className="section-mark text-brass">
                            § {romanize(i + 1)}
                          </span>
                          <p className="text-base leading-relaxed text-iron/80 md:text-lg">
                            {q}
                          </p>
                        </li>
                      )
                    )}
                  </ol>
                </div>
              )}
          </div>
        </section>
      )}

      {/* Recent */}
      {pastScriptures.length > 0 && (
        <section className="bg-iron text-bone">
          <div className="mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-28">
            <div className="flex items-center gap-4">
              <span className="section-mark">§ Recent</span>
              <div className="hairline flex-1" />
            </div>
            <div className="mt-10 grid gap-px bg-stone/10 md:grid-cols-2 lg:grid-cols-3">
              {pastScriptures.map((s) => {
                const dateObj = new Date(s.date + "T12:00:00");
                return (
                  <Link
                    key={s.id}
                    href={`/daily-scripture?date=${s.date}`}
                    className="group/c lift bg-iron p-6 transition-colors hover:bg-iron/80 md:p-8"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="section-mark text-stone/60">
                          {format(dateObj, "MMM d")}
                        </span>
                        <p className="display-xl mt-3 text-xl text-bone md:text-2xl">
                          {s.reference}
                        </p>
                        {s.theme && (
                          <p className="mt-2 line-clamp-1 text-sm text-stone">
                            {s.theme}
                          </p>
                        )}
                      </div>
                      <Icon
                        name="arrow-up-right"
                        size={16}
                        className="mt-1 shrink-0 text-stone/40 transition-all group-hover/c:translate-x-0.5 group-hover/c:-translate-y-0.5 group-hover/c:text-brass"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function romanize(n: number): string {
  const numerals = [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
  ];
  return numerals[n - 1] ?? String(n);
}
