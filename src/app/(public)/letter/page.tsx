import { Fragment } from "react";
import { Ambient } from "@/components/motion/Ambient";
import Link from "next/link";
import Image from "next/image";
import { isOptimizableImage } from "@/lib/images";
import { listPublishedEncouragements } from "@/server/encouragements";
import { Icon } from "@/components/icons/Icon";
import { Kicker } from "@/components/public/kicker";
import { StaggerReveal } from "@/components/motion/StaggerReveal";
import { LetterCover } from "@/components/letters/LetterCover";
import { format } from "date-fns";
import { getSiteTextMap } from "@/lib/site-text/get";
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge } from "@/lib/studio/config";

// ISR: cached for a minute, and every admin write that touches this
// surface calls revalidatePath, so a publish shows up at once.
export const revalidate = 60;

export const metadata = {
  title: "The Letter — Sheepdog Society",
  description:
    "One letter a week. Scripture, guidance, and a word from the Watch.",
};

export default async function LetterIndexPage() {
  let rows: Awaited<ReturnType<typeof listPublishedEncouragements>> = [];
  try {
    rows = await listPublishedEncouragements();
  } catch {
    rows = [];
  }
  const [t, config] = await Promise.all([getSiteTextMap(), getStudioConfig()]);
  // The current issue gets the front page; the rest file into the archive.
  const [current, ...archive] = rows;

  const sections: Record<string, React.ReactNode> = {
    hero: (
      <section className="nw-hero bg-background text-foreground">
          <Ambient soft />
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 md:px-10 md:pt-24">
          <Kicker left="The Letter" right="Sunday mornings · Read in five minutes" />
          <h1 className="display-xl mt-10 text-display-xl">
            {t["letter.hero.headline1"]}
            <br />
            <em>{t["letter.hero.headline2"]}</em>
          </h1>
          <p className="mt-8 max-w-2xl font-pullquote text-lede italic text-muted-foreground">
            Scripture, guidance, a word from the Watch. Read it before the day
            starts. Save it, carry it, hand it to a brother.
          </p>
        </div>
      </section>
    ),
    "issue-grid": (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
          {rows.length === 0 ? (
            <div className="border border-dashed border-foreground/15 p-16 text-center">
              <Icon name="sparkles" size={48} className="mx-auto text-brass" />
              <h2 className="display-soft mt-8 text-2xl md:text-3xl">
                {t["letter.empty.heading"]}
              </h2>
              {/* Copy fix, deliberate: the elevated index has no inline
                  signup form, so "below" would point at nothing. Signup
                  lives at /join. */}
              <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-muted-foreground">
                {t["letter.empty.body"]}
              </p>
            </div>
          ) : (
            <>
              {/* Front page: the current issue alone, full width. One letter
                  a week deserves a front page, not first place in a bin. */}
              <Link
                href={`/letter/${current.slug}`}
                className="group/front block"
              >
                <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
                  <div className="paper-card overflow-hidden">
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                      {current.coverImageUrl ? (
                        <Image
                          src={current.coverImageUrl}
                          alt={current.coverImageAlt ?? ""}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          unoptimized={!isOptimizableImage(current.coverImageUrl)}
                          className="object-cover transition-transform duration-700 group-hover/front:scale-[1.04]"
                        />
                      ) : (
                        <LetterCover
                          id={current.id}
                          title={current.title}
                          theme={current.theme}
                          className="h-full w-full transition-transform duration-700 group-hover/front:scale-[1.04]"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="folio">
                      No. {current.issueNumber}
                      {current.publishDate && (
                        <> · {format(new Date(current.publishDate), "MMMM d, yyyy")}</>
                      )}
                    </p>
                    <h2 className="display-soft mt-4 text-3xl md:text-4xl">
                      {current.title}
                    </h2>
                    {current.intro && (
                      <p className="mt-4 line-clamp-4 text-base leading-relaxed text-muted-foreground">
                        {current.intro}
                      </p>
                    )}
                    <p className="section-mark mt-6 inline-flex items-center gap-2 transition-colors group-hover/front:text-brass">
                      Read this week&rsquo;s
                      <Icon
                        name="arrow-right"
                        size={14}
                        className="transition-transform group-hover/front:translate-x-1"
                      />
                    </p>
                  </div>
                </div>
              </Link>

              {archive.length > 0 && (
                <>
                  <Kicker
                    left="The archive"
                    right={`${archive.length} back issue${archive.length === 1 ? "" : "s"}`}
                    className="mt-20"
                  />
                  <StaggerReveal
                    className="mt-8 grid gap-6 md:grid-cols-2"
                    selector=":scope > a"
                  >
                    {archive.map((row) => (
                      <Link
                        key={row.id}
                        href={`/letter/${row.slug}`}
                        className="paper-card lift group/card block overflow-hidden"
                      >
                        {/* Real uploaded cover wins; else the deterministic SVG
                            keyed by theme so the archive reads as one series. */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden">
                          {row.coverImageUrl ? (
                            <Image
                              src={row.coverImageUrl}
                              alt={row.coverImageAlt ?? ""}
                              fill
                              sizes="(max-width: 768px) 100vw, 50vw"
                              unoptimized={!isOptimizableImage(row.coverImageUrl)}
                              className="object-cover transition-transform duration-500 group-hover/card:scale-[1.03]"
                            />
                          ) : (
                            <LetterCover
                              id={row.id}
                              title={row.title}
                              theme={row.theme}
                              className="h-full w-full transition-transform duration-500 group-hover/card:scale-[1.03]"
                            />
                          )}
                        </div>
                        <div className="p-6 md:p-8">
                          <p className="folio">
                            No. {row.issueNumber}
                            {row.publishDate && (
                              <> · {format(new Date(row.publishDate), "MMM d, yyyy")}</>
                            )}
                          </p>
                          <h3 className="display-soft mt-3 text-2xl md:text-3xl">
                            {row.title}
                          </h3>
                          {row.intro && (
                            <p className="mt-3 line-clamp-3 text-base leading-relaxed text-muted-foreground">
                              {row.intro}
                            </p>
                          )}
                          <p className="section-mark mt-5 inline-flex items-center gap-2">
                            Read No. {row.issueNumber}
                            <Icon
                              name="arrow-right"
                              size={14}
                              className="transition-transform group-hover/card:translate-x-1"
                            />
                          </p>
                        </div>
                      </Link>
                    ))}
                  </StaggerReveal>
                </>
              )}
              <div className="mt-10">
                <Link href="/letter/archive" className="link-editorial text-sm">
                  The full archive
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    ),
  };

  return (
    <>
      {renderMerge("letter", config)
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{sections[s.id]}</Fragment>
        ))}
    </>
  );
}
