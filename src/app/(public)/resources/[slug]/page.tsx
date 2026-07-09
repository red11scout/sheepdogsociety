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
      <section className="bg-background text-foreground no-print">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 pb-2 pt-8 md:px-12">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 section-mark text-muted-foreground hover:text-brass"
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
                className="lift inline-flex h-9 items-center gap-2 border border-foreground/15 bg-card px-4 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:border-brass hover:text-brass"
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
                className="lift inline-flex h-9 items-center gap-2 border border-foreground/15 bg-card px-4 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:border-brass hover:text-brass"
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
                className="lift inline-flex h-9 items-center gap-2 border border-foreground/15 bg-card px-4 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:border-brass hover:text-brass"
              >
                <Icon name="arrow-up-right" size={12} />
                Open link
              </a>
            )}
            {/* Body-html resources (mammoth-converted .docx, etc.):
             *  PRIMARY action is "Save as PDF" — triggers the browser's
             *  print dialog on the branded letterhead version. The user
             *  picks "Save as PDF" or sends it to a printer. Either way
             *  they get the Sheepdog Society letterhead, not a raw,
             *  un-branded file dump.
             *  SECONDARY: "Download original" still offered as a small
             *  link for editors who want the source .docx/.pdf. */}
            {row.bodyHtml && (
              <PrintButton title={row.title} label="Save as PDF / Print" />
            )}
            {!isYouTube && !isAmazonBook && !isWebLink && downloadUrl && !row.bodyHtml && (
              // Pure file resources (no extracted body): direct download
              // is the only thing we can offer. Browser will preview if
              // it's a PDF, save if it's anything else.
              <a
                href={downloadUrl}
                download={row.sourceFilename ?? undefined}
                className="lift inline-flex h-9 items-center gap-2 border border-foreground/15 bg-card px-4 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:border-brass hover:text-brass"
              >
                <Icon name="download" size={12} />
                Download {isPdf ? "PDF" : isDocx ? ".docx" : "file"}
              </a>
            )}
            {!isYouTube && !isAmazonBook && !isWebLink && downloadUrl && row.bodyHtml && (
              // Body-html row that ALSO has the original file uploaded:
              // surface the original as a tertiary text link so it
              // doesn't compete with the primary Save-as-PDF action.
              <a
                href={downloadUrl}
                download={row.sourceFilename ?? undefined}
                className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground hover:text-brass"
                title={`Download the original ${isPdf ? "PDF" : isDocx ? ".docx" : "file"} as uploaded`}
              >
                Original {isPdf ? "PDF" : isDocx ? ".docx" : "file"} ↓
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Letterhead — visible on screen and in print */}
      <article className="resource-doc bg-background text-foreground">
        <header className="mx-auto max-w-4xl px-6 pb-10 pt-6 md:px-12 md:pb-14 md:pt-10">
          {/* Print-only branded letterhead. Hidden on screen, revealed by
           *  the @media print rule. Uses the actual brand logo + section
           *  rules so the printed PDF reads like a real Sheepdog Society
           *  document, not a screenshot of a webpage. */}
          <div className="print-letterhead hidden">
            <div className="flex items-end justify-between gap-6 border-b-2 border-foreground pb-3">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Sheepdog Society"
                  width={44}
                  height={44}
                  unoptimized
                  className="h-11 w-11 object-contain"
                />
                <div className="leading-tight">
                  <p className="brand-wordmark text-2xl text-foreground">Sheepdog Society</p>
                  <p className="section-mark text-muted-foreground">
                    Acts 20:28 · Stand guard
                  </p>
                </div>
              </div>
              <div className="text-right text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
                <p>acts2028sheepdogsociety.com</p>
                {row.section && <p className="mt-1">§ {row.section.name}</p>}
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
              <span className="section-mark text-muted-foreground">
                {row.estimatedMinutes} min read
              </span>
            )}
            {row.audience && row.audience !== "all" && (
              <span className="section-mark text-muted-foreground">
                · For {row.audience === "leader" ? "leaders" : "newcomers"}
              </span>
            )}
          </div>

          <h1 className="display-xl mt-6 text-[clamp(2rem,5vw,4rem)] text-foreground">
            {row.title}
          </h1>

          {row.summary && (
            <p className="mt-6 max-w-3xl font-pullquote text-lg italic leading-relaxed text-muted-foreground md:text-xl">
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
                  className="inline-flex h-6 items-center border border-foreground/15 bg-card px-2 text-[0.625rem] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
              {(row.themes ?? []).map((th) => (
                <span
                  key={`th-${th}`}
                  className="inline-flex h-6 items-center border border-foreground/15 bg-card px-2 text-[0.625rem] italic text-muted-foreground"
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
                <p className="text-xs text-muted-foreground">
                  From <span className="text-foreground">{row.author}</span> on YouTube
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
            <div className="border border-dashed border-foreground/15 bg-card p-10 text-center">
              <Icon name="download" size={36} className="mx-auto text-brass" />
              <p className="mx-auto mt-6 max-w-md font-pullquote text-base italic text-muted-foreground">
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
            <p className="font-pullquote text-base italic text-muted-foreground">
              The text of this resource is being prepared. Check back soon.
            </p>
          )}

          {/* Companion study (Book Studies). Only renders when present. */}
          {hasCompanion && (
            <section className="mt-12 border-t border-foreground/15 pt-8">
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
                    className="lift group/c flex items-center gap-3 border border-foreground/15 bg-card p-4 text-sm transition-colors hover:border-brass"
                  >
                    <Icon name="arrow-up-right" size={18} className="text-brass" />
                    <span className="flex-1 truncate text-foreground group-hover/c:text-brass">
                      Open {row.companionLabel || "the study"}
                    </span>
                    <span className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">
                      Link
                    </span>
                  </a>
                )}
                {row.companionFileKey && (
                  <a
                    href={row.companionFileKey}
                    download
                    className="lift group/c flex items-center gap-3 border border-foreground/15 bg-card p-4 text-sm transition-colors hover:border-brass"
                  >
                    <Icon name="download" size={18} className="text-brass" />
                    <span className="flex-1 truncate text-foreground group-hover/c:text-brass">
                      Download {row.companionLabel || "the study"}
                    </span>
                    <span className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">
                      File
                    </span>
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Print-only footer. Same brand bar logic as the letterhead.
           *  Hidden on screen, revealed by @media print. */}
          <footer className="print-footer mt-16 hidden border-t-2 border-foreground pt-3">
            <div className="flex items-center justify-between text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt=""
                  width={16}
                  height={16}
                  unoptimized
                  className="h-4 w-4 object-contain"
                />
                Sheepdog Society · acts2028sheepdogsociety.com
              </span>
              <span>
                Printed {format(new Date(), "MMMM d, yyyy")}
              </span>
            </div>
            <p className="mt-2 font-pullquote text-[0.6875rem] italic text-muted-foreground">
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
    <div className="grid gap-6 border border-foreground/15 bg-card p-6 sm:grid-cols-[180px_1fr] md:p-8">
      <div className="relative aspect-[2/3] w-full overflow-hidden border border-foreground/10 bg-foreground/5">
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
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Icon name="scroll" size={36} />
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <span className="section-mark text-muted-foreground">§ The Book</span>
        <h2 className="display-xl mt-3 text-2xl text-foreground md:text-3xl">{title}</h2>
        {author && (
          <p className="mt-2 font-pullquote text-base italic text-muted-foreground">
            by {author}
          </p>
        )}
        {summary && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{summary}</p>
        )}
        {buyUrl && (
          <div className="mt-auto pt-6">
            <a
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="lift inline-flex h-11 items-center gap-2 bg-foreground px-5 text-xs font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/85"
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
      className="lift block border border-foreground/15 bg-card transition-colors hover:border-brass"
    >
      {thumbnailUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-foreground/5">
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
          <p className="section-mark text-muted-foreground">{host || "External link"}</p>
          <p className="mt-2 text-base text-foreground">{title}</p>
        </div>
        <Icon name="arrow-up-right" size={20} className="text-brass" />
      </div>
    </a>
  );
}
