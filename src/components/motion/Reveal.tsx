"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, createScope, utils } from "animejs";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Start offset in px (translateY). */
  y?: number;
  /** Delay in ms once the element enters the viewport. */
  delay?: number;
}

/**
 * Observe `root` and call `play` once it is inside the viewport, or has
 * already been scrolled past. The 100000px top margin is the trick: an
 * element above the viewport still "intersects" the extended root, so a
 * scroll jump (anchor link, back-navigation scroll restoration) that
 * skips straight over a section never leaves it stranded invisible. The
 * old anime onScroll trigger only fired on a genuine crossing.
 */
export function observeReveal(root: Element, play: () => void) {
  if (typeof IntersectionObserver === "undefined") {
    play();
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        play();
        io.disconnect();
      }
    },
    { rootMargin: "100000px 0px -48px 0px" }
  );
  io.observe(root);
  return () => io.disconnect();
}

/**
 * Scroll-triggered fade-up (anime.js v4 ONLY — v3 syntax silently
 * no-ops). Progressive enhancement: the server renders content visible;
 * the effect hides it via utils.set and reveals on viewport entry, so
 * no-JS visitors and crawlers always see the content. The `reveal-pending`
 * class (globals.css) hides the wrapper in scripting-enabled browsers
 * until this effect takes over, so there is no paint-vanish-fade flash
 * after hydration; a CSS fallback reveals it after 1.5s if the effect
 * never runs. Reduced motion: we never hide anything at all.
 */
export function Reveal({ children, className, y = 16, delay = 0 }: RevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.remove("reveal-pending");
      return;
    }

    let stop = () => {};
    const scope = createScope({ root }).add(() => {
      utils.set(root, { opacity: 0, translateY: y });
      // The inline opacity now owns the hidden state; drop the SSR class
      // so its fallback timer cannot fight the animation.
      root.classList.remove("reveal-pending");
      const anim = animate(root, {
        opacity: 1,
        translateY: 0,
        duration: 450,
        delay,
        ease: "outQuad",
        autoplay: false,
      });
      stop = observeReveal(root, () => anim.play());
    });
    return () => {
      stop();
      scope.revert();
    };
  }, [y, delay]);

  return (
    <div ref={rootRef} className={className ? `reveal-pending ${className}` : "reveal-pending"}>
      {children}
    </div>
  );
}
