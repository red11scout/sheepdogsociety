import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { letters } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { Icon } from "@/components/icons/Icon";
import { format } from "date-fns";

export const revalidate = 60;

async function getLetter(slug: string) {
  try {
    const [row] = await db
      .select()
      .from(letters)
      .where(
        and(
          eq(letters.slug, slug),
          eq(letters.status, "published"),
          isNull(letters.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const letter = await getLetter(slug);
  if (!letter) return { title: "The Letter — Sheepdog Society" };
  return {
    title: `${letter.title} — The Letter №${letter.issueNumber}`,
    description: letter.metaDescription ?? letter.excerpt ?? letter.subtitle ?? undefined,
    openGraph: {
      title: letter.title,
      description: letter.metaDescription ?? letter.excerpt ?? undefined,
      images: letter.coverImageUrl ? [letter.coverImageUrl] : undefined,
    },
  };
}

export default async function LetterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const letter = await getLetter(slug);
  if (!letter) notFound();

  return (
    <article className="bg-bone">
      {/* Letter header */}
      <header className="bg-iron text-bone">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-12 md:py-28">
          <div className="flex items-center gap-4">
            <span className="section-mark">
              § Letter № {letter.issueNumber}
              {letter.themeWord ? ` · ${letter.themeWord}` : ""}
            </span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 text-[clamp(2.25rem,6vw,5rem)] text-bone">
            {letter.title}
          </h1>
          {letter.subtitle && (
            <p className="mt-6 font-pullquote text-xl italic text-bone/80 md:text-2xl">
              {letter.subtitle}
            </p>
          )}
          {letter.publishedAt && (
            <p className="mt-10 section-mark text-stone/60">
              Sent {format(letter.publishedAt, "EEEE, MMMM d, yyyy")}
            </p>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-2xl px-6 py-20 md:px-12 md:py-28">
        {letter.bodyHtml ? (
          <div
            className="font-display text-lg leading-[1.7] text-iron prose-headings:font-display prose-headings:text-iron prose-blockquote:border-l-2 prose-blockquote:border-brass prose-blockquote:pl-6 prose-blockquote:font-pullquote prose-blockquote:italic prose-blockquote:text-iron/80 prose-a:text-brass prose-a:underline prose-a:decoration-brass/40 prose-a:underline-offset-4 hover:prose-a:text-gold prose-em:font-pullquote prose-em:not-italic prose-em:text-iron/85 prose-strong:text-iron"
            dangerouslySetInnerHTML={{ __html: letter.bodyHtml }}
          />
        ) : (
          <p className="font-pullquote text-xl italic text-iron/60">
            This letter is in draft.
          </p>
        )}
      </div>

      {/* Footer band */}
      <div className="border-t border-iron/15 bg-bone">
        <div className="mx-auto max-w-3xl px-6 py-12 md:px-12">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <Link
              href="/letter"
              className="section-mark text-brass hover:opacity-70"
            >
              ← All letters
            </Link>
            <Link
              href="/join"
              className="lift inline-flex h-11 items-center gap-3 bg-iron px-5 text-xs font-medium uppercase tracking-[0.18em] text-bone transition-colors hover:bg-iron/90"
            >
              Get the next one
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
