"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { Icon } from "@/components/icons/Icon";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // SSR mount guard: the resolved theme is unknown on the server, so we
    // render a stable "dark" default until mounted, then switch to the real
    // theme. This one-time setState on mount is the intended next-themes
    // pattern; set-state-in-effect is a false positive here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const current = mounted ? resolvedTheme ?? theme : "dark";
  const isDark = current === "dark";

  return (
    <button
      type="button"
      onClick={() => {
        const next = isDark ? "light" : "dark";
        // Ease the dark<->light brightness jump with a view-transition
        // cross-fade where supported; hard-cut for reduced-motion users
        // and older browsers. flushSync so the class flip lands inside
        // the transition's snapshot callback.
        if (
          typeof document.startViewTransition === "function" &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          const vt = document.startViewTransition(() =>
            flushSync(() => setTheme(next))
          );
          // An aborted transition still applies the theme; the promise
          // rejection is just noise.
          vt.ready.catch(() => {});
          vt.finished.catch(() => {});
        } else {
          setTheme(next);
        }
      }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={
        className ??
        "inline-flex h-9 w-9 items-center justify-center border border-stone/20 text-stone/70 transition-colors hover:border-brass hover:text-brass"
      }
    >
      <Icon name={isDark ? "sun" : "moon"} size={16} />
    </button>
  );
}
