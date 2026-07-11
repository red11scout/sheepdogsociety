"use client";

import { useEffect } from "react";

/** Preview-only mode forcing. Reads ?studio-mode=dark|light and toggles the
 *  `dark` class + colorScheme on <html> DIRECTLY. NEVER next-themes setTheme,
 *  NEVER localStorage (storage events would flip every open tab, including
 *  the Studio itself). Rendered only when draftMode is enabled. */
export function StudioModeForcer() {
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("studio-mode");
    if (mode !== "dark" && mode !== "light") return;
    const el = document.documentElement;
    el.classList.toggle("dark", mode === "dark");
    el.style.colorScheme = mode;
  }, []);
  return null;
}
