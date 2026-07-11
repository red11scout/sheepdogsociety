import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import { db } from "@/db";
import { siteStudio } from "@/db/schema";
import { asc } from "drizzle-orm";
import { DEFAULT_CONFIG, type StudioConfig } from "./config";
import { resolveThemeId } from "./config";
import { THEME_IDS } from "./themes";

function normalize(raw: unknown): StudioConfig {
  const c = (raw ?? {}) as Partial<StudioConfig>;
  return {
    themeId: resolveThemeId({ themeId: c.themeId ?? "pasture-iron", pages: {} }, THEME_IDS),
    pages: c.pages ?? {},
  };
}

async function readRow() {
  const [row] = await db.select().from(siteStudio).orderBy(asc(siteStudio.id)).limit(1);
  return row ?? null;
}

const getPublished = unstable_cache(
  async () => {
    const row = await readRow();
    return normalize(row?.published);
  },
  ["studio-published"],
  { tags: ["studio"] }
);

/** draftMode() is checked OUTSIDE the cache scope (guard rail 5b): the draft
 *  branch is a direct uncached read; only the published branch is cached. */
export async function getStudioConfig(): Promise<StudioConfig> {
  try {
    if ((await draftMode()).isEnabled) {
      const row = await readRow();
      return normalize(row?.draft);
    }
    return await getPublished();
  } catch (err) {
    console.error("getStudioConfig: falling back to defaults", err);
    return DEFAULT_CONFIG;
  }
}
