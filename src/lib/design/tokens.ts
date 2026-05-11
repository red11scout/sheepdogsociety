/**
 * Pasture & Iron — typed mirror of globals.css.
 * Single source of truth for component code that needs literal hex values
 * (chart series, OG image rendering, email templates).
 * If a value drifts from src/app/globals.css, the CSS wins. Update both.
 */

/** Constants — same in light and dark mode. */
export const constants = {
  iron: "#0E1624",
  bone: "#F2EBDD",
  cream: "#F8F2E2",
} as const;

/** Theme-aware accents — light column from Brief #2. */
export const light = {
  navy: "#1A2438",
  brass: "#C8932A",
  gold: "#DBAA48",
  olive: "#5A6B3E",
  oxblood: "#7A1E1E",
  stone: "#8A8275",
} as const;

/** Theme-aware accents — dark column from Brief #2 (warmer for low candlelight). */
export const dark = {
  navy: "#0B111C",
  brass: "#D9A53A",
  gold: "#E5B856",
  olive: "#7A8C56",
  oxblood: "#A33333",
  stone: "#C7BFAE",
} as const;

/** Default palette = constants + light accents. Use this for OG/email/PDF. */
export const palette = {
  ...constants,
  ...light,
} as const;

export const fonts = {
  display: "var(--font-barlow-condensed)",
  body: "var(--font-inter)",
  scripture: "var(--font-cormorant)",
  legacyScripture: "var(--font-merriweather)",
  mono: "var(--font-jetbrains-mono)",
} as const;

/** Vertical rhythm — section padding scale. Brief #2: 96–160px on landing. */
export const spacing = {
  sectionY: {
    sm: "6rem",
    md: "8rem",
    lg: "10rem",
  },
  hairline: "1px",
} as const;

export const motion = {
  ease: {
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  },
  duration: {
    micro: "120ms",
    small: "200ms",
    medium: "320ms",
    breath: "1500ms",
  },
} as const;

export const radius = {
  none: "0",
  hair: "2px",
  card: "4px",
} as const;

export type Palette = typeof palette;
export type PaletteKey = keyof Palette;
export type ThemeMode = "light" | "dark";

/** Lookup helper for code that needs the right hex per current theme. */
export function paletteFor(mode: ThemeMode) {
  return mode === "dark"
    ? { ...constants, ...dark }
    : { ...constants, ...light };
}
