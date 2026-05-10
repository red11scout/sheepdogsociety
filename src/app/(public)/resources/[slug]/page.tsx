import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPublicResourceBySlug } from "@/server/resources-admin";
import { Icon } from "@/components/icons/Icon";
import { format } from "date-fns";
import { PrintButton } from "./print-button";
import { ResourceBody } from "./resource-body";
import { Embed } from "./embed";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let row;
  try {
    row = await getPublicResourceBySlug(slug);
  } catch {
    row = null;
  }
  if (!row) return { title: "Resource — Sheepdog Society" };
  return {
    title: `${row.title} — Sheepdog Society`,
    description: row.summary || row.title,
  };
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let row;
  try {
    row = await getPublicResourceBySlug(slug);
  } catch {
    row = null;
  }
  if (!row) notFound();

  const downloadUrl = row.fileKey || row.url || "";
  const isDocx =
    row.sourceMime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isPdf = row.sourceMime === "application/pdf";

  // Provider-driven render branch.
  const isYouTube = row.provider === "youtube" && !!row.embedHtml;
  const isAmazonBook = row.provider === "amazon";
  const isWebLink = row.provider === "web" && !!row.url;
  const hasCompanion =
    !!(row.companionUrl || row.companionFileKey);

  const tags = [
    ...(row.booksOfBible ?? []),
    ...(row.topics ?? []),
    ...(row.themes ?? []),
  ];

  return (
    <>
      {/* Action bar — hidden in print */}
      <section className="bg-bone text-ink no-print">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 pb-2 pt-8 md:px-12">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 section-mark text-iron/55 hover:text-brass"
          >
            <Icon name="arrow-right" size={12} className="rotate-180" />
            All resources
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {/* For sermon/book/web resources, show "Open" pointing at the
             *  source. For file-backed rows, show "Download" with the
             *  original filename so the browser saves it cleanly. */}
            {isYouTube && row.url && (
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className="lift inline-flex h-9 items-center gap-2 border border-iron/20 bg-bone px-4 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:border-brass hover:text-brass"
              >
                <Icon name="arrow-up-right" size={12} />
                Watch on YouTube
              </a>
            )}
            {isAmazonBook && row.url && (
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className="lift inline-flex h-9 items-center gap-2 border border-iron/20 bg-bone px-4 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:border-brass hover:text-brass"
              >
                <Icon name="arrow-up-right" size={12} />
                Buy on Amazon
              </a>
            )}
            {isWebLink && row.url && (
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className="lift inline-flex h-9 items-center gap-2 border border-iron/20 bg-bone px-4 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:border-brass hover:text-brass"
              >
                <Icon name="arrow-up-right" size={12} />
                Open link
              </a>
            )}
            {!isYouTube && !isAmazonBook && !isWebLink && downloadUrl && (
              <a
                href={downloadUrl}
                download={row.sourceFilename ?? undefined}
                className="lift inline-flex h-9 items-center gap-2 border border-iron/20 bg-bone px-4 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:border-brass hover:text-brass"
              >
                <Icon name="download" size={12} />
                Download {isPdf ? "PDF" : isDocx ? ".docx" : "file"}
              </a>
            )}
            {row.bodyHtml && <PrintButton title={row.title} />}
          </div>
        </div>
      </section>

      {/* Letterhead — visible on screen and in print */}
      <article className="resource-doc bg-bone text-ink">
        <header className="mx-auto max-w-4xl px-6 pb-10 pt-6 md:px-12 md:pb-14 md:pt-10">
          {/* Print-only branded header */}
          <div className="print-letterhead hidden border-b border-iron/30 pb-4">
            <div className="flex items-center gap-3">
              <Icon name="shield" size={28} className="text-brass" />
              <div>
                <p className="display-xl text-base text-iron">Sheepdog Society</p>
                <p className="section-mark text-iron/55">
                  acts2028sheepdogsociety.com · Acts 20:28
                </p>
              </div>
            </div>
          </div>

          {/* Section-mark + book pills */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {row.section && (
              <span className="section-mark text-brass">
                § {row.section.name}
              </span>
            )}
            {row.estimatedMinutes != null && (
              <span className="section-mark text-iron/45">
                {row.estimatedMinutes} min read
              </span>
            )}
            {row.audience && row.audience !== "all" && (
              <span className="section-mark text-iron/45">
                · For {row.audience === "leader" ? "leaders" : "newcomers"}
              </span>
            )}
          </div>

          <h1 className="display-xl mt-6 text-[clamp(2rem,5vw,4rem)] text-iron">
            {row.title}
          </h1>

          {row.summary && (
            <p className="mt-6 max-w-3xl font-pullquote text-lg italic leading-relaxed text-iron/70 md:text-xl">
              {row.summary}
            </p>
          )}

          {tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5 no-print">
              {(row.booksOfBible ?? []).map((b) => (
                <span
                  key={`b-${b}`}
                  className="inline-flex h-6 items-center border border-brass/40 bg-brass/10 px-2 text-[0.625rem] uppercase tracking-wider text-brass"
                >
                  {b}
                </span>
              ))}
              {(row.topics ?? []).map((t) => (
                <span
                  key={`t-${t}`}
                  className="inline-flex h-6 items-center border border-iron/15 bg-bone px-2 text-[0.625rem] text-iron/70"
                >
                  {t}
                </span>
              ))}
              {(row.themes ?? []).map((th) => (
                <span
                  key={`th-${th}`}
                  className="inline-flex h-6 items-center border border-iron/15 bg-bone px-2 text-[0.625rem] italic text-iron/55"
                >
                  {th}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Body */}
        <div className="mx-auto max-w-3xl px-6 pb-24 md:px-12 md:pb-32">
          <div className="hairline mb-10" />

          {/* Render body OR provider-shaped card. Order matters:
           *   1. YouTube → embedded player (most engaging)
           *   2. Amazon book → cover + buy button + companion section
           *   3. Generic web link → big link card with thumbnail
           *   4. body_html (mammoth-converted) → ResourceBody
           *   5. downloadUrl → file download CTA
           *   6. nothing → placeholder
           */}
          {isYouTube ? (
            <div className="space-y-6">
              <Embed html={row.embedHtml ?? ""} />
              {row.author && (
                <p className="text-xs text-iron/60">
                  From <span className="text-iron">{row.author}</span> on YouTube
                </p>
              )}
            </div>
          ) : isAmazonBook ? (
            <BookCard
              title={row.title}
              author={row.author}
              thumbnailUrl={row.thumbnailUrl}
              buyUrl={row.url ?? ""}
              summary={null}
            />
          ) : isWebLink ? (
            <LinkCard
              title={row.title}
              host={hostFromUrl(row.url ?? "")}
              thumbnailUrl={row.thumbnailUrl}
              url={row.url ?? ""}
            />
          ) : row.bodyHtml ? (
            <ResourceBody html={row.bodyHtml} />
          ) : downloadUrl ? (
            <div className="border border-dashed border-iron/15 bg-bone p-10 text-center">
              <Icon name="download" size={36} className="mx-auto text-brass" />
              <p className="mx-auto mt-6 max-w-md font-pullquote text-base italic text-iron/70">
                This resource is provided as a {isPdf ? "PDF" : "file"}. Tap below to download or open.
              </p>
              <a
                href={downloadUrl}
                download={row.sourceFilename ?? undefined}
                className="lift mt-8 inline-flex h-11 items-center gap-2 bg-brass px-6 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-gold"
              >
                <Icon name="download" size={14} />
                Download
              </a>
            </div>
          ) : (
            <p className="font-pullquote text-base italic text-iron/55">
              The text of this resource is being prepared. Check back soon.
            </p>
          )}

          {/* Companion study (Book Studies). Only renders when present. */}
          {hasCompanion && (
            <section className="mt-12 border-t border-iron/15 pt-8">
              <div className="flex items-center gap-3">
                <span className="section-mark text-brass">
                  § {row.companionLabel || "Study guide"}
                </span>
                <div className="hairline flex-1" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {row.companionUrl && (
                  <a
                    href={row.companionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lift group/c flex items-center gap-3 border border-iron/15 bg-bone p-4 text-sm transition-colors hover:border-brass"
                  >
                    <Icon name="arrow-up-right" size={18} className="text-brass" />
                    <span className="flex-1 truncate text-iron group-hover/c:text-brass">
                      Open {row.companionLabel || "the study"}
                    </span>
                    <span className="text-[0.625rem] uppercase tracking-wider text-iron/45">
                      Link
                    </span>
                  </a>
                )}
                {row.companionFileKey && (
                  <a
                    href={row.companionFileKey}
                    download
                    className="lift group/c flex items-center gap-3 border border-iron/15 bg-bone p-4 text-sm transition-colors hover:border-brass"
                  >
                    <Icon name="download" size={18} className="text-brass" />
                    <span className="flex-1 truncate text-iron group-hover/c:text-brass">
                      Download {row.companionLabel || "the study"}
                    </span>
                    <span className="text-[0.625rem] uppercase tracking-wider text-iron/45">
                      File
                    </span>
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Print footer */}
          <footer className="print-footer mt-16 hidden border-t border-iron/30 pt-4 text-xs text-iron/55">
            <div className="flex items-center justify-between">
              <span>Sheepdog Society · acts2028sheepdogsociety.com</span>
              <span>
                Printed {format(new Date(), "MMMM d, yyyy")}
              </span>
            </div>
            <p className="mt-2 text-[0.625rem] italic text-iron/45">
              Anchored in Acts 20:28. Free to read, free to share, please don&rsquo;t resell.
            </p>
          </footer>
        </div>
      </article>
    </>
  );
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function BookCard({
  title,
  author,
  thumbnailUrl,
  buyUrl,
  summary,
}: {
  title: string;
  author: string | null;
  thumbnailUrl: string | null;
  buyUrl: string;
  summary: string | null;
}) {
  return (
    <div className="grid gap-6 border border-iron/15 bg-bone p-6 sm:grid-cols-[180px_1fr] md:p-8">
      <div className="relative aspect-[2/3] w-full overflow-hidden border border-iron/10 bg-iron/5">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={`${title} cover`}
            fill
            sizes="180px"
            className="object-contain"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-iron/30">
            <Icon name="scroll" size={36} />
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <span className="section-mark text-iron/50">§ The Book</span>
        <h2 className="display-xl mt-3 text-2xl text-iron md:text-3xl">{title}</h2>
        {author && (
          <p className="mt-2 font-pullquote text-base italic text-iron/65">
            by {author}
          </p>
        )}
        {summary && (
          <p className="mt-4 text-sm leading-relaxed text-iron/75">{summary}</p>
        )}
        {buyUrl && (
          <div className="mt-auto pt-6">
            <a
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="lift inline-flex h-11 items-center gap-2 border border-bone bg-iron px-5 text-xs font-medium uppercase tracking-wider text-bone transition-colors hover:bg-iron/85"
            >
              <Icon name="arrow-up-right" size={14} />
              Buy on Amazon
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function LinkCard({
  title,
  host,
  thumbnailUrl,
  url,
}: {
  title: string;
  host: string;
  thumbnailUrl: string | null;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="lift block border border-iron/15 bg-bone transition-colors hover:border-brass"
    >
      {thumbnailUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-iron/5">
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="flex items-center gap-4 p-6">
        <div className="flex-1">
          <p className="section-mark text-iron/50">{host || "External link"}</p>
          <p className="mt-2 text-base text-iron">{title}</p>
        </div>
        <Icon name="arrow-up-right" size={20} className="text-brass" />
      </div>
    </a>
  );
}
