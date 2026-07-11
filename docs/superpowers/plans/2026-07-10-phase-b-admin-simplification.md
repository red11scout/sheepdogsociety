# Phase B — Admin for a Ten-Year-Old Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jeremy edits homepage/About copy from a plain grouped list with zero code, the admin nav is regrouped by job (5 groups → 4 + Settings), and every Tier 1 triage page works one-handed at 375px.

**Architecture:** A curated `site_text` key registry lives in code (labels, groups, shipped defaults); the DB stores only overrides. `getSiteTextMap()` wraps one fetch-all query in `unstable_cache` tagged `site-text`; saves upsert + `revalidateTag("site-text")` + `revalidatePath` the affected pages. Homepage/About read the map server-side. Nav regroup is a data-only change to `AdminSidebar.tsx`. The mobile pass adds `md:hidden` card lists beside the two big tables and responsive stacking to the card-list pages — no data-layer changes.

**Tech Stack:** Next.js 16.1.6 App Router, Drizzle/Neon (postgres-js, lazy Proxy db), Tailwind v4 (furniture stays `@utility`), Vitest.

## Global Constraints (from spec §B + cross-cutting — verbatim where quoted)

- **Fallback rule:** "NULL, empty, or whitespace-only values are treated as missing" and render the shipped default — neither an empty DB nor an admin clearing a textarea can blank the site.
- **Seeded keys are exactly:** the Phase A homepage sections (hero headline, hero paragraph, five What-this-is entries, join CTA) plus About page copy. **No other pages migrate in this phase.**
- Homepage `metadata` converts to `generateMetadata` reading site_text.
- `/admin/site-text`: "grouped plain-named list … tap → textarea → save → live. No layout controls by design."
- **Nav group membership is FIXED by spec:** This Week (Home, Inbox) · The Letter (letters incl. autopilot card, subscribers) · People & Groups (members, groups, plant requests, group interest, events, past events) · Site Content (site text, resources, gallery, stories) · Settings (admins, audit, settings) at bottom. Order/icons/labels adjustable; membership is not.
- Tap budget: any sidebar page ≤ 2 taps from `/admin/dashboard` on desktop (groups always expanded), ≤ 3 on mobile (drawer open counts as tap 1).
- **Tier 1 (full triage parity at 375px):** Dashboard, Inbox (contacts), Members, Plant Requests, Group Interest, Groups, Events, Encouragements list. **Tier 2 (baseline: drawer nav, no horizontal scroll, 44px targets):** every other sidebar page. **Out:** letter editor gets read + publish/schedule at 375px, not full editing; orphan routes (prayer, locations) get no pass.
- Voice: all UI copy hand-written per `src/lib/ai/system-prompt.ts` rules (no "delve/leverage/journey/rise…", no em-dashes where commas work). Scripture never generated or edited — the Acts 20:28 blockquotes are NOT site_text keys.
- Bible text / block CMS: the dormant `pages`/`pageVersions` schema (`src/db/schema-pages.ts`) stays untouched — spec explicitly rejected block CMS.
- House style: **no zod in `"use server"` actions** (manual typed validation + `requireAdmin()` throw — `src/server/encouragements.ts` is the model); migrations hand-written (`drizzle/0019_site_text.sql`), applied via `scripts/apply-neon-migration.mjs` / GH Action, never `drizzle-kit push`; npm NOT pnpm.
- Anthropic/AI: not used anywhere in this phase.
- Scout maps with exact current state: `.superpowers/sdd/pb-scout-admin.md` and `.superpowers/sdd/pb-scout-copy.md`.

## File Structure

```
src/lib/site-text/registry.ts        # curated keys: {key,label,group,default,multiline} — source of truth
src/lib/site-text/resolve.ts         # pure fallback rule (TDD)
src/lib/site-text/resolve.test.ts
src/lib/site-text/registry.test.ts   # uniqueness + non-empty invariants
src/lib/site-text/get.ts             # getSiteTextMap() — unstable_cache tag "site-text" (NOT "use server")
src/server/site-text-admin.ts        # "use server": saveSiteText, resetSiteText (requireAdmin)
src/app/(app)/admin/site-text/page.tsx        # server page: registry + raw rows
src/app/(app)/admin/site-text/editor.tsx      # client: grouped expandable rows
src/db/schema.ts                     # + siteText table
drizzle/0019_site_text.sql           # hand-written, idempotent
src/app/(public)/page.tsx            # reads map; metadata → generateMetadata
src/app/(public)/about/page.tsx      # reads map; metadata → generateMetadata
src/components/admin/AdminSidebar.tsx  # regrouped groups[] + relative-Link fix
src/components/admin/AdminShell.tsx    # drawer badge-prop fix
+ Tier 1 page edits (tasks 7-9)
```

---

### Task 1: site_text data layer — registry, resolve rule, schema, migration

**Files:**
- Create: `src/lib/site-text/registry.ts`, `src/lib/site-text/resolve.ts`, `src/lib/site-text/resolve.test.ts`, `src/lib/site-text/registry.test.ts`, `drizzle/0019_site_text.sql`
- Modify: `src/db/schema.ts` (append table at end)

**Interfaces:**
- Produces: `SITE_TEXT_KEYS: readonly SiteTextEntry[]`, `type SiteTextKey`, `SITE_TEXT_DEFAULTS: Record<SiteTextKey, string>`, `resolveSiteText(stored: string | null | undefined, fallback: string): string`, Drizzle table `siteText` (columns key/label/groupName/value/updatedAt/updatedBy).

