import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { format } from "date-fns";
import { listEventsWithPhotos } from "@/server/gallery";
import { Icon } from "@/components/icons/Icon";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Gallery — Sheepdog Society",
  description:
    "Brothers gathering. Breakfast tables, prayer nights, retreats, and the men who showed up. Photos from every Sheepdog Society event.",
};

export default async function GalleryPage() {
  const eventsWithPhotos = await listEventsWithPhotos();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-iron text-bone">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-[0.06]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark text-brass">§ Gallery</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6rem)] text-bone">
            The brothers
            <br />
            <span className="text-brass">who showed up.</span>
          </h1>
          <p className="mt-10 max-w-2xl font-pullquote text-xl italic leading-relaxed text-bone/70 md:text-2xl">
            Breakfast tables. Prayer nights. Long retreats. The photos that
            keep the memory honest.
          </p>
        </div>
      </section>

      {/* Event grid */}
      <section className="bg-bone text-ink">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-24">
          {eventsWithPhotos.length === 0 ? (
            <div className="border border-dashed border-iron/15 p-16 text-center">
              <Icon name="image" size={48} className="mx-auto text-brass" />
              <h2 className="display-xl mt-6 text-2xl text-iron md:text-3xl">
                The first photos are coming.
              </h2>
              <p className="mx-auto mt-3 max-w-md font-pullquote text-base italic text-iron/60">
                Once a gathering wraps and someone posts the photos, the
                gallery fills in here.
              </p>
            </div>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {eventsWithPhotos.map((ev) => {
                const cover = ev.photos[0];
                const extra = ev.photos.length - 1;
                return (
                  <li key={ev.id}>
                    <Link
                      href={`/gallery/${ev.id}`}
                      className="lift group/event block overflow-hidden border border-iron/10 bg-bone transition-colors hover:border-brass"
                    >
                      {/* Cover photo. aspect-[4/5] gives a magazine
                       *  feel that frames most uploads cleanly without
                       *  the tile-grid look we get from aspect-square. */}
                      <div className="relative aspect-[4/5] w-full overflow-hidden bg-iron/5">
                        {cover && (
                          <Image
                            src={cover.url}
                            alt={cover.alt ?? ev.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 group-hover/event:scale-[1.04]"
                            priority={false}
                            unoptimized
                          />
                        )}
                        <div
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-iron/85 via-iron/15 to-transparent"
                          aria-hidden
                        />

                        {/* Card chrome — date pill top-left, count top-right. */}
                        <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between">
                          <span className="inline-flex items-baseline gap-2 border border-bone/30 bg-iron/70 px-2 py-1 text-[0.625rem] uppercase tracking-[0.18em] text-bone backdrop-blur-sm">
                            {format(ev.startTime, "MMM d, yyyy")}
                          </span>
                          {ev.photos.length > 1 && (
                            <span className="inline-flex items-center gap-1 border border-brass/40 bg-iron/70 px-2 py-1 text-[0.625rem] uppercase tracking-[0.18em] text-brass backdrop-blur-sm">
                              <Icon name="image" size={10} />
                              {extra > 0 ? `+${extra}` : ev.photos.length}
                            </span>
                          )}
                        </div>

                        {/* Title block on the gradient. */}
                        <div className="absolute inset-x-0 bottom-0 p-5 text-bone">
                          {ev.eventType && (
                            <span className="section-mark text-brass">
                              § {ev.eventType}
                            </span>
                          )}
                          <h3 className="display-xl mt-2 text-2xl text-bone md:text-3xl">
                            {ev.title}
                          </h3>
                          {ev.location && (
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-bone/70">
                              {ev.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
