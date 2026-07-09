"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, createScope, onScroll, stagger, utils } from "animejs";

interface StaggerRevealProps {
  children: ReactNode;
  className?: string;
  /** Selector for the staggered items, scoped to this wrapper.
   *  Wrapping a <ul>? Pass ":scope li". */
  selector?: string;
  y?: number;
  /** ms between items (MASTER.md: 40-60ms). */
  step?: number;
}

/**
 * Staggered children reveal on viewport entry (anime.js v4 ONLY).
 * Same progressive-enhancement + reduced-motion contract as Reveal.
 */
export function StaggerReveal({
  children,
  className,
  selector = ":scope > *",
  y = 16,
  step = 60,
}: StaggerRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (items.length === 0) return;

    const scope = createScope({ root }).add(() => {
      utils.set(items, { opacity: 0, translateY: y });
      animate(items, {
        opacity: 1,
        translateY: 0,
        duration: 400,
        delay: stagger(step),
        ease: "outQuad",
        // repeat defaults to true and would re-flash on re-entry.
        autoplay: onScroll({ target: root, enter: "bottom-=48 top", repeat: false }),
      });
    });
    return () => scope.revert();
  }, [selector, y, step]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