- [ ] **Step 1: Write failing tests**

`src/lib/site-text/resolve.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { resolveSiteText } from "./resolve";

describe("resolveSiteText", () => {
  it("returns the default for null, undefined, empty, and whitespace-only", () => {
    expect(resolveSiteText(null, "fallback")).toBe("fallback");
    expect(resolveSiteText(undefined, "fallback")).toBe("fallback");
    expect(resolveSiteText("", "fallback")).toBe("fallback");
    expect(resolveSiteText("   \n\t ", "fallback")).toBe("fallback");
  });
  it("returns the stored value, trimmed, when real content exists", () => {
    expect(resolveSiteText("Real copy.", "fallback")).toBe("Real copy.");
    expect(resolveSiteText("  padded  ", "fallback")).toBe("padded");
  });
});
```

`src/lib/site-text/registry.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { SITE_TEXT_KEYS, SITE_TEXT_DEFAULTS } from "./registry";

describe("SITE_TEXT_KEYS", () => {
  it("has unique keys", () => {
    const keys = SITE_TEXT_KEYS.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("every entry has a non-empty key, label, group, and default", () => {
    for (const e of SITE_TEXT_KEYS) {
      expect(e.key.trim().length).toBeGreaterThan(0);
      expect(e.label.trim().length).toBeGreaterThan(0);
      expect(e.group.trim().length).toBeGreaterThan(0);
      expect(e.defaultValue.trim().length).toBeGreaterThan(0);
    }
  });
  it("groups are exactly Homepage and About", () => {
    expect(new Set(SITE_TEXT_KEYS.map((e) => e.group))).toEqual(
      new Set(["Homepage", "About"])
    );
  });
  it("DEFAULTS mirrors the registry", () => {
    for (const e of SITE_TEXT_KEYS) {
      expect(SITE_TEXT_DEFAULTS[e.key]).toBe(e.defaultValue);
    }
  });
});
```

- [ ] **Step 2: Run tests, verify failure** — `npm test -- site-text` → FAIL (modules missing).

- [ ] **Step 3: Implement `resolve.ts`**

```ts
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
```

- [ ] **Step 4: Implement `registry.ts`** — defaults are the CURRENT live strings, copied verbatim (real apostrophes, no JSX entities):

