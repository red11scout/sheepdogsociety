import { asc } from "drizzle-orm";
import { draftMode } from "next/headers";
import { db } from "@/db";
import { siteStudio, siteText } from "@/db/schema";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { SITE_TEXT_KEYS } from "@/lib/site-text/registry";
import { normalize } from "@/lib/studio/get";
import { listVersions } from "@/server/studio";
import { Studio } from "./studio";

export const dynamic = "force-dynamic";

// The (app)/admin layout gates admin already; no second gate here.
export default async function StudioPage() {
  let dbError = false;
  let draft = normalize(undefined);
  let published = normalize(undefined);
  let textRows: { key: string; value: string; draftValue: string | null }[] = [];
  try {
    const [row] = await db.select().from(siteStudio).orderBy(asc(siteStudio.id)).limit(1);
    draft = normalize(row?.draft);
    published = normalize(row?.published);
    textRows = await db
      .select({ key: siteText.key, value: siteText.value, draftValue: siteText.draftValue })
      .from(siteText);
  } catch {
    dbError = true;
  }
  const versions = dbError ? [] : await listVersions();
  const stored = Object.fromEntries(textRows.map((r) => [r.key, r]));
  const entries = SITE_TEXT_KEYS.filter((e) => e.group === "Homepage").map((e) => ({
    key: e.key,
    label: e.label,
    multiline: e.multiline,
    defaultValue: e.defaultValue,
    stored: stored[e.key]?.value ?? null,
    draftValue: stored[e.key]?.draftValue ?? null,
  }));
  const draftEnabled = (await draftMode()).isEnabled;

  return (
    <div className="mx-auto max-w-7xl">
      <AdminPageIntro
        kicker="Studio"
        title="The site, in your hands."
        description="Pick a look, arrange the homepage, change the words. Everything lands in a draft first. Nothing goes live until you hit Apply."
        hint="Themes recolor the whole public site. The ember bands and cover art keep their fixed colors on purpose, so every theme is built to sit well beside them."
      />
      {dbError ? (
        <p className="border border-oxblood/40 bg-oxblood/10 p-4 text-sm">
          Could not load the Studio. The live site is unaffected. Try again shortly.
        </p>
      ) : (
        <Studio
          initialDraft={draft}
          published={published}
          initialVersions={versions}
          textEntries={entries}
          draftEnabled={draftEnabled}
        />
      )}
    </div>
  );
}
