"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, createScope, onScroll, utils } from "animejs";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Start offset in px (translateY). */
  y?: number;
  /** Delay in ms once the element enters the viewport. */
  delay?: number;
}

/**
 * Scroll-triggered fade-up (anime.js v4 ONLY — v3 syntax silently
 * no-ops). Progressive enhancement: the server renders content visible;
 * the effect hides it via utils.set and reveals on viewport entry, so
 * no-JS visitors and crawlers always see the content. Reduced motion:
 * we never hide anything at all.
 */
export function Reveal({ children, className, y = 16, delay = 0 }: RevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scope = createScope({ root }).add(() => {
      utils.set(root, { opacity: 0, translateY: y });
      animate(root, {
        opacity: 1,
        translateY: 0,
        duration: 450,
        delay,
        ease: "outQuad",
        // repeat defaults to true and would re-flash on re-entry.
        autoplay: onScroll({ target: root, enter: "bottom-=48 top", repeat: false }),
      });
    });
    return () => scope.revert();
  }, [y, delay]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