```ts
export interface SiteTextEntry {
  key: string;
  /** Plain-English name Jeremy sees, e.g. "Homepage — Hero headline (line 1)" */
  label: string;
  group: "Homepage" | "About";
  defaultValue: string;
  /** true → textarea; false → single-line input */
  multiline: boolean;
}

/** Curated editable copy. Spec §B.1: homepage 5W1H sections + About page
 *  copy ONLY. Scripture quotes are never keys. Structural labels (the
 *  folio "Who it's for" headings, roman numerals, icons) stay in code. */
export const SITE_TEXT_KEYS: readonly SiteTextEntry[] = [
  // ── Homepage ──────────────────────────────────────────────
  { key: "home.hero.headline1", label: "Hero headline — line 1", group: "Homepage", multiline: false,
    defaultValue: "Find your" },
  { key: "home.hero.headline2", label: "Hero headline — line 2 (italic)", group: "Homepage", multiline: false,
    defaultValue: "brothers." },
  { key: "home.hero.paragraph", label: "Hero paragraph", group: "Homepage", multiline: true,
    defaultValue:
      "A brotherhood of Christian men, anchored in Acts 20:28. We meet weekly around Scripture, tell each other the truth, and stand watch over one another. You have walked alone long enough." },
  { key: "home.what.who", label: "What this is — Who it's for", group: "Homepage", multiline: true,
    defaultValue:
      "Men. Fathers, sons, new believers, worn-out saints. If you are a man, there is a seat." },
  { key: "home.what.happens", label: "What this is — What happens", group: "Homepage", multiline: true,
    defaultValue:
      "A weekly table. Scripture read plain. Straight talk. Prayer. One hour that orders the rest of the week." },
  { key: "home.what.why", label: "What this is — Why it exists", group: "Homepage", multiline: true,
    defaultValue:
      "God did not build men to walk alone. Acts 20:28 says keep watch. We keep it together." },
  { key: "home.what.where_fallback", label: "What this is — When & where (shown only when no meeting rhythms exist)", group: "Homepage", multiline: true,
    defaultValue:
      "Tables gather weekly across Georgia. New ones are forming now." },
  { key: "home.what.start", label: "What this is — How to start", group: "Homepage", multiline: true,
    defaultValue:
      "Pick a group. Show up once. Keep showing up. That is the whole program." },
  { key: "home.join.headline1", label: "Join section — headline line 1", group: "Homepage", multiline: false,
    defaultValue: "There is a chair." },
  { key: "home.join.headline2", label: "Join section — headline line 2 (italic)", group: "Homepage", multiline: false,
    defaultValue: "Sit in it." },
  { key: "home.join.button", label: "Join section — button label", group: "Homepage", multiline: false,
    defaultValue: "Join the brotherhood" },
  { key: "home.meta.title", label: "Search result — page title", group: "Homepage", multiline: false,
    defaultValue: "Sheepdog Society — Acts 20:28" },
  { key: "home.meta.description", label: "Search result — page description", group: "Homepage", multiline: true,
    defaultValue:
      "A brotherhood of Christian men anchored in Acts 20:28. Weekly tables around Scripture. Find your group, read the Letter, take a seat." },
  { key: "home.meta.social_title", label: "Link preview — title (texts and social shares)", group: "Homepage", multiline: false,
    defaultValue: "Sheepdog Society — Find your brothers." },
  // ── About ─────────────────────────────────────────────────
  { key: "about.hero.headline1", label: "About hero — headline line 1", group: "About", multiline: false,
    defaultValue: "A brotherhood," },
  { key: "about.hero.headline2", label: "About hero — headline line 2 (italic)", group: "About", multiline: false,
    defaultValue: "rooted and ready." },
  { key: "about.hero.paragraph", label: "About hero — paragraph", group: "About", multiline: true,
    defaultValue:
      "Men of faith, honorable values, prepared in every aspect of life. We protect our families. We sharpen each other. We follow Christ." },
  { key: "about.mission.body", label: "Mission — body", group: "About", multiline: true,
    defaultValue:
      "We are a brotherhood of like-minded men, rooted in honorable Christian values, driven to be prepared in every aspect of life. We protect our faith, our families, ourselves, and anyone in need. We educate, communicate, and demonstrate faith through leadership and fellowship, with boldness, authority, strength, and grace." },
  { key: "about.foundation.body", label: "Foundation — paragraph under the verse", group: "About", multiline: true,
    defaultValue:
      "A call for every man to keep watch, shepherd, train, and be ready. We are called by Christ to be the shepherds over our flock, our church, our families, our wives, our kids. This is not a passive calling. It demands vigilance, courage, and faithfulness." },
  { key: "about.leadership.p1", label: "Leadership — first paragraph", group: "About", multiline: true,
    defaultValue:
      "Our leadership revolves around no single man. It revolves around Jesus Christ. We follow a decentralized model where every man is empowered and confident to lead." },
  { key: "about.leadership.p2", label: "Leadership — second paragraph", group: "About", multiline: true,
    defaultValue:
      "Cut a leg off a starfish, it grows back. That is us. No single point of failure. Every group stands on its own, connected by shared faith and shared mission." },
  { key: "about.believe.1.title", label: "Conviction I — title", group: "About", multiline: false,
    defaultValue: "Scripture is our guide." },
  { key: "about.believe.1.copy", label: "Conviction I — copy", group: "About", multiline: true,
    defaultValue:
      "The Bible is our foundation. We study it, discuss it, and live it out together. Not as scholars, but as men seeking truth." },
  { key: "about.believe.2.title", label: "Conviction II — title", group: "About", multiline: false,
    defaultValue: "Grace transforms." },
  { key: "about.believe.2.copy", label: "Conviction II — copy", group: "About", multiline: true,
    defaultValue:
      "By God's grace, wolves become sheepdogs. Our strength is redeemed, not to destroy, but to protect and serve." },
  { key: "about.believe.3.title", label: "Conviction III — title", group: "About", multiline: false,
    defaultValue: "Brotherhood sharpens." },
  { key: "about.believe.3.copy", label: "Conviction III — copy", group: "About", multiline: true,
    defaultValue:
      "Iron sharpens iron. We are stronger together, carrying burdens, challenging complacency, building each other up." },
  { key: "about.culture.1.heading", label: "Culture I — heading", group: "About", multiline: false,
    defaultValue: "Safe brotherhood." },
  { key: "about.culture.1.copy", label: "Culture I — copy", group: "About", multiline: true,
    defaultValue:
      "What is shared stays confidential. This is a place where men can be real." },
  { key: "about.culture.2.heading", label: "Culture II — heading", group: "About", multiline: false,
    defaultValue: "No conflict." },
  { key: "about.culture.2.copy", label: "Culture II — copy", group: "About", multiline: true,
    defaultValue:
      "We steer away from controversy, complicated subjects, and church politics. We focus on everyday issues men face." },
  { key: "about.culture.3.heading", label: "Culture III — heading", group: "About", multiline: false,
    defaultValue: "Christ-centered." },
  { key: "about.culture.3.copy", label: "Culture III — copy", group: "About", multiline: true,
    defaultValue:
      "Every discussion points back to Jesus. He is our leader, our model, our hope." },
  { key: "about.culture.4.heading", label: "Culture IV — heading", group: "About", multiline: false,
    defaultValue: "Keep it simple." },
  { key: "about.culture.4.copy", label: "Culture IV — copy", group: "About", multiline: true,
    defaultValue:
      "We want any man, young or old, to feel confident walking in and participating. No barriers." },
  { key: "about.meta.title", label: "About — search result title", group: "About", multiline: false,
    defaultValue: "About — Sheepdog Society" },
  { key: "about.meta.description", label: "About — search result description", group: "About", multiline: true,
    defaultValue:
      "A brotherhood of men rooted in honorable Christian values, driven to be prepared in every aspect of life." },
] as const;

export type SiteTextKey = (typeof SITE_TEXT_KEYS)[number]["key"];

export const SITE_TEXT_DEFAULTS: Record<string, string> = Object.fromEntries(
  SITE_TEXT_KEYS.map((e) => [e.key, e.defaultValue])
);
```

- [ ] **Step 5: Run tests, verify pass** — `npm test -- site-text` → 6 tests PASS.

