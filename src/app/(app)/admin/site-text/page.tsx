import { db } from "@/db";
import { siteText } from "@/db/schema";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { SITE_TEXT_KEYS } from "@/lib/site-text/registry";
import { SiteTextEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function SiteTextPage() {
  let rows: { key: string; value: string; updatedAt: Date }[] = [];
  let dbError = false;
  try {
    rows = await db
      .select({ key: siteText.key, value: siteText.value, updatedAt: siteText.updatedAt })
      .from(siteText);
  } catch {
    dbError = true;
  }
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageIntro
        kicker="Site text"
        title="Words on the site."
        description="Tap a line, change the words, save. The site updates right away. Reset puts the original words back."
      />
      {dbError ? (
        <p className="border border-oxblood/40 bg-oxblood/10 p-4 text-sm">
          Could not load saved text. The site is showing its original words. Try again shortly.
        </p>
      ) : (
        <SiteTextEditor
          entries={SITE_TEXT_KEYS.map((e) => ({
            key: e.key,
            label: e.label,
            group: e.group,
            defaultValue: e.defaultValue,
            multiline: e.multiline,
            stored: stored[e.key] ?? null,
          }))}
        />
      )}
    </div>
  );
}
