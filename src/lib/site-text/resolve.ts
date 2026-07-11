import { SITE_TEXT_DEFAULTS, type SiteTextKey } from "./registry";

/** Spec §B.1 fallback rule: NULL, empty, or whitespace-only stored values
 *  count as missing — the shipped default renders. An admin clearing a
 *  textarea can never blank the site. */
export function resolveSiteText(
  stored: string | null | undefined,
  fallback: string
): string {
  const trimmed = stored?.trim();
  return trimmed ? trimmed : fallback;
}

/** Pure merge: defaults overlaid with real (non-blank) stored overrides.
 *  Unknown keys are ignored — a row for a retired key can never leak. */
export function mergeSiteText(
  stored: { key: string; value: string }[]
): Record<SiteTextKey, string> {
  const map = { ...SITE_TEXT_DEFAULTS };
  for (const row of stored) {
    if (row.key in map) {
      const k = row.key as SiteTextKey;
      map[k] = resolveSiteText(row.value, map[k]);
    }
  }
  return map;
}
