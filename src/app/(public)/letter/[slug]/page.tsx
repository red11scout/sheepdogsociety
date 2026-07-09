import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublishedEncouragementBySlug } from "@/server/encouragements";
import { Icon } from "@/components/icons/Icon";
import { Kicker } from "@/components/public/kicker";
import { LetterCover } from "@/components/letters/LetterCover";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let row;
  try {
    row = await getPublishedEncouragementBySlug(slug);
  } catch {
    row = null;
  }
  if (!row) return { title: "Encouragement — Sheepdog Society" };
  return {
    title: `${row.title} — Sheepdog Society`,
    description: row.intro ?? "Weekly encouragement.",
    openGraph: {
      title: row.title,
      description: row.intro ?? undefined,
      images: row.coverImageUrl ? [{ url: row.coverImageUrl }] : undefined,
    },
  };
}

export default async function LetterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let row;
  try {
    row = await getPublishedEncouragementBySlug(slug);
  } catch {
    row = null;
  }
  if (!row) notFound();

  const scriptures = Array.isArray(row.scriptures)
    ? (row.scriptures as { ref: string; note?: string }[])
    : [];
  const updatesLines = (row.updates ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <>
      {/* Hero */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-12 md:py-28">
          <Link
            href="/letter"
            className="link-editorial inline-flex items-center gap-2 text-sm text-foreground/70"
          >
            <Icon name="arrow-right" size={12} className="rotate-180" />
            All letters
          </Link>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="section-mark text-brass">
              No. {row.issueNumber}
            </span>
            {row.publishDate && (
              <span className="folio">
                {format(new Date(row.publishDate), "MMMM d, yyyy")}
              </span>
            )}
            {(row as { theme?: string | null }).theme && (
              <span className="folio">
                · {(row as { theme?: string | null }).theme}
              </span>
            )}
          </div>
          <h1 className="display-soft mt-6 max-w-4xl text-display-lg">
            {row.title}
          </h1>
          {row.intro && (
            <p className="dropcap mt-10 max-w-2xl font-scripture text-lg text-foreground/85">
              {row.intro}
            </p>
          )}
        </div>
      </section>

      {/* Cover. Real uploaded image wins; otherwise the deterministic
       *  SVG keyed off the letter's theme so every published letter
       *  carries a visual anchor — no naked title pages in the
       *  archive. */}
      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <div className="aspect-[16/9] overflow-hidden border border-foreground/15">
            {row.coverImageUrl ? (
              <Image
                src={row.coverImageUrl}
                alt={row.coverImageAlt ?? ""}
                width={1600}
                height={900}
                unoptimized
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <LetterCover
                id={row.id}
                title={row.title}
                theme={(row as { theme?: string | null }).theme}
                className="h-full w-full"
              />
            )}
          </div>
        </div>
      </section>

      {/* Updates */}
      {updatesLines.length > 0 && (
        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
            <Kicker left="This Week" />
            <ul className="mt-8 space-y-4">
              {updatesLines.map((line, i) => (
                <li
                  key={i}
                  className="flex gap-4 text-base leading-relaxed text-foreground/80 md:text-lg"
                >
                  <span
                    className="mt-3 inline-block h-px w-4 shrink-0 bg-brass"
                    aria-hidden
                  />
                  {line.replace(/^[-*•]\s*/, "")}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Scriptures */}
      {scriptures.length > 0 && (
        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
            <Kicker left="Scriptures" />
            <ul className="mt-8 space-y-6">
              {scriptures.map((s, i) => (
                <li key={i} className="border-l-2 border-brass pl-6">
                  <div className="display-xl text-xl text-foreground md:text-2xl">
                    {s.ref}
                  </div>
                  {s.note && (
                    <p className="mt-3 font-pullquote text-base italic leading-relaxed text-muted-foreground md:text-lg">
                      {s.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Guidance */}
      {row.guidance && (
        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
            <Kicker left="Guidance" />
            <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-foreground/80 md:text-lg">
              {row.guidance}
            </div>
          </div>
        </section>
      )}

      {/* Notes */}
      {row.notes && (
        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
            <Kicker left="Notes from the Watch" />
            <div className="mt-8 whitespace-pre-wrap font-pullquote text-lg italic leading-relaxed text-muted-foreground md:text-xl">
              {row.notes}
            </div>
          </div>
        </section>
      )}

      {/* Footer CTAs */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center md:px-12 md:py-28">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/letter"
              className="lift inline-flex h-11 items-center gap-2 bg-foreground px-6 text-sm font-medium text-background"
            >
              All letters
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/join"
              className="link-editorial text-sm text-foreground/80"
            >
              Join the brotherhood
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
