"use client";

import { useEffect, useState } from "react";
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
      onClick={() => setTheme(isDark ? "light" : "dark")}
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
