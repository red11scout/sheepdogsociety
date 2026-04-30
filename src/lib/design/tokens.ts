export const palette = {
  iron: "#1F2A2E",
  bone: "#F2EBDD",
  navy: "#1B3A4B",
  brass: "#7E5F2C",
  olive: "#5C6646",
  oxblood: "#6B2C2C",
  stone: "#C7B79A",
} as const;

export const fonts = {
  display: "var(--font-fraunces)",
  body: "var(--font-inter)",
  scripture: "var(--font-cormorant)",
  legacyScripture: "var(--font-merriweather)",
  mono: "var(--font-jetbrains-mono)",
} as const;

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