- [ ] **Step 6: Schema + migration.** Append to `src/db/schema.ts` (house style: text PK, snake_case, `withTimezone` like `letter_autopilot`):

```ts
// ── Site text (Phase B) ── curated editable copy; registry in
// src/lib/site-text/registry.ts is the source of truth for which keys
// exist. DB stores overrides only; empty/whitespace value = use default.
export const siteText = pgTable("site_text", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  groupName: text("group_name").notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
});
```

`drizzle/0019_site_text.sql`:
```sql
CREATE TABLE IF NOT EXISTS "site_text" (
  "key" text PRIMARY KEY,
  "label" text NOT NULL,
  "group_name" text NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text REFERENCES "users"("id") ON DELETE SET NULL
);
```

- [ ] **Step 7: Gates** — `npx tsc --noEmit` clean, `npm test` all green.
- [ ] **Step 8: Commit** — `git add src/lib/site-text src/db/schema.ts drizzle/0019_site_text.sql && git commit -m "feat(site-text): key registry, fallback rule, schema + migration 0019"`

---

### Task 2: getSiteTextMap (cached read) + admin save/reset actions

**Files:**
- Create: `src/lib/site-text/get.ts`, `src/server/site-text-admin.ts`

**Interfaces:**
- Consumes: `siteText` table, `SITE_TEXT_DEFAULTS`, `SITE_TEXT_KEYS`, `resolveSiteText` (Task 1).
- Produces: `getSiteTextMap(): Promise<Record<string, string>>` (all keys, defaults applied); `saveSiteText(key: string, value: string): Promise<{ ok: boolean; error?: string }>`; `resetSiteText(key: string): Promise<{ ok: boolean; error?: string }>`.

- [ ] **Step 1: Implement `src/lib/site-text/get.ts`** (NOT `"use server"` — it is imported by public pages; a `"use server"` file would expose every export as a POST endpoint, the Phase C `getAutopilotStatus` lesson):

```ts
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { siteText } from "@/db/schema";
import { SITE_TEXT_DEFAULTS } from "./registry";
import { resolveSiteText } from "./resolve";

/** One query for the whole table, cached under the "site-text" tag.
 *  Saves call revalidateTag("site-text") so edits are live immediately;
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

export async function getSiteTextMap(): Promise<Record<string, string>> {
  let stored: { key: string; value: string }[] = [];
  try {
    stored = await getStoredRows();
  } catch (err) {
    // DB down → the site still renders every shipped default.
    console.error("getSiteTextMap: falling back to defaults", err);
  }
  const map = { ...SITE_TEXT_DEFAULTS };
  for (const row of stored) {
    if (row.key in map) {
      map[row.key] = resolveSiteText(row.value, map[row.key]);
    }
  }
  return map;
}
```

- [ ] **Step 2: Implement `src/server/site-text-admin.ts`** (house style: `"use server"`, local `requireAdmin` throw like `src/server/encouragements.ts`, manual validation, no zod):

```ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { siteText, users } from "@/db/schema";
import { SITE_TEXT_KEYS } from "@/lib/site-text/registry";

const MAX_VALUE_LENGTH = 2000;

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin") throw new Error("Not an admin");
  return userId;
}

function entryFor(key: string) {
  return SITE_TEXT_KEYS.find((e) => e.key === key);
}

function revalidateSiteText(key: string) {
  revalidateTag("site-text");
  // Only two pages consume site_text in this phase.
  revalidatePath(key.startsWith("about.") ? "/about" : "/");
}

export async function saveSiteText(
  key: string,
  value: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await requireAdmin();
    const entry = entryFor(key);
    if (!entry) return { ok: false, error: "Unknown text key." };
    if (typeof value !== "string" || value.length > MAX_VALUE_LENGTH) {
      return { ok: false, error: "That text is too long. Keep it under 2,000 characters." };
    }
    await db
      .insert(siteText)
      .values({
        key,
        label: entry.label,
        groupName: entry.group,
        value,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: siteText.key,
        set: { value, label: entry.label, groupName: entry.group, updatedAt: new Date(), updatedBy: userId },
      });
    revalidateSiteText(key);
    return { ok: true };
  } catch (err) {
    console.error("saveSiteText failed", err);
    return { ok: false, error: "Could not save. Try again." };
  }
}

export async function resetSiteText(
  key: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!entryFor(key)) return { ok: false, error: "Unknown text key." };
    await db.delete(siteText).where(eq(siteText.key, key));
    revalidateSiteText(key);
    return { ok: true };
  } catch (err) {
    console.error("resetSiteText failed", err);
    return { ok: false, error: "Could not reset. Try again." };
  }
}
```

- [ ] **Step 3: Gates** — `npx tsc --noEmit`, `npm test`, `npx eslint src/lib/site-text src/server/site-text-admin.ts` all clean.
- [ ] **Step 4: Commit** — `feat(site-text): cached read map + admin save/reset actions`

---

### Task 3: Homepage reads site_text + generateMetadata

**Files:**
- Modify: `src/app/(public)/page.tsx`

**Interfaces:**
- Consumes: `getSiteTextMap()` (Task 2).

- [ ] **Step 1: Convert metadata.** Delete the `export const metadata: Metadata = {…}` block (lines 19-33) and replace with:

