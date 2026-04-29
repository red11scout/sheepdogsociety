import Link from "next/link";
import { db } from "@/db";
import { devotionals } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { IssueKicker } from "@/components/public/issue-kicker";

export const metadata = {
  title: "Devotionals — Acts 2028 Sheepdog Society",
  description: "Short, scripture-anchored daily reflections for working men.",
};

export default async function DevotionalsPage() {
  let items: Array<{
    id: string;
    date: string;
    title: string;
    scriptureReference: string;
  }> = [];
  try {
    items = await db
      .select({
        id: devotionals.id,
        date: devotionals.date,
        title: devotionals.title,
        scriptureReference: devotionals.scriptureReference,
      })
      .from(devotionals)
      .where(eq(devotionals.isApproved, true))
      .orderBy(desc(devotionals.date))
      .limit(30);
  } catch {
    items = [];
  }

  return (
    <article className="px-6 pt-20 pb-24">
      <div className="mx-auto max-w-4xl">
        <IssueKicker parts={["Daily", "Devotionals"]} />
        <h1 className="mt-3 font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
          A short reflection. Every morning.
        </h1>
        <p className="mt-6 font-pullquote italic text-xl md:text-2xl text-olive leading-relaxed max-w-2xl">
          A passage, a thought, a prayer. Read it before the kids are up, before
          you check the phone.
        </p>

        {items.length === 0 ? (
          <p className="mt-16 font-body text-base text-olive">
            Devotionals are being prepared. Check back soon, or{" "}
            <Link href="/subscribe" className="text-brass underline underline-offset-4">
              subscribe to the weekly letter
            </Link>{" "}
            in the meantime.
          </p>
        ) : (
          <ul className="mt-16 divide-y divide-stone/60">
            {items.map((d) => (
              <li key={d.id} className="py-5 grid grid-cols-[7rem_1fr_auto] gap-4 items-baseline">
                <span className="font-body text-xs text-olive uppercase tracking-[0.18em]">
                  {d.date}
                </span>
                <Link
                  href={`/devotionals/${d.id}`}
                  className="font-display text-xl tracking-tight hover:text-brass"
                >
                  {d.title}
                </Link>
                <span className="font-body text-sm text-olive">
                  {d.scriptureReference}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
