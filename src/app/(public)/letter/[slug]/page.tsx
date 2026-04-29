import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { letters, users } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { IssueKicker } from "@/components/public/issue-kicker";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getLetter(slug: string) {
  try {
    const [row] = await db
      .select({
        id: letters.id,
        slug: letters.slug,
        issueNumber: letters.issueNumber,
        title: letters.title,
        subtitle: letters.subtitle,
        themeWord: letters.themeWord,
        bodyHtml: letters.bodyHtml,
        publishedAt: letters.publishedAt,
        coverImageUrl: letters.coverImageUrl,
        authorName: users.name,
        authorImage: users.image,
      })
      .from(letters)
      .leftJoin(users, eq(letters.authorId, users.id))
      .where(
        and(
          eq(letters.slug, slug),
          eq(letters.status, "published"),
          isNull(letters.deletedAt)
        )
      )
      .limit(1);
    return row;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const letter = await getLetter(slug);
  if (!letter) return { title: "Not found" };
  return {
    title: `${letter.title} — Issue No. ${letter.issueNumber}`,
    description: letter.subtitle ?? undefined,
    openGraph: {
      title: letter.title,
      description: letter.subtitle ?? undefined,
      type: "article",
    },
  };
}

export default async function LetterPage({ params }: PageProps) {
  const { slug } = await params;
  const letter = await getLetter(slug);
  if (!letter) notFound();

  const dateLabel = letter.publishedAt
    ? letter.publishedAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <article className="px-6 pt-16 pb-24">
      <div className="mx-auto max-w-3xl">
        <IssueKicker
          parts={[
            `Issue No. ${letter.issueNumber}`,
            letter.themeWord,
            dateLabel,
          ]}
        />
        <h1 className="mt-4 font-display text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
          {letter.title}
        </h1>
        {letter.subtitle ? (
          <p className="mt-6 font-pullquote italic text-xl md:text-2xl text-olive leading-relaxed">
            {letter.subtitle}
          </p>
        ) : null}

        {letter.authorName ? (
          <p className="mt-8 font-body text-sm text-olive">
            By {letter.authorName}
          </p>
        ) : null}
      </div>

      {letter.coverImageUrl ? (
        <figure className="mx-auto max-w-5xl my-12">
          {/* next/image swap deferred — coverImageUrl can be Blob/external */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={letter.coverImageUrl}
            alt={letter.title}
            className="w-full aspect-[16/9] object-cover"
          />
        </figure>
      ) : (
        <div className="mx-auto max-w-5xl my-12 aspect-[16/9] bg-stone/30 border border-stone/60" />
      )}

      <div
        className="mx-auto max-w-[65ch] font-body text-[19px] leading-[1.65] [&_h2]:font-display [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-12 [&_h2]:mb-4 [&_p]:mb-6 [&_blockquote]:font-pullquote [&_blockquote]:italic [&_blockquote]:text-2xl [&_blockquote]:border-l-2 [&_blockquote]:border-brass [&_blockquote]:pl-6 [&_blockquote]:my-8 [&_a]:text-brass [&_a]:underline [&_a]:underline-offset-4"
        dangerouslySetInnerHTML={{ __html: letter.bodyHtml }}
      />

      <footer className="mx-auto max-w-3xl mt-16 pt-8 border-t border-stone">
        <Link
          href="/letter"
          className="font-body text-sm text-brass hover:text-iron underline underline-offset-4"
        >
          ← All issues
        </Link>
      </footer>
    </article>
  );
}
