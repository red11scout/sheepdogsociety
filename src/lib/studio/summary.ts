import type { StudioConfig } from "./config";

type Snap = { config: StudioConfig; textOverrides: Record<string, string> };

/** Auto one-liner for `studio_versions.summary`: names the theme switch (if
 *  any), every section whose visibility flipped, and a count of edited text
 *  lines. Section visibility is read flat across all pages in the config —
 *  fine for DS-1 (homepage only) and correct as later pages are added. */
export function summarize(
  prev: Snap,
  next: Snap,
  sectionLabels: Record<string, string>,
  themeNames: Record<string, string>
): string {
  const parts: string[] = [];
  if (prev.config.themeId !== next.config.themeId) {
    parts.push(`Switched to ${themeNames[next.config.themeId] ?? next.config.themeId}`);
  }
  const vis = (c: StudioConfig) => {
    const m = new Map<string, boolean>();
    for (const p of Object.values(c.pages)) for (const s of p.sections) m.set(s.id, s.visible);
    return m;
  };
  const before = vis(prev.config);
  const after = vis(next.config);
  // Union of before+after ids: a section un-hidden by REMOVING its config
  // entry (absent from `after` = default visible) must count too.
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const was = before.get(id) ?? true;
    const now = after.get(id) ?? true;
    if (now !== was) parts.push(`${now ? "showed" : "hid"} ${sectionLabels[id] ?? id}`);
  }
  const edited =
    Object.keys(next.textOverrides).filter((k) => next.textOverrides[k] !== prev.textOverrides[k]).length +
    Object.keys(prev.textOverrides).filter((k) => !(k in next.textOverrides)).length;
  if (edited > 0) parts.push(`edited ${edited} ${edited === 1 ? "line" : "lines"}`);
  if (parts.length === 0) return "No changes.";
  const s = parts.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}
