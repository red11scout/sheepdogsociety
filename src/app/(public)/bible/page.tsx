import type { Metadata } from "next";
import Link from "next/link";
import { Kicker } from "@/components/public/kicker";
import { BiblePicker } from "@/components/bible/bible-picker";
import { Ambient } from "@/components/motion/Ambient";
import { booksByGenre } from "@/lib/bible/books";

export const metadata: Metadata = {
  title: "Bible — Sheepdog Society",
  description:
    "Read the Bible in the English Standard Version. Sixty-six books, plain text, no clutter.",
};

/**
 * Bible landing: hero, the shepherd's charge (featured chapter entry),
 * and all 66 books grouped by literary genre — a server-rendered,
 * JS-free discovery path. Task 4 adds the interactive picker to the hero.
 * No API calls here: the landing never depends on ESV uptime.
 */
export default function BibleLandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="nw-hero relative bg-background text-foreground">
        <Ambient soft />
        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-16 md:px-10 md:pt-24">
          <Kicker left="The Bible" right="English Standard Version" />
          <h1 className="display-xl mt-8 max-w-4xl text-display-xl">
            Open the <em>Word</em>.
          </h1>
          <p className="dropcap mt-8 max-w-2xl text-lede leading-relaxed text-muted-foreground">
            The whole Bible, plain and unhurried. No account, no clutter,
            nothing between you and the text. Pick a book below, or jump
            straight to a chapter.
          </p>
          <div className="mt-8">
            <BiblePicker variant="hero" />
          </div>
        </div>
      </section>

      {/* Featured chapter — the verse this society is named for.
          VERBATIM ESV (Acts 20:28) — do not reword a single character. */}
      <section className="ember-band mt-16 md:mt-24">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center md:px-10 md:py-24">
          <p className="section-mark">§ The shepherd&rsquo;s charge · Acts 20:28</p>
          <blockquote className="mt-8 font-pullquote text-2xl italic leading-relaxed md:text-3xl">
            &ldquo;Pay careful attention to yourselves and to all the flock,
            in which the Holy Spirit has made you overseers, to care for the
            church of God, which he obtained with his own blood.&rdquo;
          </blockquote>
          <p className="folio mt-6">English Standard Version</p>
          <Link
            href="/bible/acts/20#v28"
            className="link-editorial mt-8 inline-block text-sm"
          >
            Read Acts 20
          </Link>
        </div>
      </section>

      {/* All 66 books, grouped by genre (the picker's taxonomy, on the page). */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        {booksByGenre().map(({ genre, books }) => (
          <div key={genre} className="mt-12 first:mt-0">
            <Kicker
              left={genre}
              right={`${books.length} ${books.length === 1 ? "book" : "books"}`}
            />
            <div className="mt-4 grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-4">
              {books.map((b) => (
                <Link
                  key={b.slug}
                  href={`/bible/${b.slug}/1`}
                  className="flex h-11 cursor-pointer items-center justify-between border-b border-foreground/10 px-1 text-sm transition-colors hover:bg-foreground/[0.03] hover:text-brass"
                >
                  <span>{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.chapters}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
