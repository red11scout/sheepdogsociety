"use client";

import { useEffect } from "react";

/**
 * Scrolls to and briefly highlights the #v{N} verse anchor from the URL
 * hash (initial load AND hashchange, so picker/search jumps within the
 * same chapter still fire). Renders nothing. Reduced motion gets an
 * instant jump. Verse numbers themselves stay non-interactive — deep
 * links arrive from search results, the type-ahead, or a shared URL.
 */
export function VerseScroll() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let target: HTMLElement | null = null;

    function settle() {
      const match = /^#v(\d+)$/.exec(window.location.hash);
      if (!match) return;
      const el = document.getElementById(`v${match[1]}`);
      if (!el) return;
      if (target && timer) {
        clearTimeout(timer);
        target.classList.remove("verse-target");
      }
      target = el;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      el.classList.add("verse-target");
      timer = setTimeout(() => el.classList.remove("verse-target"), 2400);
    }

    settle();
    window.addEventListener("hashchange", settle);
    return () => {
      window.removeEventListener("hashchange", settle);
      if (timer) clearTimeout(timer);
      if (target) target.classList.remove("verse-target");
    };
  }, []);

  return null;
}
