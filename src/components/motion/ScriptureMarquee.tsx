"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { MarqueeVerse } from "@/lib/bible/verse";
import { MARQUEE_REFS } from "@/lib/bible/marquee-refs";

interface ScriptureMarqueeProps {
  className?: string;
  /** Verbatim verse texts fetched server-side (ESV → WEB fallback).
   *  Empty/missing entries render as plain refs with no popover. */
  verses?: MarqueeVerse[];
}

interface OpenState {
  verse: MarqueeVerse;
  /** Anchor centerline + top edge in viewport coords, captured while the
   *  marquee is paused, so the card can rise from the ref it belongs to. */
  anchorX: number;
  anchorTop: number;
  /** Two-phase mount: "in" after a frame (transition runs), "out" briefly
   *  before unmount so the card can bow out instead of vanishing. */
  phase: "pre" | "in" | "out";
}

const CARD_MAX_W = 416; // px — min(26rem, viewport - 32)
const EDGE = 16;

export function ScriptureMarquee({ className, verses = [] }: ScriptureMarqueeProps) {
  const byRef = new Map(verses.map((v) => [v.ref, v]));
  const [open, setOpen] = useState<OpenState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const close = useCallback((immediate = false) => {
    cancelClose();
    if (immediate) {
      setOpen(null);
      return;
    }
    setOpen((o) => (o ? { ...o, phase: "out" } : null));
    closeTimer.current = setTimeout(() => setOpen(null), 160);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => close(), 180);
  }, [cancelClose, close]);

  const openFor = useCallback(
    (ref: string, el: HTMLElement) => {
      const verse = byRef.get(ref);
      if (!verse?.text) return;
      cancelClose();
      const rect = el.getBoundingClientRect();
      setOpen({
        verse,
        anchorX: rect.left + rect.width / 2,
        anchorTop: rect.top,
        phase: "pre",
      });
    },
    // byRef is rebuilt each render from a stable prop; the map contents
    // only change if the verses prop does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cancelClose, verses]
  );

  // Let the card mount at its start position, then transition in. The
  // timeout backstops requestAnimationFrame, which throttled/background
  // tabs may never fire.
  useEffect(() => {
    if (open?.phase !== "pre") return;
    const go = () =>
      setOpen((o) => (o && o.phase === "pre" ? { ...o, phase: "in" } : o));
    const raf = requestAnimationFrame(go);
    const backstop = setTimeout(go, 50);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(backstop);
    };
  }, [open?.phase]);

  // Escape, outside-tap, and scroll all dismiss (positions go stale on
  // scroll; closing beats drifting).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || cardRef.current?.contains(t)) return;
      close();
    };
    const onScroll = () => close(true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open, close]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  // Card geometry: centered on the ref, clamped to the viewport, floating
  // above the band. The caret keeps pointing at the ref even when clamped.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const cardW = Math.min(CARD_MAX_W, vw - EDGE * 2);
  const cardLeft = open
    ? Math.min(Math.max(open.anchorX - cardW / 2, EDGE), vw - EDGE - cardW)
    : 0;
  const caretX = open
    ? Math.min(Math.max(open.anchorX - cardLeft, 24), cardW - 24)
    : 0;

  return (
    <div
      ref={rootRef}
      data-paused={open ? "" : undefined}
      className={cn(
        "marquee group/m relative w-full overflow-hidden border-y border-stone/15",
        className
      )}
    >
      <div className="marquee-track flex shrink-0 items-center gap-12 py-1">
        {[0, 1, 2].map((set) =>
          MARQUEE_REFS.map((ref) => {
            const verse = byRef.get(ref);
            const interactive = !!verse?.text;
            const decorative = set > 0;
            const isOpenRef = open?.verse.ref === ref && open.phase !== "out";
            return (
              <span
                key={`${set}-${ref}`}
                aria-hidden={decorative || undefined}
                className="inline-flex shrink-0 items-center gap-12 whitespace-nowrap"
              >
                {interactive ? (
                  <button
                    type="button"
                    tabIndex={decorative ? -1 : 0}
                    aria-expanded={isOpenRef}
                    aria-label={`Read ${ref}`}
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse") openFor(ref, e.currentTarget);
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType === "mouse") scheduleClose();
                    }}
                    onClick={(e) => {
                      if (open?.verse.ref === ref && open.phase !== "out") close();
                      else openFor(ref, e.currentTarget);
                    }}
                    onFocus={(e) => {
                      // Keyboard focus only. A tap focuses the button right
                      // before its click lands, so an unguarded focus-open
                      // gets toggled shut by that same click — on phones the
                      // card died in ~160ms and the ref looked dead.
                      if (e.currentTarget.matches(":focus-visible"))
                        openFor(ref, e.currentTarget);
                    }}
                    onBlur={scheduleClose}
                    className={cn(
                      "section-mark cursor-pointer whitespace-nowrap px-1 py-4 transition-colors duration-200",
                      isOpenRef ? "text-brass" : "text-stone/60 hover:text-brass/90"
                    )}
                  >
                    {ref}
                  </button>
                ) : (
                  <span className="section-mark whitespace-nowrap px-1 py-4 text-stone/60">
                    {ref}
                  </span>
                )}
                <span className="inline-block h-1 w-1 bg-brass" />
              </span>
            );
          })
        )}
      </div>

      {open && (
        <div
          ref={cardRef}
          role="dialog"
          aria-label={open.verse.ref}
          onPointerEnter={cancelClose}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") scheduleClose();
          }}
          style={{
            left: cardLeft,
            width: cardW,
            bottom:
              typeof window !== "undefined"
                ? window.innerHeight - open.anchorTop + 14
                : 0,
          }}
          className={cn(
            "fixed z-50 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:transform-none",
            open.phase === "in"
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-2 scale-[0.98] opacity-0"
          )}
        >
          {/* Ember glow — the "magic": a soft brass halo breathing behind
              the card, pure decoration, zero layout. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-brass/15 blur-3xl"
          />
          <div className="border border-brass/40 bg-card shadow-[0_18px_50px_-12px_rgba(0,0,0,0.45)]">
            <div className="max-h-[46vh] overflow-y-auto p-6">
              <p className="section-mark text-brass">§ {open.verse.ref}</p>
              <p className="mt-3 font-scripture text-lg italic leading-relaxed text-foreground">
                {open.verse.text}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-foreground/10 px-6 py-3">
              <span className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
                {open.verse.translation}
              </span>
              {open.verse.url && (
                <Link
                  href={open.verse.url}
                  className="section-mark text-muted-foreground transition-colors hover:text-brass"
                  onClick={() => close(true)}
                >
                  Read the chapter →
                </Link>
              )}
            </div>
          </div>
          {/* Caret — the little brass diamond, kin to the ticker's separators,
              pointing home to the reference that summoned the card. */}
          <span
            aria-hidden
            style={{ left: caretX }}
            className="absolute -bottom-[5px] h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-brass/40 bg-card"
          />
        </div>
      )}
    </div>
  );
}
