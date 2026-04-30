import Link from "next/link";
import Image from "next/image";
import { listPublishedEncouragements } from "@/server/encouragements";
import { Icon } from "@/components/icons/Icon";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Weekly Encouragements — Sheepdog Society",
  description:
    "Each week: a word from the Watch. Updates, scriptures, guidance, notes.",
};

export default async function EncouragementsListPage() {
  let rows: Awaited<ReturnType<typeof listPublishedEncouragements>> = [];
  try {
    rows = await listPublishedEncouragements();
  } catch {
    rows = [];
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-bone text-iron">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Weekly Encouragements</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6rem)]">
            A word from
            <br />
            <span className="text-brass">the Watch.</span>
          </h1>
          <p className="mt-10 max-w-2xl font-pullquote text-xl italic leading-relaxed text-iron/70 md:text-2xl">
            Each week. Updates. Scriptures. Guidance. Notes. Read on the site,
            or save the page and carry it with you.
          </p>
        </div>
      </section>

      {/* List */}
      <section className="bg-bone text-iron">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-28">
          {rows.length === 0 ? (
            <div className="border border-dashed border-iron/15 p-16 text-center">
              <Icon name="sparkles" size={48} className="mx-auto text-brass" />
              <h2 className="display-xl mt-8 text-2xl text-iron md:text-3xl">
                The first encouragement is on the way.
              </h2>
              <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-iron/60">
                Brothers are writing it. Sign up below to get it the moment it
                lands.
              </p>
            </div>
          ) : (
            <ul className="grid gap-px bg-iron/10 md:grid-cols-2">
              {rows.map((row) => (
                <li key={row.id} className="bg-bone">
                  <Link
                    href={`/encouragements/${row.slug}`}
                    className="lift group/card block p-8 transition-colors hover:bg-bone/60 md:p-12"
                  >
                    {row.coverImageUrl && (
                      <div className="-mx-8 -mt-8 mb-8 aspect-[16/9] overflow-hidden md:-mx-12 md:-mt-12 md:mb-10">
                        <Image
                          src={row.coverImageUrl}
                          alt={row.coverImageAlt ?? ""}
                          width={1200}
                          height={675}
                          unoptimized
                          className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="section-mark text-brass">
                        No. {row.issueNumber}
                      </span>
                      {row.publishDate && (
                        <span className="section-mark text-iron/40">
                          {format(new Date(row.publishDate), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                    <h3 className="display-xl mt-6 text-2xl text-iron md:text-3xl">
                      {row.title}
                    </h3>
                    {row.intro && (
                      <p className="mt-4 line-clamp-3 text-base leading-relaxed text-iron/70">
                        {row.intro}
                      </p>
                    )}
                    <div className="mt-8 inline-flex items-center gap-2 section-mark text-brass">
                      Read this week&rsquo;s
                      <Icon
                        name="arrow-right"
                        size={14}
                        className="transition-transform group-hover/card:translate-x-1"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
