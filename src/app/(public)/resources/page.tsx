import Link from "next/link";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { IssueKicker } from "@/components/public/issue-kicker";

export const metadata = {
  title: "Resources — Acts 2028 Sheepdog Society",
  description:
    "Study guides, books, and references for Christian men. Free to read, free to share.",
};

export default async function ResourcesIndexPage() {
  let items: Array<typeof resources.$inferSelect> = [];
  try {
    items = await db
      .select()
      .from(resources)
      .where(eq(resources.isPublic, true))
      .orderBy(desc(resources.createdAt))
      .limit(60);
  } catch {
    items = [];
  }

  return (
    <article className="px-6 pt-20 pb-24">
      <div className="mx-auto max-w-5xl">
        <IssueKicker parts={["Resources"]} />
        <h1 className="mt-3 font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
          Things worth reading.
        </h1>
        <p className="mt-6 font-pullquote italic text-xl md:text-2xl text-olive max-w-3xl leading-relaxed">
          Study guides, books, and references. Curated, not crammed.
        </p>

        {items.length === 0 ? (
          <p className="mt-16 font-body text-base text-olive">
            We&apos;re building the library. The first wave of study guides will be
            posted before the first issue of The Letter.
          </p>
        ) : (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((r) => (
              <Link
                key={r.id}
                href={`/resources/${r.id}`}
                className="block border border-stone p-6 hover:border-iron transition-colors"
              >
                <p className="font-body uppercase tracking-[0.18em] text-xs text-brass">
                  {r.type} {r.category ? `· ${r.category}` : ""}
                </p>
                <h3 className="mt-3 font-display text-xl md:text-2xl font-semibold tracking-tight">
                  {r.title}
                </h3>
                {r.description ? (
                  <p className="mt-3 font-body text-sm text-olive line-clamp-2">
                    {r.description}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
