import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { Kicker } from "@/components/public/kicker";
import { BiblePicker } from "@/components/bible/bible-picker";
import { Scripture } from "@/components/bible/scripture";
import { VerseScroll } from "@/components/bible/verse-scroll";
import { getESVChapter, type ChapterResult } from "@/lib/bible/chapter";
import { getBookBySlug, nextChapter, prevChapter } from "@/lib/bible/books";

// Per-path full-route cache, matching the 24h ESV data cache. No
// generateStaticParams: 1,189 chapters build on demand, not at deploy.
export const revalidate = 86400;

type Params = Promise<{ book: string; chapter: string }>;

function validate(bookSlug: string, chapterParam: string) {
  const book = getBookBySlug(bookSlug);
  const chapter = Number(chapterParam);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return null;
  }
  return { book, chapter };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { book: bookSlug, chapter: chapterParam } = await params;
  const valid = validate(bookSlug, chapterParam);
  if (!valid) return { title: "Bible — Sheepdog Society" };
  const { book, chapter } = valid;
  return {
    title: `${book.name} ${chapter} — ESV — Sheepdog Society`,
    description: `Read ${book.name} ${chapter} in the English Standard Version. Plain scripture, no clutter.`,
  };
}

export default async function BibleChapterPage({ params }: { params: Params }) {
  const { book: bookSlug, chapter: chapterParam } = await params;
  const valid = validate(bookSlug, chapterParam);
  if (!valid) notFound();
  const { book, chapter } = valid;

  let result: ChapterResult | null = null;
  let unavailable = false;
  try {
    result = await getESVChapter(book.slug, chapter);
  } catch {
    // Both ESV and the WEB fallback failed — render the calm state below.
    unavailable = true;
  }
  if (!unavailable && !result) notFound();

  const prev = prevChapter(book.slug, chapter);
  const next = nextChapter(book.slug, chapter);
  const translationLabel =
    result?.translation === "WEB" ? "World English Bible" : "English Standard Version";

  const chevron = (
    ref: { book: { slug: string; name: string }; chapter: number } | null,
    dir: "prev" | "next"
  ) =>
    ref ? (
      <Link
        href={`/bible/${ref.book.slug}/${ref.chapter}`}
        aria-label={`${dir === "prev" ? "Previous" : "Next"} chapter: ${ref.book.name} ${ref.chapter}`}
        className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border border-foreground/15 text-foreground/70 transition-colors hover:border-brass hover:text-brass"
      >
        <Icon name={dir === "prev" ? "chevron-left" : "chevron-right"} size={16} />
      </Link>
    ) : (
      <span
        aria-hidden="true"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-foreground/10 text-foreground/20"
      >
        <Icon name={dir === "prev" ? "chevron-left" : "chevron-right"} size={16} />
      </span>
    );

  return (
    <>
      <VerseScroll />

      {/* Apparatus header — prev / reference / next. Scrolls away with the
          page; the site's slim nav is the only pinned chrome. */}
      <div className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 px-4 py-4">
          {chevron(prev, "prev")}
          <BiblePicker current={{ bookSlug: book.slug, chapter }} />
          {chevron(next, "next")}
        </div>
      </div>

      {/* The reading surface — 660px measure, the study's money value
          (41.25rem = 660px; an arbitrary width, not a display-scale clamp,
          so it does not trip the Phase 2 front-page type exception). */}
      <article className="mx-auto w-full max-w-[41.25rem] px-6 pb-16 sm:px-4 md:px-0">
        <Kicker left="The Bible" right={translationLabel} className="mt-10" />

        {result?.fallback && (
          <p className="mt-6 border border-brass/40 bg-brass/10 px-4 py-3 text-sm">
            The ESV text is unavailable right now. You are reading the World
            English Bible, a public-domain translation, until it returns.
          </p>
        )}

        {/* Ceremonial chapter heading — 36px display-soft under 88px of
            air (mt-22 = 5.5rem; the study's h1 margin). */}
        <h1 className="display-soft mt-22 text-4xl">
          {book.name} {chapter}
        </h1>

        {unavailable ? (
          <p className="mt-8 text-lede leading-relaxed text-muted-foreground">
            We could not load this chapter. Give it a moment, then try again.
          </p>
        ) : (
          <div className="mt-8">
            <Scripture paragraphs={result?.paragraphs ?? []} />
          </div>
        )}

        {/* End-of-chapter prev/next — our upgrade over the benchmark (its
            one UX gap: nav only in the header). */}
        <nav aria-label="Chapter navigation" className="mt-16 grid grid-cols-2 border-y border-foreground/15">
          {prev ? (
            <Link
              href={`/bible/${prev.book.slug}/${prev.chapter}`}
              className="group flex min-h-14 cursor-pointer flex-col justify-center gap-1 border-r border-foreground/10 px-4 py-3 transition-colors hover:bg-foreground/[0.03]"
            >
              <span className="folio">Previous</span>
              <span className="text-sm font-medium transition-colors group-hover:text-brass">
                ← {prev.book.name} {prev.chapter}
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" className="border-r border-foreground/10 px-4 py-3" />
          )}
          {next ? (
            <Link
              href={`/bible/${next.book.slug}/${next.chapter}`}
              className="group flex min-h-14 cursor-pointer flex-col items-end justify-center gap-1 px-4 py-3 text-right transition-colors hover:bg-foreground/[0.03]"
            >
              <span className="folio">Next</span>
              <span className="text-sm font-medium transition-colors group-hover:text-brass">
                {next.book.name} {next.chapter} →
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" className="px-4 py-3" />
          )}
        </nav>

        {/* Attribution at the end of the scroll — required by Crossway on
            every reader page; WEB pages show the public-domain line. */}
        {!unavailable && (
          <footer className="mt-10 text-xs leading-relaxed text-muted-foreground">
            {result?.translation === "WEB" ? (
              <p>
                This chapter is shown from the World English Bible, which is in
                the public domain.
              </p>
            ) : (
              <p>
                Scripture quotations are from the ESV® Bible (The Holy Bible,
                English Standard Version®), copyright © 2001 by Crossway, a
                publishing ministry of Good News Publishers. Used by
                permission. All rights reserved. You may not copy or download
                more than 500 consecutive verses of the ESV Bible or more than
                one half of any book of the ESV Bible.{" "}
                <a
                  href="https://www.esv.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-editorial"
                >
                  esv.org
                </a>
              </p>
            )}
          </footer>
        )}
      </article>
    </>
  );
}
