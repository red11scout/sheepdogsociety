import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import { db } from "@/db";
import { siteText } from "@/db/schema";
import type { SiteTextKey } from "./registry";
import { mergeSiteText } from "./resolve";

/** One query for the whole table, cached under the "site-text" tag.
 *  Saves call updateTag("site-text") so edits are live immediately;
 *  the tiny table (≤ ~40 rows) makes fetch-all the right shape. */
const getStoredRows = unstable_cache(
  async () => {
    const rows = await db
      .select({ key: siteText.key, value: siteText.value })
      .from(siteText);
    return rows;
  },
  ["site-text-rows"],
  { tags: ["site-text"] }
);

export async function getSiteTextMap(): Promise<Record<SiteTextKey, string>> {
  let stored: { key: string; value: string }[] = [];
  try {
    // draftMode() is checked OUTSIDE any cache scope: the draft branch is a
    // direct uncached read (draftValue overlay); only the published branch
    // below goes through the "site-text" unstable_cache tag.
    if ((await draftMode()).isEnabled) {
      const rows = await db
        .select({ key: siteText.key, value: siteText.value, draftValue: siteText.draftValue })
        .from(siteText);
      return mergeSiteText(rows.map((r) => ({ key: r.key, value: r.draftValue ?? r.value })));
    }
    stored = await getStoredRows();
  } catch (err) {
    // DB down → the site still renders every shipped default.
    console.error("getSiteTextMap: falling back to defaults", err);
  }
  return mergeSiteText(stored);
}