```tsx
export async function generateMetadata(): Promise<Metadata> {
  const t = await getSiteTextMap();
  return {
    title: t["home.meta.title"],
    description: t["home.meta.description"],
    openGraph: {
      title: t["home.meta.social_title"],
      description: t["home.meta.description"],
      images: [{ url: "/api/og/verse", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/api/og/verse"],
    },
  };
}
```
(`export const revalidate = 300` stays.)

- [ ] **Step 2: Read the map in the page component.** Add `getSiteTextMap()` to the existing `Promise.all` fetch block, binding it as `t`.

- [ ] **Step 3: Replace the seeded strings** — exactly these, nothing else:
  - Hero H1 (currently lines 165-169): `{t["home.hero.headline1"]}<br /><em>{t["home.hero.headline2"]}</em>`
  - Hero paragraph (170-175): `{t["home.hero.paragraph"]}`
  - The five What-this-is bodies (237-287): who / happens / why / `where_fallback` (ONLY the `rhythms.length === 0` fallback paragraph — the dynamic rhythms list stays untouched) / start.
  - Join CTA (455-465): `{t["home.join.headline1"]}<br /><em>{t["home.join.headline2"]}</em>` and the button label `{t["home.join.button"]}`.
  - Do NOT touch: standing orders, Acts 20:28 ember band (Scripture), kickers/folio labels, gatherings/letter/story sections.

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `npm run dev` → homepage renders identical copy (defaults) at `/`.
- [ ] **Step 5: Commit** — `feat(site-text): homepage reads curated copy + generateMetadata`

---

### Task 4: About page reads site_text + generateMetadata

**Files:**
- Modify: `src/app/(public)/about/page.tsx`

**Interfaces:**
- Consumes: `getSiteTextMap()`.

- [ ] **Step 1: Make the page async** (`export default async function AboutPage()`), fetch `const t = await getSiteTextMap();`. Replace `export const metadata` with `generateMetadata` returning `{ title: t["about.meta.title"], description: t["about.meta.description"] }`. Add `export const revalidate = 300;` (page was fully static; ISR keeps it cheap while letting `revalidatePath("/about")` refresh it).

- [ ] **Step 2: Replace copy** — hero headline pair + paragraph, mission body, foundation body (the paragraph ONLY — the Acts 20:28 blockquote and its attribution line stay hardcoded, Scripture is never editable), leadership p1/p2, the three conviction `title`/`copy` pairs, the four culture `heading`/`copy` pairs. The inline arrays keep their `icon`/`roman` fields; only the text fields become `t[…]` lookups.

- [ ] **Step 3: Verify** — tsc clean; `/about` renders identical copy.
- [ ] **Step 4: Commit** — `feat(site-text): about page reads curated copy + generateMetadata`

---

### Task 5: /admin/site-text editor

**Files:**
- Create: `src/app/(app)/admin/site-text/page.tsx`, `src/app/(app)/admin/site-text/editor.tsx`

**Interfaces:**
- Consumes: `SITE_TEXT_KEYS`, `saveSiteText`, `resetSiteText`. Server page queries `siteText` directly (uncached — admin sees truth).

- [ ] **Step 1: Server page** (`page.tsx`, pattern: `location-interests/page.tsx` — layout already gates admin):

```tsx
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
```

- [ ] **Step 2: Client editor** (`editor.tsx`) — grouped, expandable rows, one open at a time:

