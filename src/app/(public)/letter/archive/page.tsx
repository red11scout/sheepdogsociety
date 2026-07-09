import Link from "next/link";
import type { Metadata } from "next";
import { listPublishedEncouragements } from "@/server/encouragements";
import { Kicker } from "@/components/public/kicker";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Letter archive — Sheepdog Society",
  description: "Every issue of the Letter, newest to oldest. Scripture, guidance, a word from the Watch.",
};

export default async function LetterArchivePage() {
  let rows: Awaited<ReturnType<typeof listPublishedEncouragements>> = [];
  try {
    rows = await listPublishedEncouragements();
  } catch {
    rows = [];
  }

  return (
    <section className="bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16 md:px-10 md:py-24">
        <Kicker left="The archive" right={`${rows.length} issue${rows.length === 1 ? "" : "s"}`} />
        <h1 className="display-xl mt-10 text-display-lg">
          Every letter, <em>on the record.</em>
        </h1>

        {rows.length === 0 ? (
          <p className="mt-10 font-pullquote text-lede italic text-muted-foreground">
            The first letter is on the way.
          </p>
        ) : (
          <ul className="mt-10 divide-y divide-foreground/10 border-y border-foreground/15">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/letter/${row.slug}`}
                  className="group grid cursor-pointer gap-2 py-5 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[90px_130px_1fr_auto] md:items-baseline md:gap-6"
                >
                  <span className="section-mark">No. {row.issueNumber}</span>
                  <span className="folio">
                    {row.publishDate
                      ? format(new Date(row.publishDate), "MMM d, yyyy")
                      : ""}
                  </span>
                  <span className="font-display text-lg transition-colors group-hover:text-brass">
                    {row.title}
                  </span>
                  {row.theme && (
                    <span className="folio hidden md:inline">{row.theme}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link href="/letter" className="link-editorial mt-10 inline-block text-sm">
          ← Latest letters
        </Link>
      </div>
    </section>
  );
}
