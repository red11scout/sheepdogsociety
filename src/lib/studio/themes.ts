import { THEME_DATA } from "./themes-data.mjs";

export type Theme = {
  id: string; name: string; blurb: string;
  light: Record<string, string>; dark: Record<string, string>;
};

const META: Record<string, { name: string; blurb: string }> = {
  "pasture-iron": { name: "Pasture & Iron", blurb: "The look the site ships with. Parchment, deep iron, brass." },
  harvest: { name: "Harvest", blurb: "Warm copper and wheat. Late-October kitchen-table light." },
  "winter-watch": { name: "Winter Watch", blurb: "Steel blue and slate. Cold morning, clear eyes." },
  daybreak: { name: "Daybreak", blurb: "Brighter parchment, sunrise gold. Lighter on its feet." },
  evergreen: { name: "Evergreen", blurb: "Deep pine and moss. Standing timber." },
};

export const THEMES: Theme[] = THEME_DATA.map((t) => ({ ...t, ...META[t.id] }));
export const THEME_IDS = THEMES.map((t) => t.id);
export const themeById = (id: string) => THEMES.find((t) => t.id === id);
