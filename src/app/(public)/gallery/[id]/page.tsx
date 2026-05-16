import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { format } from "date-fns";
import { getGalleryEvent } from "@/server/gallery";
import { Icon } from "@/components/icons/Icon";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ev = await getGalleryEvent(id);
  if (!ev) return { title: "Gallery — Sheepdog Society" };
  const cover = ev.photos[0]?.url;
  return {
    title: `${ev.title} — Gallery — Sheepdog Society`,
    description:
      ev.description ??
      `${ev.photos.length} photo${ev.photos.length === 1 ? "" : "s"} from ${ev.title}.`,
    openGraph: {
      title: ev.title,
      description: ev.description ?? undefined,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function GalleryEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ev = await getGalleryEvent(id);
  if (!ev || ev.photos.length === 0) notFound();

  return (
    <article className="bg-bone text-ink">
      {/* Hero — title + meta on a wide brand band. The first photo is
       *  the dominant image; the grid below is the full set. */}
      <header className="relative overflow-hidden bg-iron text-bone">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 py-16 md:px-12 md:py-24">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 section-mark text-bone/55 transition-colors hover:text-brass"
          >
            <Icon name="arrow-right" size={12} className="rotate-180" />
            All galleries
          </Link>
          <div className="mt-8 flex items-center gap-4">
            <span className="section-mark text-brass">§ Gallery</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-8 text-[clamp(2.25rem,6vw,5rem)] text-bone">
            {ev.title}
          </h1>
          <dl className="mt-10 flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <div>
              <dt className="section-mark text-bone/55">When</dt>
              <dd className="mt-1 font-display text-lg text-bone">
                {format(ev.startTime, "EEEE, MMMM d, yyyy")}
              </dd>
            </div>
            {ev.location && (
              <div>
                <dt className="section-mark text-bone/55">Where</dt>
                <dd className="mt-1 font-display text-lg text-bone">
                  {ev.location}
                </dd>
              </div>
            )}
            <div>
              <dt className="section-mark text-bone/55">Photos</dt>
              <dd className="mt-1 font-display text-lg text-bone">
                {ev.photos.length}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {/* Optional event description / recap. Description shows first
       *  (it's the public-facing pre-event copy), recap below if the
       *  admin wrote one after the event. Both are optional. */}
      {(ev.description || ev.recap) && (
        <section className="bg-bone">
          <div className="mx-auto max-w-3xl px-6 py-12 md:px-12 md:py-16">
            {ev.description && (
              <p className="font-display text-lg leading-[1.7] text-iron whitespace-pre-line md:text-xl">
                {ev.description}
              </p>
            )}
            {ev.recap && (
              <div className="mt-10 border-t border-iron/15 pt-8">
                <div className="flex items-center gap-3">
                  <span className="section-mark text-brass">§ Recap</span>
                  <div className="hairline flex-1" />
                </div>
                <div className="mt-6 space-y-5">
                  {ev.recap.split(/\n\n+/).map((p, i) => (
                    <p
                      key={i}
                      className="font-display text-lg leading-[1.7] text-iron"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* The grid + lightbox. PhotoGrid handles the magical part. */}
      <section className="bg-bone">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-12 md:pb-28">
          <div className="mb-6 flex items-center gap-3">
            <span className="section-mark text-brass">§ The night, in pictures</span>
            <div className="hairline flex-1" />
          </div>
          <PhotoGrid photos={ev.photos} eventTitle={ev.title} />
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-bone">
        <div className="mx-auto max-w-3xl px-6 pb-20 text-center md:px-12 md:pb-28">
          <Link
            href="/gallery"
            className="lift inline-flex h-11 items-center gap-2 border border-iron/30 px-6 text-xs font-medium uppercase tracking-[0.18em] text-iron transition-colors hover:border-brass hover:text-brass"
          >
            <Icon name="arrow-right" size={12} className="rotate-180" />
            More galleries
          </Link>
        </div>
      </section>
    </article>
  );
}