```tsx
"use client";

import { useState, useTransition } from "react";
import { saveSiteText, resetSiteText } from "@/server/site-text-admin";
import { resolveSiteText } from "@/lib/site-text/resolve";

interface EditorEntry {
  key: string;
  label: string;
  group: string;
  defaultValue: string;
  multiline: boolean;
  stored: string | null;
}

export function SiteTextEditor({ entries }: { entries: EditorEntry[] }) {
  const [values, setValues] = useState<Record<string, string | null>>(
    Object.fromEntries(entries.map((e) => [e.key, e.stored]))
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<{ key: string; msg: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = [...new Set(entries.map((e) => e.group))];

  function open(e: EditorEntry) {
    setOpenKey(e.key);
    setDraft(resolveSiteText(values[e.key], e.defaultValue));
    setStatus(null);
  }

  function save(e: EditorEntry) {
    startTransition(async () => {
      const res = await saveSiteText(e.key, draft);
      if (res.ok) {
        setValues((v) => ({ ...v, [e.key]: draft }));
        setOpenKey(null);
        setStatus({ key: e.key, msg: "Saved. The site shows it now.", ok: true });
      } else {
        setStatus({ key: e.key, msg: res.error ?? "Could not save.", ok: false });
      }
    });
  }

  function reset(e: EditorEntry) {
    startTransition(async () => {
      const res = await resetSiteText(e.key);
      if (res.ok) {
        setValues((v) => ({ ...v, [e.key]: null }));
        setOpenKey(null);
        setStatus({ key: e.key, msg: "Back to the original words.", ok: true });
      } else {
        setStatus({ key: e.key, msg: res.error ?? "Could not reset.", ok: false });
      }
    });
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group}>
          <p className="section-mark text-brass">§ {group}</p>
          <ul className="mt-4 divide-y divide-stone/10 border-y border-stone/15">
            {entries.filter((e) => e.group === group).map((e) => {
              const current = resolveSiteText(values[e.key], e.defaultValue);
              const isDefault = resolveSiteText(values[e.key], "") === "";
              const isOpen = openKey === e.key;
              return (
                <li key={e.key} className="py-1">
                  {isOpen ? (
                    <div className="px-2 py-3">
                      <p className="text-sm font-medium">{e.label}</p>
                      {e.multiline ? (
                        <textarea
                          className="mt-2 w-full border border-stone/25 bg-transparent p-3 text-sm leading-relaxed"
                          rows={4}
                          value={draft}
                          onChange={(ev) => setDraft(ev.target.value)}
                        />
                      ) : (
                        <input
                          className="mt-2 h-11 w-full border border-stone/25 bg-transparent px-3 text-sm"
                          value={draft}
                          onChange={(ev) => setDraft(ev.target.value)}
                        />
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button type="button" disabled={pending} onClick={() => save(e)}
                          className="lift inline-flex h-11 items-center border border-bone bg-bone px-5 text-sm font-medium text-iron disabled:opacity-50">
                          Save
                        </button>
                        <button type="button" disabled={pending || isDefault} onClick={() => reset(e)}
                          className="inline-flex h-11 items-center border border-stone/30 px-4 text-sm disabled:opacity-40">
                          Reset to original
                        </button>
                        <button type="button" onClick={() => setOpenKey(null)}
                          className="inline-flex h-11 items-center px-3 text-sm text-stone/70">
                          Cancel
                        </button>
                      </div>
                      {status?.key === e.key && (
                        <p className={`mt-2 text-xs ${status.ok ? "text-moss" : "text-oxblood"}`}>{status.msg}</p>
                      )}
                    </div>
                  ) : (
                    <button type="button" onClick={() => open(e)}
                      className="flex w-full items-start justify-between gap-4 px-2 py-3 text-left transition-colors hover:bg-iron/40">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{e.label}</span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-stone/70">{current}</span>
                      </span>
                      <span className="section-mark shrink-0 pt-1 text-[10px] text-stone/50">
                        {isDefault ? "Original" : "Edited"}
                      </span>
                    </button>
                  )}
                  {!isOpen && status?.key === e.key && (
                    <p className={`px-2 pb-2 text-xs ${status.ok ? "text-moss" : "text-oxblood"}`}>{status.msg}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
```
(Adjust palette classes to match neighbors if `text-moss`/`text-oxblood` differ — check how `autopilot-card.tsx` styles success/error text and mirror it.)

- [ ] **Step 3: Verify manually** — dev server: `/admin/site-text` lists 2 groups; edit hero paragraph → homepage `/` shows it; Reset → original back. 375px: rows are full-width taps, buttons ≥ 44px.
- [ ] **Step 4: Commit** — `feat(admin): site-text editor — tap, edit, save, live`

---

### Task 6: Admin nav regroup + shell fixes

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx` (the `groups` array + active-row fix), `src/components/admin/AdminShell.tsx` (drawer badge prop)

**Interfaces:** none new — data-only regroup. Group membership below is FIXED by spec; hints are new plain-English one-liners (write in Jeremy's voice, no banned words).

- [ ] **Step 1: Replace the `groups` array** with exactly this structure (keep the existing `hint` prop pattern — write a short plain hint per item; badges unchanged):

```
This Week    → Home /admin/dashboard (target) · Inbox /admin/contacts (inbox, badge totalInbox)
The Letter   → The Letter /admin/encouragements (sparkles) · Subscribers /admin/newsletter (mail)
People & Groups → Members /admin/members (users-group) · Groups & Locations /admin/groups (map-pin) ·
                  Plant Requests /admin/location-requests (plus, badge) · Group Interest /admin/location-interests (inbox, badge) ·
                  Events /admin/events (calendar) · Past events /admin/events/past (image)
Site Content → Site text /admin/site-text (scroll) · Resources /admin/resources (download) ·
               Gallery /admin/gallery (image) · Stories /admin/testimonies (flame)
Settings     → Admins /admin/users (shield) · Audit log /admin/audit (clipboard) · Settings /admin/settings (settings)
```
(Icon `scroll` exists — the About page uses it. If any icon name fails the `IconName` type, pick the closest existing one; do not add new SVGs.)

- [ ] **Step 2: Fix the active-row border bug** — the brass `absolute left-0 h-6 w-[3px]` marker sits inside a `<Link>` that is not positioned; add `relative` to that Link's className.

- [ ] **Step 3: Fix the drawer badge bug** — in `AdminShell.tsx`, the mobile-drawer `<AdminSidebar>` instance omits `pendingLocationInterests`; pass it like the desktop instance does.

- [ ] **Step 4: Tap-budget check** — desktop: every sidebar page is 1 tap (groups always expanded, ≤ 2 ✓). Mobile: hamburger (1) → link (2) ≤ 3 ✓. Confirm nav links are ≥ 44px tall at 375px (current `py` on rows — bump to `min-h-11` if short).

- [ ] **Step 5: Verify** — dev server: all 17 links land, active state correct on nested routes (`/admin/events/past` must NOT also mark `/admin/events` active — current prefix logic will; use exact-match precedence: an item is active if `pathname === href` OR (`pathname.startsWith(href + "/")` AND no other item's href equals pathname or is a longer matching prefix). Implement the simple version: compute the single best match (longest matching href) across all items and mark only it).
- [ ] **Step 6: Commit** — `feat(admin): nav regrouped by job — This Week / The Letter / People & Groups / Site Content + fixes`

---

### Task 7: Members + Groups tables — mobile card lists

**Files:**
- Modify: `src/app/(app)/admin/members/members-table.tsx`, `src/app/(app)/admin/groups/groups-locations-table.tsx`

**Interfaces:** none new. The existing state, filters, and action handlers are reused by the card view — no logic duplication: extract each row's action cluster into a small local component if needed so table row and card share it.

Pattern for BOTH files: wrap the existing `<div className="overflow-x-auto …"><table>…</table></div>` in `hidden md:block`, and add a `md:hidden` sibling card list over the SAME filtered/sorted array the table maps.

- [ ] **Step 1: Members card list** (inside `members-table.tsx`, after the filter bar — filter bar already wraps via `flex-wrap`, keep it):

```tsx
{/* 375px card list — same data, same actions as the table below */}
<div className="space-y-3 md:hidden">
  {pageRows.map((m) => (
    <article key={m.id} className="border border-stone/15 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{displayName(m)}</p>
          <p className="truncate text-xs text-stone/70">{m.email}</p>
        </div>
        {/* status pill — reuse the exact pill markup the table's status cell renders */}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {/* the same approve / suspend / role actions the table row renders,
            each ≥ h-11, reusing the existing handlers unchanged */}
      </div>
    </article>
  ))}
