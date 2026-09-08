"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, createScope, stagger, utils } from "animejs";
import { observeReveal } from "./Reveal";

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
 * Same progressive-enhancement + reduced-motion + reveal-pending contract
 * as Reveal; the trigger is the shared observeReveal.
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.remove("reveal-pending");
      return;
    }

    const items = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (items.length === 0) {
      root.classList.remove("reveal-pending");
      return;
    }

    let stop = () => {};
    const scope = createScope({ root }).add(() => {
      utils.set(items, { opacity: 0, translateY: y });
      root.classList.remove("reveal-pending");
      const anim = animate(items, {
        opacity: 1,
        translateY: 0,
        duration: 400,
        delay: stagger(step),
        ease: "outQuad",
        autoplay: false,
      });
      stop = observeReveal(root, () => anim.play());
    });
    return () => {
      stop();
      scope.revert();
    };
  }, [selector, y, step]);

  return (
    <div ref={rootRef} className={className ? `reveal-pending ${className}` : "reveal-pending"}>
      {children}
    </div>
  );
}
