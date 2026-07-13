"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * ShimmerText — a gold-leaf sweep across an italic display word
 * ("brothers.", "Sit in it."). Renders a real <em> so the surrounding
 * `.display-xl em` / `.display-soft em` italic styling still applies; the
 * gold-leaf fill and single sweep are pure CSS (`.shimmer-gold`).
 *
 * Progressive enhancement: the word ships as solid flame (final state).
 * On first viewport entry we add `.is-lit`, which plays ONE sweep — never
 * a loop. No-JS and reduced-motion visitors just see the solid word. The
 * observer disconnects after firing so it never re-flashes.
 */
export function ShimmerText({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || lit) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setLit(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lit]);

  return (
    <em ref={ref} className={`shimmer-gold${lit ? " is-lit" : ""}`}>
      {children}
    </em>
  );
}
