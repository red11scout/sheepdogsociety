import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicResourceBySlug } from "@/server/resources-admin";
import { Icon } from "@/components/icons/Icon";
import { format } from "date-fns";
import { PrintButton } from "./print-button";
import { ResourceBody } from "./resource-body";

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
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={row.sourceFilename ?? undefined}
                className="lift inline-flex h-9 items-center gap-2 border border-iron/20 bg-bone px-4 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:border-brass hover:text-brass"
              >
                <Icon name="download" size={12} />
                Download {isPdf ? "PDF" : isDocx ? ".docx" : "file"}
              </a>
            )}
            {row.bodyHtml && (
              <PrintButton title={row.title} />
            )}
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

          {row.bodyHtml ? (
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
                className="lift mt-8 inline-flex h-11 items-center gap-2 bg-brass px-6 text-xs font-medium uppercase tracking-wider text-ink transition-colors hover:bg-gold"
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
