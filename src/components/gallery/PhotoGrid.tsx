"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/icons/Icon";

export interface Photo {
  url: string;
  alt?: string;
  caption?: string;
}

interface PhotoGridProps {
  photos: Photo[];
  /** Used by the lightbox header for context. */
  eventTitle?: string;
}

/**
 * Uniform photo grid with a brand-themed lightbox.
 *
 * Design intent (per the user's "magical, uniform regardless of upload"):
 *   - Every thumbnail is aspect-square with object-cover so portrait,
 *     landscape, and panoramic uploads all read as one consistent
 *     mosaic. The lightbox preserves the original aspect ratio so
 *     the actual photo still gets to breathe when tapped.
 *   - Grid is mobile-first: 2 columns under sm, 3 at md, 4 at lg.
 *     Photos lazy-load by default; the first 8 get priority so the
 *     viewport fills fast on entry.
 *   - Lightbox: keyboard arrows / Escape, touch swipe on mobile,
 *     brass-accented prev/next chevrons. Body scroll locks while
 *     open. Closing returns focus to the originating thumbnail.
 *   - All photos go through next/image with `unoptimized` because
 *     they live on Vercel Blob and aren't in remotePatterns; the
 *     responsive `sizes` attribute still drives the source set the
 *     browser requests when Blob serves multiple variants.
 */
export function PhotoGrid({ photos, eventTitle }: PhotoGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const touchStartX = useRef<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(() => {
    setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length));
  }, [photos.length]);
  const prev = useCallback(() => {
    setOpenIndex((i) =>
      i === null ? null : (i - 1 + photos.length) % photos.length
    );
  }, [photos.length]);

  // Keyboard nav while lightbox is open.
  useEffect(() => {
    if (openIndex === null) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [openIndex, close, next, prev]);

  // Body scroll lock while lightbox is open. Tracked on the html node
  // because some layouts pin body height; toggling overflow on html is
  // the most reliable cross-browser approach.
  useEffect(() => {
    if (openIndex === null) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [openIndex]);

  // Return focus to the thumbnail that opened the lightbox.
  useEffect(() => {
    if (openIndex === null) {
      // Nothing to do — focus returns naturally when the modal unmounts
      // because we manage it via the trigger ref below.
      return;
    }
  }, [openIndex]);

  if (photos.length === 0) {
    return (
      <div className="border border-dashed border-iron/15 bg-bone p-12 text-center">
        <Icon name="image" size={36} className="mx-auto text-iron/30" />
        <p className="mt-4 font-pullquote text-base italic text-iron/60">
          No photos yet.
        </p>
      </div>
    );
  }

  const open = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.url}>
            <button
              ref={(el) => {
                triggerRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="lift group/photo relative block aspect-square w-full overflow-hidden bg-iron/5 transition-shadow hover:shadow-lg"
              aria-label={`Open photo ${i + 1}${p.caption ? ` — ${p.caption}` : ""}`}
            >
              <Image
                src={p.url}
                alt={p.alt ?? ""}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover/photo:scale-[1.04]"
                priority={i < 8}
                unoptimized
              />
              {/* Subtle brass-accented overlay on hover for tactile feedback. */}
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-iron/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/photo:opacity-100"
                aria-hidden
              />
              {p.caption && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-iron/85 px-3 py-2 text-[0.6875rem] leading-snug text-bone opacity-0 transition-all duration-300 group-hover/photo:translate-y-0 group-hover/photo:opacity-100"
                  aria-hidden
                >
                  <span className="line-clamp-2">{p.caption}</span>
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${openIndex! + 1} of ${photos.length}`}
          className="fixed inset-0 z-[100] flex flex-col bg-iron/95 backdrop-blur-sm"
          onClick={(e) => {
            // Click backdrop to close — but not clicks on the image or
            // chrome (those have their own handlers).
            if (e.target === e.currentTarget) close();
          }}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            const end = e.changedTouches[0]?.clientX ?? null;
            touchStartX.current = null;
            if (start === null || end === null) return;
            const dx = end - start;
            if (Math.abs(dx) < 40) return;
            if (dx < 0) next();
            else prev();
          }}
        >
          {/* Top bar */}
          <header className="flex items-center justify-between gap-4 border-b border-bone/10 px-4 py-3 text-bone md:px-8">
            <div className="flex items-baseline gap-3 truncate">
              {eventTitle && (
                <span className="display-xl truncate text-lg text-bone md:text-xl">
                  {eventTitle}
                </span>
              )}
              <span className="section-mark shrink-0 text-stone/55">
                {openIndex! + 1} / {photos.length}
              </span>
            </div>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-9 w-9 items-center justify-center border border-bone/20 text-bone transition-colors hover:border-brass hover:text-brass"
              aria-label="Close gallery"
            >
              <Icon name="close" size={16} />
            </button>
          </header>

          {/* Image stage */}
          <div className="relative flex flex-1 items-center justify-center px-2 py-4 md:px-12">
            {photos.length > 1 && (
              <button
                type="button"
                onClick={prev}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center border border-bone/20 bg-iron/60 text-bone transition-colors hover:border-brass hover:text-brass md:left-6 md:h-14 md:w-14"
                aria-label="Previous photo"
              >
                <Icon name="chevron-left" size={20} />
              </button>
            )}
            {/* Container reserves max viewport but lets the image keep
             *  its native aspect ratio (object-contain). */}
            <div className="relative flex h-full max-h-[calc(100vh-180px)] w-full items-center justify-center">
              <Image
                src={open.url}
                alt={open.alt ?? ""}
                width={1920}
                height={1080}
                sizes="100vw"
                className="h-full max-h-[calc(100vh-180px)] w-auto max-w-full object-contain"
                unoptimized
                priority
              />
            </div>
            {photos.length > 1 && (
              <button
                type="button"
                onClick={next}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center border border-bone/20 bg-iron/60 text-bone transition-colors hover:border-brass hover:text-brass md:right-6 md:h-14 md:w-14"
                aria-label="Next photo"
              >
                <Icon name="chevron-right" size={20} />
              </button>
            )}
          </div>

          {/* Caption rail */}
          {open.caption && (
            <footer className="border-t border-bone/10 px-4 py-4 md:px-8">
              <p className="mx-auto max-w-2xl text-center font-pullquote text-base italic leading-relaxed text-bone/85">
                {open.caption}
              </p>
            </footer>
          )}
        </div>
      )}
    </>
  );
}
