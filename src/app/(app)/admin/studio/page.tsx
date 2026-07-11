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

// The one hardcoded map from Studio pageId to its live route and its
// SITE_TEXT_KEYS group name — both were 1:1 by accident on the homepage,
// so DS-1 never needed this map.
const PAGES: { id: string; label: string; path: string; textGroup: string }[] = [
  { id: "home", label: "Homepage", path: "/", textGroup: "Homepage" },
  { id: "about", label: "About", path: "/about", textGroup: "About" },
  { id: "join", label: "Join", path: "/join", textGroup: "Join" },
  { id: "faq", label: "FAQ", path: "/faq", textGroup: "FAQ" },
  { id: "contact", label: "Contact", path: "/contact", textGroup: "Contact" },
  { id: "giving", label: "Giving", path: "/giving", textGroup: "Giving" },
  { id: "what-to-expect", label: "What to Expect", path: "/what-to-expect", textGroup: "What to Expect" },
  { id: "how-we-gather", label: "How We Gather", path: "/how-we-gather", textGroup: "How We Gather" },
  { id: "events", label: "Events", path: "/events", textGroup: "Events" },
  { id: "letter", label: "The Letter", path: "/letter", textGroup: "The Letter" },
  { id: "stories", label: "Stories", path: "/stories", textGroup: "Stories" },
  { id: "resources", label: "Resources", path: "/resources", textGroup: "" },
];

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
  type TextEntry = {
    key: string;
    label: string;
    multiline: boolean;
    defaultValue: string;
    stored: string | null;
    draftValue: string | null;
  };
  const entriesByGroup: Record<string, TextEntry[]> = {};
  for (const p of PAGES) {
    entriesByGroup[p.id] = p.textGroup
      ? SITE_TEXT_KEYS.filter((e) => e.group === p.textGroup).map((e) => ({
          key: e.key,
          label: e.label,
          multiline: e.multiline,
          defaultValue: e.defaultValue,
          stored: stored[e.key]?.value ?? null,
          draftValue: stored[e.key]?.draftValue ?? null,
        }))
      : [];
  }
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
          pages={PAGES}
          entriesByGroup={entriesByGroup}
          draftEnabled={draftEnabled}
        />
      )}
    </div>
  );
}