</div>
```
Use the component's real row variable/field names (read the file; `pageRows`/`displayName` above are stand-ins for whatever the table's `.map` already iterates — the card consumes the identical array). Parity requirement: every action a table row exposes (approval, role change, suspend, select-for-bulk if present) must be reachable from the card. Bulk-select on mobile may collapse to a checkbox in the card corner.

- [ ] **Step 2: Groups card list** (same pattern in `groups-locations-table.tsx`): card shows name, city/state, meeting day, active/on-map pills, and an Edit button that triggers the SAME `setEditing(id)` the table row uses. The inline edit form already renders outside the table? If it renders inside a `<td>`, move the edit form rendering so both views can open it (simplest: when editing on `< md`, render the edit form as a block above the card list).

- [ ] **Step 3: Verify at 375px** — dev server, resize 375px: no horizontal scroll on either page; every triage action tappable; desktop table unchanged at ≥ 768px.
- [ ] **Step 4: Gates + commit** — tsc/eslint clean → `feat(admin): members + groups card lists at 375px, tables untouched on desktop`

---

### Task 8: Card-list pages responsive pass — contacts, users, plant requests, group interest, events

**Files:**
- Modify: `src/app/(app)/admin/contacts/page.tsx`, `src/app/(app)/admin/users/admin-user-list.tsx`, `src/app/(app)/admin/location-requests/admin-location-requests.tsx`, `src/app/(app)/admin/location-interests/admin-location-interests.tsx`, `src/app/(app)/admin/events/page.tsx`

**Interfaces:** none — className-level changes only. No logic edits.

The shared defect: rows are `flex items-center justify-between gap-4` with no wrap, so action clusters collide with text at 375px.

- [ ] **Step 1: Per page, apply the stacking recipe:**
  - Row container: `flex items-center justify-between gap-4` → `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4`.
  - Action clusters: add `flex flex-wrap gap-2`; every button/tap target `min-h-11` (44px) at mobile.
  - Long fields (`email`, message preview): ensure `min-w-0` + `truncate` or `break-words` so nothing forces horizontal scroll.
  - Users page: `UserCard`'s single row (avatar + name + email + role select + buttons) stacks: identity block on top, controls row below.
  - Events page: the info block stacks above the action buttons; date/location line wraps.
- [ ] **Step 2: Verify each at 375px** — no horizontal scroll, all actions tappable, desktop visually unchanged (compare at 1280px).
- [ ] **Step 3: Gates + commit** — `feat(admin): Tier 1 card lists stack cleanly at 375px`

---

### Task 9: Encouragements list + AdminPageIntro migration + Tier 2 baseline

**Files:**
- Modify: `src/app/(app)/admin/encouragements/page.tsx` (list grid), `src/app/(app)/admin/contacts/page.tsx`, `src/app/(app)/admin/events/page.tsx`, `src/app/(app)/admin/newsletter/page.tsx`, `src/app/(app)/admin/testimonies/page.tsx` (headers), plus any Tier 2 page failing baseline.

**Interfaces:** consumes `AdminPageIntro` as-is (no API change).

- [ ] **Step 1: Encouragements list responsive.** The row is `grid grid-cols-[80px_1fr_140px_120px_120px]` (fixed px — clips at 375px). Change to stack on mobile, original grid from `md:`:

```tsx
className={cn(
  "group/row flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-iron/60 md:grid md:grid-cols-[80px_1fr_140px_120px_120px] md:items-center md:gap-4 md:px-6",
  i > 0 && "border-t border-stone/10"
)}
```
On mobile order: title first (font-medium), then a single meta line combining issue number, status pill, and date (`flex flex-wrap items-center gap-2 text-xs`). Keep the desktop cell order unchanged. Verify the header CTAs ("Schedule a series", "Compose this week's letter") wrap at 375px (`flex-wrap`, `h-11`).

- [ ] **Step 2: Migrate the 4 legacy sidebar pages off `AdminPageHeader` onto `AdminPageIntro`** — contacts, events, newsletter, testimonies (prayer is NOT in the sidebar — skip it, spec: orphan routes get no pass). For each: replace the `AdminPageHeader` usage with `AdminPageIntro` carrying kicker/title and a one-sentence plain-English description of what the page is for (hand-written, Jeremy voice, e.g. contacts: "Messages from the website. Read them, answer them, mark them done."). Keep any page-level action buttons: pass the primary one via `primary` if it is a link; otherwise leave the button where it is below the header.
- [ ] **Step 3: Verb-label sweep** across all Tier 1 pages: every action button starts with a verb ("Approve", "Decline", "Save", "Edit", "Mark resolved", "Reopen") — rename any that don't (e.g. bare "Details" → "Open").
- [ ] **Step 4: Tier 2 baseline sweep** — visit at 375px: resources, newsletter, testimonies, audit, settings, gallery, site-text: (a) drawer nav opens/closes, (b) zero horizontal scroll (`overflow-x-auto` on any wide table is acceptable containment), (c) primary actions ≥ 44px. Letter editor (`/admin/encouragements/[id]`): confirm at 375px it can be READ and the publish/schedule controls are reachable and tappable; full editing comfort explicitly out of scope. Fix only what fails these three checks — no redesigns.
- [ ] **Step 5: Gates + commit** — `feat(admin): encouragements list stacks at 375px; AdminPageIntro everywhere; Tier 2 baseline`

---

### Task 10: Gates, live-fire, final review, ship

**Files:** none new (docs stamps at the end).

- [ ] **Step 1: Static gates** — `npx tsc --noEmit` · `npm test` · `npx eslint <all touched files>` · `npm run check:contrast` — all green, reported honestly.
- [ ] **Step 2: Apply migration 0019 to prod** — `DATABASE_URL='<unpooled>' node scripts/apply-neon-migration.mjs` then verify via information_schema (additive table; safe pre-merge, same as 0018).
- [ ] **Step 3: Live-fire on the dev server** (preview tools, NOT Bash):
  - Site text end-to-end: `/admin/site-text` → edit `home.hero.paragraph` to a sentinel → `/` shows it (revalidateTag + revalidatePath worked) → Reset to original → `/` shows default again. Confirm `site_text` table state before/after (0 rows at rest → 1 → 0).
  - generateMetadata: view-source of `/` shows the title/description; edit `home.meta.title` → sentinel appears in `<title>` → reset.
  - 375px walkthrough of all 8 Tier 1 pages + Tier 2 checks; screenshot evidence of members cards, groups cards, encouragements stack, site-text editor.
  - Desktop 1280px spot-check: tables and lists visually unchanged.
- [ ] **Step 4: Final whole-branch review** — `scripts/review-package $(git merge-base main HEAD) HEAD`, then the multi-lens adversarial workflow (spec-coverage lens + trust/regression lens + ledger-triage lens), most capable model; ONE consolidated fix wave + re-verdict.
- [ ] **Step 5: Ship** — push branch → PR via `--body-file` (note: nothing publishes differently; site copy now editable at /admin/site-text; nav regrouped; 375px pass) → Vercel check green → squash-merge → migration Action green (0019 idempotent) → live prod verification: `/` + `/about` render unchanged defaults, `/admin/site-text` 307s unauth, zero runtime errors (1h window).
- [ ] **Step 6: Docs + memory** — spec §Phase B stamped SHIPPED; CLAUDE.md: add `/admin/site-text` route + site_text pattern line (registry in code, DB overrides, tag `site-text`); ledger final entry; memory update (Phase B shipped = Phase 4 arc COMPLETE).
- [ ] **Step 7: Report to Drew** — what shipped, where Jeremy edits copy, the arc-complete summary.

---

## Self-Review

1. **Spec coverage:** B.1 site_text (Tasks 1-5: table w/ exact spec columns, fallback rule verbatim, curated keys = homepage 5W1H + About only, generateMetadata, grouped tap→textarea→save→live editor, no layout controls) ✓ · B.2 nav regroup (Task 6, membership verbatim, tap budget check) ✓ · B.3 mobile pass (Tasks 7-9: Tier 1 parity incl. both tables + encouragements grid; Tier 2 baseline; letter editor read+publish only; orphans skipped) ✓ · B.4 (Task 9: AdminPageIntro on remaining sidebar pages + verb sweep) ✓ · cross-cutting ship pipeline (Task 10) ✓.
2. **Placeholder scan:** Task 7 cards intentionally bind to the component's real iterators by instruction rather than pasted 964-line internals — the requirement (same array, same handlers, parity checklist) is complete and the scout map pins file structure. No TBDs remain.
3. **Type consistency:** `SiteTextEntry.defaultValue`/`group`/`multiline` naming consistent across registry, tests, get.ts, editor (`EditorEntry` mirrors + `stored`); `resolveSiteText(stored, fallback)` signature identical in resolve.ts, get.ts, editor.tsx; actions return `{ ok, error? }` in both and the editor consumes exactly that.

**Decisions locked here (with why):**
- Registry-in-code + DB-overrides (not seeded rows): the spec's "seeded keys are exactly" defines the curated LIST; storing defaults in code makes "empty DB renders the site" trivially true and keeps git as the default-copy audit trail. label/group_name are still persisted on upsert per the spec's column list.
- Two-line headline keys (headline1/headline2) preserve the `<br/><em>` typography without giving Jeremy markup — "no layout controls by design".
- The dormant `pages`/`pageVersions` block-CMS schema stays untouched (spec rejected block CMS).
- About page gains `revalidate = 300` + generateMetadata to match the homepage's consumption pattern.
