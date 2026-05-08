import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublishedEncouragementBySlug } from "@/server/encouragements";
import { Icon } from "@/components/icons/Icon";
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

export default async function EncouragementPage({
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
      <section className="relative overflow-hidden bg-background text-foreground">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 py-20 md:px-12 md:py-28">
          <Link
            href="/encouragements"
            className="inline-flex items-center gap-2 section-mark text-stone/60 hover:text-brass"
          >
            <Icon name="arrow-right" size={12} className="rotate-180" />
            All encouragements
          </Link>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="section-mark text-brass">
              No. {row.issueNumber}
            </span>
            {row.publishDate && (
              <span className="section-mark text-stone/55">
                {format(new Date(row.publishDate), "MMMM d, yyyy")}
              </span>
            )}
            {(row as { theme?: string | null }).theme && (
              <span className="section-mark text-stone/55">
                · {(row as { theme?: string | null }).theme}
              </span>
            )}
          </div>
          <h1 className="display-xl mt-6 max-w-4xl text-[clamp(2.5rem,7vw,6rem)] text-foreground">
            {row.title}
          </h1>
          {row.intro && (
            <p className="mt-10 max-w-2xl font-pullquote text-xl italic leading-relaxed text-stone md:text-2xl">
              {row.intro}
            </p>
          )}
        </div>
      </section>

      {/* Cover image */}
      {row.coverImageUrl && (
        <section className="bg-background">
          <div className="mx-auto max-w-5xl px-6 md:px-12">
            <div className="aspect-[16/9] overflow-hidden">
              <Image
                src={row.coverImageUrl}
                alt={row.coverImageAlt ?? ""}
                width={1600}
                height={900}
                unoptimized
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </div>
        </section>
      )}

      {/* Updates */}
      {updatesLines.length > 0 && (
        <section className="bg-bone text-ink">
          <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
            <div className="flex items-center gap-4">
              <span className="section-mark">§ This Week</span>
              <div className="hairline flex-1" />
            </div>
            <ul className="mt-8 space-y-4">
              {updatesLines.map((line, i) => (
                <li
                  key={i}
                  className="flex gap-4 text-base leading-relaxed text-iron/80 md:text-lg"
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
            <div className="flex items-center gap-4">
              <span className="section-mark text-brass">§ Scriptures</span>
              <div className="hairline flex-1" />
            </div>
            <ul className="mt-8 space-y-6">
              {scriptures.map((s, i) => (
                <li key={i} className="border-l-2 border-brass pl-6">
                  <div className="display-xl text-xl text-foreground md:text-2xl">
                    {s.ref}
                  </div>
                  {s.note && (
                    <p className="mt-3 font-pullquote text-base italic leading-relaxed text-stone md:text-lg">
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
        <section className="bg-bone text-ink">
          <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
            <div className="flex items-center gap-4">
              <span className="section-mark">§ Guidance</span>
              <div className="hairline flex-1" />
            </div>
            <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-iron/80 md:text-lg">
              {row.guidance}
            </div>
          </div>
        </section>
      )}

      {/* Notes */}
      {row.notes && (
        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
            <div className="flex items-center gap-4">
              <span className="section-mark text-brass">§ Notes from the Watch</span>
              <div className="hairline flex-1" />
            </div>
            <div className="mt-8 whitespace-pre-wrap font-pullquote text-lg italic leading-relaxed text-stone md:text-xl">
              {row.notes}
            </div>
          </div>
        </section>
      )}

      {/* Footer CTAs */}
      <section className="bg-bone text-ink">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center md:px-12 md:py-28">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/encouragements"
              className="lift inline-flex h-11 items-center gap-2 border border-iron bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-background/90"
            >
              All encouragements
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/get-started"
              className="lift inline-flex h-11 items-center gap-2 border border-iron/30 bg-transparent px-6 text-sm font-medium text-iron transition-colors hover:border-iron"
            >
              Join the brotherhood
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
