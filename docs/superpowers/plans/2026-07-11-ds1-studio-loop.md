# DS-1 — Design Studio: Prove the Loop (Homepage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The full Studio loop — draft → preview (device/mode) → compare → Apply → undo — working end to end for the homepage, with 5 AA-gated themes, meeting the spec's five acceptance checks (PARITY, ISOLATION, LOOP, UNDO, SAFETY).

**Architecture:** Curated config (single-row `site_studio` draft/published jsonb + `site_text.draft_value`) rendered through a pure render-merge rule; themes as var-override `<style>` from the (public) layout; draft visibility via Next `draftMode()` checked OUTSIDE all cache scopes; compare via middleware cookie-strip; Apply/Restore as advisory-locked Server-Action transactions snapshotting to `studio_versions`.

**Tech Stack:** Next.js 16.1.6 App Router, Drizzle/Neon (postgres-js), Tailwind v4, Vitest, no new dependencies.

## Global Constraints (verbatim from spec rev 2 — binding on every task)

- Empty/absent config + no drafts renders today's site DOM-identically; `pasture-iron` emits NO override block.
- `draftMode()` is never called inside a cached closure: draft branch = direct uncached DB read; published branch = existing/new `unstable_cache` reads, untouched.
- Apply/Discard/Restore are **Server Actions** (`updateTag` is Server-Action-only). Cache flush is exactly `updateTag("studio")` + `updateTag("site-text")` + `revalidatePath("/", "layout")`.
- Apply and Restore transactions open with `SELECT pg_advisory_xact_lock(815552)` — never 815551 (letter series).
- Snapshot arithmetic: newest `studio_versions` row == current published state; baseline row inserted on first Apply; ALL ordering/pruning keys on `id` (bigint identity), never `created_at`.
- Theme `<style>` block: emitted by `src/app/(public)/layout.tsx` only; selectors `body:has([data-site-theme])` (light) / `.dark body:has([data-site-theme])` (dark); plain `<style>` with no `precedence` prop; `--c-iron` is theme-constant (paper-card shadow + admin contract) — themes never override it.
- StudioModeForcer: toggles the `dark` class + `style.colorScheme` on documentElement directly; NEVER next-themes `setTheme`, NEVER localStorage; rendered only when `(await draftMode()).isEnabled`.
- Locked sections: not hideable, not reorderable; render-merge forces them visible. Scripture is never a key, never hideable. Ember bands + cover art theme-constant.
- Voice: all UI copy hand-written, Jeremy voice, no banned words (delve/leverage/navigate/robust/journey/rise/reclaim), no em-dashes where commas work.
- npm NOT pnpm; migrations hand-written + applied via `scripts/apply-neon-migration.mjs` (controller); never `drizzle-kit push`.
- Gates per task: `npx tsc --noEmit`, `npm test`, `npx eslint <touched>`, and (Tasks 2+) `npm run check:contrast`.
- Scout files: spec at `docs/superpowers/specs/2026-07-11-admin-design-studio-design.md` (rev 2) is the requirements source of truth.

## File Structure

```
src/lib/studio/config.ts          # types + DEFAULT_CONFIG + renderMerge (pure)
src/lib/studio/config.test.ts
src/lib/studio/sections.ts        # section registries (DS-1: home only)
src/lib/studio/summary.ts         # version summary generator (pure)
src/lib/studio/summary.test.ts
src/lib/studio/themes-data.mjs    # 5 themes' var records (plain module — node script imports it)
src/lib/studio/themes.ts          # typed wrapper + blurbs
src/lib/studio/get.ts             # getStudioConfig (+ draft branch)
src/db/schema-studio.ts           # site_studio + studio_versions
drizzle/0020_design_studio.sql
src/server/studio.ts              # Server Actions: drafts, apply, discard, restore, versions
src/app/api/admin/studio/preview/route.ts   # draftMode enable/disable (GET with ?off)
src/middleware.ts                 # + ?studio=published cookie-strip
src/app/(public)/layout.tsx       # + theme block, marker, ribbon, StudioModeForcer
src/components/studio/StudioModeForcer.tsx
src/components/studio/DraftRibbon.tsx
src/app/(public)/page.tsx         # homepage sections → ordered assembly
src/app/(app)/admin/studio/page.tsx      # server page
src/app/(app)/admin/studio/studio.tsx    # client UI
src/lib/site-text/get.ts          # + draft branch (outside cache)
src/server/site-text-admin.ts     # draft-safety (no DELETE over pending draft)
scripts/check-contrast.mjs        # + 5-theme × 2-mode iteration
```

---

### Task 1: Studio config core — types, render-merge, sections registry, summary (pure, TDD)

**Files:**
- Create: `src/lib/studio/config.ts`, `src/lib/studio/config.test.ts`, `src/lib/studio/sections.ts`, `src/lib/studio/summary.ts`, `src/lib/studio/summary.test.ts`

**Interfaces (later tasks rely on these exact names):**
- `type StudioConfig = { themeId: string; pages: Record<string, { sections: { id: string; visible: boolean }[] }> }`
- `const DEFAULT_CONFIG: StudioConfig` (`{ themeId: "pasture-iron", pages: {} }`)
- `type SectionDef = { id: string; label: string; hint: string; locked?: true }`
- `const SECTION_REGISTRY: Record<string, { pageId: string; label: string; sections: SectionDef[] }>`
- `renderMerge(pageId: string, config: StudioConfig): { id: string; visible: boolean; locked: boolean }[]`
- `resolveThemeId(config: StudioConfig, knownIds: string[]): string`
- `summarize(prev: {config: StudioConfig; textOverrides: Record<string,string>}, next: same, sectionLabels: Record<string,string>, themeNames: Record<string,string>): string`

- [ ] **Step 1: Write failing tests** — `config.test.ts` covers the spec's render-merge rule verbatim:

```ts
import { describe, expect, it } from "vitest";
import { renderMerge, resolveThemeId, DEFAULT_CONFIG, type StudioConfig } from "./config";
import { SECTION_REGISTRY } from "./sections";

const HOME = SECTION_REGISTRY.home;
const ids = (r: { id: string }[]) => r.map((s) => s.id);

describe("renderMerge", () => {
  it("absent page entry renders registry order, all visible", () => {
    const out = renderMerge("home", DEFAULT_CONFIG);
    expect(ids(out)).toEqual(HOME.sections.map((s) => s.id));
    expect(out.every((s) => s.visible)).toBe(true);
  });
  it("config order applies only to ids it names; missing registry sections keep registry position, visible", () => {
    const cfg: StudioConfig = { themeId: "pasture-iron", pages: { home: { sections: [
      { id: "join-cta", visible: true }, { id: "what-this-is", visible: false },
    ] } } };
    const out = renderMerge("home", cfg);
    // named ids appear in config order at the slots config ordering yields;
    // unnamed registry ids hold their registry positions (deterministic rule
    // implemented: walk registry order, but named ids are re-sequenced among
    // themselves to match config order).
    expect(ids(out)).toContain("hero");
    expect(out.find((s) => s.id === "what-this-is")).toMatchObject({ visible: false });
    const joinIdx = ids(out).indexOf("join-cta");
    const whatIdx = ids(out).indexOf("what-this-is");
    expect(joinIdx).toBeLessThan(whatIdx); // config order among named ids
  });
  it("locked sections are forced visible and keep registry position regardless of config", () => {
    const cfg: StudioConfig = { themeId: "pasture-iron", pages: { home: { sections: [
      { id: "verse", visible: false }, { id: "verse", visible: false },
    ] } } };
    const verse = renderMerge("home", cfg).find((s) => s.id === "verse")!;
    expect(verse.visible).toBe(true);
    expect(verse.locked).toBe(true);
  });
  it("config ids not in the registry are dropped", () => {
    const cfg: StudioConfig = { themeId: "pasture-iron", pages: { home: { sections: [
      { id: "not-a-real-section", visible: true },
    ] } } };
    expect(ids(renderMerge("home", cfg))).not.toContain("not-a-real-section");
  });
  it("unknown pageId returns empty array", () => {
    expect(renderMerge("nope", DEFAULT_CONFIG)).toEqual([]);
  });
});

describe("resolveThemeId", () => {
  it("unknown themeId falls back to pasture-iron", () => {
    expect(resolveThemeId({ themeId: "neon-vaporwave", pages: {} }, ["pasture-iron", "harvest"])).toBe("pasture-iron");
    expect(resolveThemeId({ themeId: "harvest", pages: {} }, ["pasture-iron", "harvest"])).toBe("harvest");
  });
});
```

`summary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarize } from "./summary";

const labels = { "what-this-is": "What this is", "join-cta": "Join invitation" };
const names = { "pasture-iron": "Pasture & Iron", harvest: "Harvest" };
const base = { config: { themeId: "pasture-iron", pages: {} }, textOverrides: {} as Record<string, string> };

describe("summarize", () => {
  it("names the theme switch, section changes, and text edit count", () => {
    const next = {
      config: { themeId: "harvest", pages: { home: { sections: [{ id: "what-this-is", visible: false }] } } },
      textOverrides: { "home.hero.headline1": "Stand with your", "home.hero.paragraph": "x" },
    };
    const s = summarize(base, next, labels, names);
    expect(s).toContain("Switched to Harvest");
    expect(s).toContain("hid What this is");
    expect(s).toContain("edited 2 lines");
  });
  it("no changes reads plainly", () => {
    expect(summarize(base, base, labels, names)).toBe("No changes.");
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- studio` → modules missing.
- [ ] **Step 3: Implement.** `config.ts`:

```ts
export type SectionState = { id: string; visible: boolean };
export type StudioConfig = {
  themeId: string;
  pages: Record<string, { sections: SectionState[] }>;
};

export const DEFAULT_CONFIG: StudioConfig = { themeId: "pasture-iron", pages: {} };

import { SECTION_REGISTRY, type SectionDef } from "./sections";

/** Spec render-merge rule — used identically on studio read, public render,
 *  and restore: config order/visibility applies only to ids it names;
 *  registry sections missing from config render visible at registry
 *  position; unknown config ids are dropped; locked sections are forced
 *  visible and keep registry position; duplicates in config: first wins. */
export function renderMerge(
  pageId: string,
  config: StudioConfig
): { id: string; visible: boolean; locked: boolean }[] {
  const page = SECTION_REGISTRY[pageId];
  if (!page) return [];
  const named = new Map<string, SectionState>();
  for (const s of config.pages[pageId]?.sections ?? []) {
    if (!named.has(s.id)) named.set(s.id, s);
  }
  const registryIds = page.sections.map((s) => s.id);
  const namedOrder = [...named.keys()].filter((id) => {
    const def = page.sections.find((s) => s.id === id);
    return def && !def.locked;
  });
  // Walk registry order; unlocked ids that appear in config are re-sequenced
  // among themselves per config order. Locked + unnamed ids hold registry slots.
  const namedSlots = registryIds.filter((id) => namedOrder.includes(id));
  let cursor = 0;
  return page.sections.map((def: SectionDef) => {
    let id = def.id;
    if (namedSlots.includes(def.id)) {
      id = namedOrder[cursor++];
    }
    const cfg = named.get(id);
    const locked = !!page.sections.find((s) => s.id === id)?.locked;
    return { id, visible: locked ? true : cfg?.visible ?? true, locked };
  });
}

export function resolveThemeId(config: StudioConfig, knownIds: string[]): string {
  return knownIds.includes(config.themeId) ? config.themeId : "pasture-iron";
}
```

`sections.ts` (homepage only in DS-1 — ids MUST match Task 7's assembly):

```ts
export type SectionDef = { id: string; label: string; hint: string; locked?: true };

export const SECTION_REGISTRY: Record<
  string,
  { pageId: string; label: string; sections: SectionDef[] }
> = {
  home: {
    pageId: "home",
    label: "Homepage",
    sections: [
      { id: "hero", label: "Front page hero", hint: "The first thing every visitor reads.", locked: true },
      { id: "verse", label: "Acts 20:28 band", hint: "Scripture stays.", locked: true },
      { id: "what-this-is", label: "What this is", hint: "The five plain answers." },
      { id: "gatherings", label: "Next gatherings", hint: "Live from the events calendar.", locked: true },
      { id: "letter", label: "This week's Letter", hint: "Live from the Letter.", locked: true },
      { id: "story", label: "Brother's story", hint: "Live from Stories.", locked: true },
      { id: "join-cta", label: "Join invitation", hint: "The closing ask." },
    ],
  },
};
```

`summary.ts`:

```ts
import type { StudioConfig } from "./config";

type Snap = { config: StudioConfig; textOverrides: Record<string, string> };

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
  for (const [id, v] of after) {
    const was = before.get(id) ?? true;
    if (v !== was) parts.push(`${v ? "showed" : "hid"} ${sectionLabels[id] ?? id}`);
  }
  const edited = Object.keys(next.textOverrides).filter(
    (k) => next.textOverrides[k] !== prev.textOverrides[k]
  ).length + Object.keys(prev.textOverrides).filter((k) => !(k in next.textOverrides)).length;
  if (edited > 0) parts.push(`edited ${edited} ${edited === 1 ? "line" : "lines"}`);
  if (parts.length === 0) return "No changes.";
  const s = parts.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- studio`.
- [ ] **Step 5: Gates + commit** — `git add src/lib/studio && git commit -m "feat(studio): config types, render-merge rule, homepage section registry, version summaries"`

---

### Task 2: Themes — data module, typed registry, contrast-gate extension

**Files:**
- Create: `src/lib/studio/themes-data.mjs`, `src/lib/studio/themes.ts`
- Modify: `scripts/check-contrast.mjs`

**Interfaces:**
- themes-data.mjs: `export const THEME_DATA = [{ id, light: {...}, dark: {...} }, ...]` — var-name → value records. `pasture-iron` has EMPTY light/dark (identity: no overrides, no style block).
- themes.ts: `export const THEMES: { id: string; name: string; blurb: string; light: Record<string,string>; dark: Record<string,string> }[]`, `export const THEME_IDS`, `export function themeById(id)`.
- Var surface per theme (non-identity): the 10 themeable `--c-*` names (`--c-bone --c-cream --c-ink --c-navy --c-brass --c-brass-deep --c-gold --c-olive --c-oxblood --c-stone` — **`--c-iron` is constant, never in a theme**) + the 20 semantic names (`--background --foreground --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --destructive --border --input --ring --bronze --bronze-foreground`). Both modes, every name present.

- [ ] **Step 1: Write themes-data.mjs.** Derivation rule (KEEP the base's oklch lightness/chroma structure — contrast is lightness-driven, so AA survives hue rotation; the gate verifies exactly). Base structure: light bg L=.96, fg L=.18, primary L=.66 C=.13; dark bg L=.18, fg L=.93, primary L=.73. The four alternates below are STARTING VALUES — the contrast gate is the objective check; visual hand-tuning in the Studio preview (Task 10 live-fire) within gate-passing bounds is expected and allowed.

```js
/** Theme color records. Plain .mjs so scripts/check-contrast.mjs can import
 *  natively. pasture-iron = identity (empty overrides; emits no style block).
 *  --c-iron is intentionally absent everywhere: theme-constant by contract. */
export const THEME_DATA = [
  { id: "pasture-iron", light: {}, dark: {} },
  {
    id: "harvest", // warm copper + wheat: late-October kitchen-table light
    light: {
      "--background": "oklch(0.96 0.016 70)", "--foreground": "oklch(0.18 0.03 50)",
      "--card": "oklch(0.99 0.008 75)", "--card-foreground": "oklch(0.18 0.03 50)",
      "--popover": "oklch(0.99 0.008 75)", "--popover-foreground": "oklch(0.18 0.03 50)",
      "--primary": "oklch(0.60 0.14 55)", "--primary-foreground": "oklch(0.98 0.008 75)",
      "--secondary": "oklch(0.92 0.024 70)", "--secondary-foreground": "oklch(0.22 0.03 50)",
      "--muted": "oklch(0.92 0.024 70)", "--muted-foreground": "oklch(0.48 0.04 55)",
      "--accent": "oklch(0.60 0.14 55)", "--accent-foreground": "oklch(0.98 0.008 75)",
      "--destructive": "oklch(0.46 0.14 30)", "--border": "oklch(0.85 0.028 70)",
      "--input": "oklch(0.85 0.028 70)", "--ring": "oklch(0.60 0.14 55)",
      "--bronze": "oklch(0.60 0.14 55)", "--bronze-foreground": "oklch(0.98 0.008 75)",
      "--c-bone": "#F4E9D6", "--c-cream": "#FAF1DE", "--c-ink": "#241505",
      "--c-navy": "#3A2410", "--c-brass": "#B5722A", "--c-brass-deep": "#7A4A14",
      "--c-gold": "#D28E3E", "--c-olive": "#6B5A2E", "--c-oxblood": "#7A281A", "--c-stone": "#75654C",
    },
    dark: {
      "--background": "oklch(0.18 0.03 45)", "--foreground": "oklch(0.93 0.03 75)",
      "--card": "oklch(0.22 0.03 45)", "--card-foreground": "oklch(0.93 0.03 75)",
      "--popover": "oklch(0.22 0.03 45)", "--popover-foreground": "oklch(0.93 0.03 75)",
      "--primary": "oklch(0.73 0.13 65)", "--primary-foreground": "oklch(0.18 0.03 45)",
      "--secondary": "oklch(0.27 0.03 45)", "--secondary-foreground": "oklch(0.93 0.03 75)",
      "--muted": "oklch(0.27 0.03 45)", "--muted-foreground": "oklch(0.70 0.04 70)",
      "--accent": "oklch(0.73 0.13 65)", "--accent-foreground": "oklch(0.18 0.03 45)",
      "--destructive": "oklch(0.6 0.18 30)", "--border": "oklch(0.32 0.03 45)",
      "--input": "oklch(0.30 0.03 45)", "--ring": "oklch(0.73 0.13 65)",
      "--bronze": "oklch(0.73 0.13 65)", "--bronze-foreground": "oklch(0.18 0.03 45)",
      "--c-bone": "#2A2013", "--c-cream": "#332818", "--c-ink": "#F0E4CE",
      "--c-navy": "#1C130A", "--c-brass": "#DE9F45", "--c-brass-deep": "#DE9F45",
      "--c-gold": "#EAB86A", "--c-olive": "#8C7A4A", "--c-oxblood": "#C05038", "--c-stone": "#CBBB9E",
    },
  },
  {
    id: "winter-watch", // steel blue + slate: cold-morning watchfulness
    light: {
      "--background": "oklch(0.95 0.008 240)", "--foreground": "oklch(0.17 0.022 250)",
      "--card": "oklch(0.98 0.005 240)", "--card-foreground": "oklch(0.17 0.022 250)",
      "--popover": "oklch(0.98 0.005 240)", "--popover-foreground": "oklch(0.17 0.022 250)",
      "--primary": "oklch(0.50 0.09 245)", "--primary-foreground": "oklch(0.97 0.005 240)",
      "--secondary": "oklch(0.91 0.012 240)", "--secondary-foreground": "oklch(0.21 0.022 250)",
      "--muted": "oklch(0.91 0.012 240)", "--muted-foreground": "oklch(0.47 0.03 248)",
      "--accent": "oklch(0.50 0.09 245)", "--accent-foreground": "oklch(0.97 0.005 240)",
      "--destructive": "oklch(0.46 0.14 30)", "--border": "oklch(0.84 0.014 240)",
      "--input": "oklch(0.84 0.014 240)", "--ring": "oklch(0.50 0.09 245)",
      "--bronze": "oklch(0.50 0.09 245)", "--bronze-foreground": "oklch(0.97 0.005 240)",
      "--c-bone": "#E8ECF2", "--c-cream": "#F1F4F8", "--c-ink": "#0C1420",
      "--c-navy": "#152238", "--c-brass": "#3E6284", "--c-brass-deep": "#2A4560",
      "--c-gold": "#6E8FB0", "--c-olive": "#4A6355", "--c-oxblood": "#6E2430", "--c-stone": "#5E6774",
    },
    dark: {
      "--background": "oklch(0.17 0.024 250)", "--foreground": "oklch(0.93 0.012 235)",
      "--card": "oklch(0.21 0.024 250)", "--card-foreground": "oklch(0.93 0.012 235)",
      "--popover": "oklch(0.21 0.024 250)", "--popover-foreground": "oklch(0.93 0.012 235)",
      "--primary": "oklch(0.72 0.08 235)", "--primary-foreground": "oklch(0.17 0.024 250)",
      "--secondary": "oklch(0.26 0.024 250)", "--secondary-foreground": "oklch(0.93 0.012 235)",
      "--muted": "oklch(0.26 0.024 250)", "--muted-foreground": "oklch(0.70 0.02 240)",
      "--accent": "oklch(0.72 0.08 235)", "--accent-foreground": "oklch(0.17 0.024 250)",
      "--destructive": "oklch(0.6 0.18 30)", "--border": "oklch(0.31 0.024 250)",
      "--input": "oklch(0.29 0.024 250)", "--ring": "oklch(0.72 0.08 235)",
      "--bronze": "oklch(0.72 0.08 235)", "--bronze-foreground": "oklch(0.17 0.024 250)",
      "--c-bone": "#182234", "--c-cream": "#1E2A40", "--c-ink": "#E6EBF2",
      "--c-navy": "#0A111E", "--c-brass": "#7FA3C8", "--c-brass-deep": "#7FA3C8",
      "--c-gold": "#9DBBD8", "--c-olive": "#7A9384", "--c-oxblood": "#C46A75", "--c-stone": "#B4BCC8",
    },
  },
  {
    id: "daybreak", // brighter parchment + sunrise gold: lighter, earlier
    light: {
      "--background": "oklch(0.975 0.012 90)", "--foreground": "oklch(0.20 0.02 260)",
      "--card": "oklch(0.995 0.006 90)", "--card-foreground": "oklch(0.20 0.02 260)",
      "--popover": "oklch(0.995 0.006 90)", "--popover-foreground": "oklch(0.20 0.02 260)",
      "--primary": "oklch(0.58 0.13 85)", "--primary-foreground": "oklch(0.99 0.006 90)",
      "--secondary": "oklch(0.94 0.018 90)", "--secondary-foreground": "oklch(0.24 0.02 260)",
      "--muted": "oklch(0.94 0.018 90)", "--muted-foreground": "oklch(0.50 0.03 85)",
      "--accent": "oklch(0.58 0.13 85)", "--accent-foreground": "oklch(0.99 0.006 90)",
      "--destructive": "oklch(0.46 0.14 30)", "--border": "oklch(0.87 0.02 90)",
      "--input": "oklch(0.87 0.02 90)", "--ring": "oklch(0.58 0.13 85)",
      "--bronze": "oklch(0.58 0.13 85)", "--bronze-foreground": "oklch(0.99 0.006 90)",
      "--c-bone": "#F8F3E4", "--c-cream": "#FCF8EC", "--c-ink": "#141B28",
      "--c-navy": "#1E2A42", "--c-brass": "#B08420", "--c-brass-deep": "#75570F",
      "--c-gold": "#D2A63A", "--c-olive": "#5E7040", "--c-oxblood": "#802222", "--c-stone": "#6E6A56",
    },
    dark: {
      "--background": "oklch(0.20 0.02 255)", "--foreground": "oklch(0.94 0.02 85)",
      "--card": "oklch(0.24 0.02 255)", "--card-foreground": "oklch(0.94 0.02 85)",
      "--popover": "oklch(0.24 0.02 255)", "--popover-foreground": "oklch(0.94 0.02 85)",
      "--primary": "oklch(0.75 0.12 85)", "--primary-foreground": "oklch(0.20 0.02 255)",
      "--secondary": "oklch(0.29 0.02 255)", "--secondary-foreground": "oklch(0.94 0.02 85)",
      "--muted": "oklch(0.29 0.02 255)", "--muted-foreground": "oklch(0.72 0.025 82)",
      "--accent": "oklch(0.75 0.12 85)", "--accent-foreground": "oklch(0.20 0.02 255)",
      "--destructive": "oklch(0.6 0.18 30)", "--border": "oklch(0.34 0.02 255)",
      "--input": "oklch(0.32 0.02 255)", "--ring": "oklch(0.75 0.12 85)",
      "--bronze": "oklch(0.75 0.12 85)", "--bronze-foreground": "oklch(0.20 0.02 255)",
      "--c-bone": "#1E2838", "--c-cream": "#243146", "--c-ink": "#F2EDDC",
      "--c-navy": "#0E1524", "--c-brass": "#E2B04A", "--c-brass-deep": "#E2B04A",
      "--c-gold": "#EDC468", "--c-olive": "#83945C", "--c-oxblood": "#BE4B4B", "--c-stone": "#C9C2B0",
    },
  },
  {
    id: "evergreen", // deep pine + moss: standing timber, same parchment ground
    light: {
      "--background": "oklch(0.96 0.012 110)", "--foreground": "oklch(0.18 0.025 160)",
      "--card": "oklch(0.99 0.006 110)", "--card-foreground": "oklch(0.18 0.025 160)",
      "--popover": "oklch(0.99 0.006 110)", "--popover-foreground": "oklch(0.18 0.025 160)",
      "--primary": "oklch(0.48 0.10 150)", "--primary-foreground": "oklch(0.97 0.006 110)",
      "--secondary": "oklch(0.92 0.016 110)", "--secondary-foreground": "oklch(0.22 0.025 160)",
      "--muted": "oklch(0.92 0.016 110)", "--muted-foreground": "oklch(0.46 0.035 150)",
      "--accent": "oklch(0.48 0.10 150)", "--accent-foreground": "oklch(0.97 0.006 110)",
      "--destructive": "oklch(0.46 0.14 30)", "--border": "oklch(0.85 0.018 110)",
      "--input": "oklch(0.85 0.018 110)", "--ring": "oklch(0.48 0.10 150)",
      "--bronze": "oklch(0.48 0.10 150)", "--bronze-foreground": "oklch(0.97 0.006 110)",
      "--c-bone": "#EEF0E2", "--c-cream": "#F5F6EA", "--c-ink": "#101A14",
      "--c-navy": "#18281E", "--c-brass": "#3F7048", "--c-brass-deep": "#2A4E32",
      "--c-gold": "#7FA060", "--c-olive": "#4E6B3A", "--c-oxblood": "#75281E", "--c-stone": "#636C58",
    },
    dark: {
      "--background": "oklch(0.18 0.025 165)", "--foreground": "oklch(0.93 0.02 110)",
      "--card": "oklch(0.22 0.025 165)", "--card-foreground": "oklch(0.93 0.02 110)",
      "--popover": "oklch(0.22 0.025 165)", "--popover-foreground": "oklch(0.93 0.02 110)",
      "--primary": "oklch(0.72 0.10 145)", "--primary-foreground": "oklch(0.18 0.025 165)",
      "--secondary": "oklch(0.27 0.025 165)", "--secondary-foreground": "oklch(0.93 0.02 110)",
      "--muted": "oklch(0.27 0.025 165)", "--muted-foreground": "oklch(0.70 0.03 130)",
      "--accent": "oklch(0.72 0.10 145)", "--accent-foreground": "oklch(0.18 0.025 165)",
      "--destructive": "oklch(0.6 0.18 30)", "--border": "oklch(0.32 0.025 165)",
      "--input": "oklch(0.30 0.025 165)", "--ring": "oklch(0.72 0.10 145)",
      "--bronze": "oklch(0.72 0.10 145)", "--bronze-foreground": "oklch(0.18 0.025 165)",
      "--c-bone": "#1B2A20", "--c-cream": "#213328", "--c-ink": "#EAF0DE",
      "--c-navy": "#0C1710", "--c-brass": "#7CB884", "--c-brass-deep": "#7CB884",
      "--c-gold": "#9CCB8E", "--c-olive": "#89A06A", "--c-oxblood": "#C25A50", "--c-stone": "#B9C2AC",
    },
  },
];
```

- [ ] **Step 2: themes.ts wrapper:**

```ts
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
```

(Add `// @ts-expect-error plain data module` or a `themes-data.d.mts` declaration file — implementer picks whichever tsc accepts cleanly; a 3-line `.d.mts` beside the .mjs is the clean answer: `export const THEME_DATA: { id: string; light: Record<string,string>; dark: Record<string,string> }[];`)

- [ ] **Step 3: Extend check-contrast.mjs.** After the existing base-theme PAIRS run, add:

```js
import { THEME_DATA } from "../src/lib/studio/themes-data.mjs";
// For each non-identity theme: overlay its vars on the parsed baseline and
// re-run the same PAIRS in both modes. A theme may not ship below AA.
for (const theme of THEME_DATA) {
  if (Object.keys(theme.light).length === 0) continue; // pasture-iron identity
  const tLight = { ...light, ...theme.light };
  const tDark = { ...dark, ...theme.dark };
  runPairs(`theme:${theme.id} light`, tLight);
  runPairs(`theme:${theme.id} dark`, tDark);
}
```

This requires refactoring the script's existing pair-checking loop into a `runPairs(label, vars)` function called once for the baseline (existing behavior, unchanged output) and once per theme × mode. Failures list the theme label. Read the script fully first; keep its PAIRS data and math untouched.

- [ ] **Step 4: Gate** — `npm run check:contrast` → all 5 themes × 2 modes PASS (tune any failing value's oklch lightness minimally until green — chroma/hue stay; document tunes in the report).
- [ ] **Step 5: Full gates + commit** — `feat(studio): five themes, typed registry, contrast gate covers every theme in both modes`

---

### Task 3: Migration 0020 + schema

**Files:**
- Create: `src/db/schema-studio.ts`, `drizzle/0020_design_studio.sql`
- Modify: `src/db/schema.ts` (re-export line beside schema-site-text), `src/db/schema-site-text.ts` (draft_value column)

**Interfaces:** `siteStudio` (id serial PK, draft jsonb NOT NULL default '{}', published jsonb NOT NULL default '{}', updatedAt timestamptz, updatedBy FK), `studioVersions` (id bigint identity PK, snapshot jsonb NOT NULL, summary text NOT NULL, createdAt timestamptz, createdBy FK), `siteText.draftValue` (text, nullable).

- [ ] **Step 1: schema-studio.ts** (withTimezone per schema-pages precedent; users import per schema-site-text):

```ts
import { bigint, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./schema";

// Single row (letter_autopilot precedent). draft/published hold StudioConfig
// (src/lib/studio/config.ts). Empty object = DEFAULT_CONFIG semantics.
export const siteStudio = pgTable("site_studio", {
  id: serial("id").primaryKey(),
  draft: jsonb("draft").notNull().default({}),
  published: jsonb("published").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
});

// Snapshot arithmetic: newest row == current published state. ALL ordering
// and pruning key on id (identity), never created_at (same-transaction ties).
export const studioVersions = pgTable("studio_versions", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  snapshot: jsonb("snapshot").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
});
```

- [ ] **Step 2:** add `draftValue: text("draft_value"),` to schema-site-text.ts; re-export `export * from "./schema-studio";` in schema.ts beside the site-text line.
- [ ] **Step 3: 0020_design_studio.sql** (idempotent, 0018/0019 house style):

```sql
ALTER TABLE "site_text" ADD COLUMN IF NOT EXISTS "draft_value" text;

CREATE TABLE IF NOT EXISTS "site_studio" (
  "id" serial PRIMARY KEY,
  "draft" jsonb NOT NULL DEFAULT '{}',
  "published" jsonb NOT NULL DEFAULT '{}',
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "studio_versions" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "snapshot" jsonb NOT NULL,
  "summary" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL
);
```

- [ ] **Step 4: Gates** (tsc/test/eslint). **Controller applies 0020 to prod** (implementer SKIPS, notes in report — 0018/0019 precedent).
- [ ] **Step 5: Commit** — `feat(studio): schema + migration 0020 — site_studio, studio_versions, site_text.draft_value`

---

### Task 4: Loaders + draft plumbing + middleware + preview routes

**Files:**
- Create: `src/lib/studio/get.ts`, `src/app/api/admin/studio/preview/route.ts`
- Modify: `src/lib/site-text/get.ts`, `src/middleware.ts`

**Interfaces:**
- `getStudioConfig(): Promise<StudioConfig>` — draft branch when draftMode enabled, else cached published (tag `"studio"`); fail-soft to DEFAULT_CONFIG on any error.
- `getSiteTextMap()` — same signature as today; gains the draft branch.
- `GET /api/admin/studio/preview` enables draftMode + redirects to `/`; `GET /api/admin/studio/preview?off=1` disables + redirects to `/admin/studio`.

- [ ] **Step 1: get.ts:**

```ts
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
```

- [ ] **Step 2: site-text draft branch.** In src/lib/site-text/get.ts, keep the cached published path byte-identical; add before it:

```ts
import { draftMode } from "next/headers";
// inside getSiteTextMap(), first line of the try block:
if ((await draftMode()).isEnabled) {
  const rows = await db
    .select({ key: siteText.key, value: siteText.value, draftValue: siteText.draftValue })
    .from(siteText);
  return mergeSiteText(rows.map((r) => ({ key: r.key, value: r.draftValue ?? r.value })));
}
```

- [ ] **Step 3: preview route** (`src/app/api/admin/studio/preview/route.ts`): requireAdmin via the auth-compat + role check idiom (copy from an existing /api/admin route, e.g. image-gen); then `const dm = await draftMode(); req.nextUrl.searchParams.get("off") ? dm.disable() : dm.enable();` and `NextResponse.redirect(new URL(off ? "/admin/studio" : "/", req.url))`.
- [ ] **Step 4: middleware cookie-strip.** In src/middleware.ts, BEFORE the public-route pass-through:

```ts
// Studio compare: the LIVE iframe carries ?studio=published — forward the
// request without the draftMode cookie so it renders as a true public
// request (published theme/config/text, normal cache). Inert without
// draftMode: no cookie, nothing to strip.
if (req.nextUrl.searchParams.get("studio") === "published") {
  const headers = new Headers(req.headers);
  const cookie = headers.get("cookie");
  if (cookie?.includes("__prerender_bypass")) {
    headers.set(
      "cookie",
      cookie.split("; ").filter((c) => !c.startsWith("__prerender_bypass")).join("; ")
    );
    return NextResponse.next({ request: { headers } });
  }
}
```

- [ ] **Step 5: Gates + curl checks** (dev server via the envfile wrapper if :3000 free): `/api/admin/studio/preview` unauth → 307 sign-in; homepage renders unchanged. Commit — `feat(studio): config loader, site-text draft branch, draftMode preview routes, compare cookie-strip`

---

### Task 5: Server Actions — drafts, Apply, Discard, Restore, versions

**Files:**
- Create: `src/server/studio.ts`
- Modify: `src/server/site-text-admin.ts` (draft-safety)

**Interfaces (the studio UI consumes exactly these):**
- `saveDraftConfig(config: StudioConfig): Promise<{ok:boolean; error?:string}>` — normalizes via renderMerge/resolveThemeId before storing.
- `saveDraftText(key: string, value: string): Promise<{ok:boolean; error?:string}>` — registry-validated; carrier-row INSERT (`value: ''`, label/groupName from registry) when no row; sets draft_value (empty string = staged reset).
- `applyDraft(): Promise<{ok:boolean; error?:string; summary?:string}>`
- `discardDraft(): Promise<{ok:boolean; error?:string}>` — draft := published copy; NULL every draft_value.
- `restoreVersion(id: number): Promise<{ok:boolean; error?:string}>` — full-diff staging into draft.
- `listVersions(): Promise<{id:number; summary:string; createdAt:string}[]>` (newest first, by id DESC).
- All "use server", requireAdmin throw idiom (site-text-admin precedent), try/catch → `{ok:false}`.

- [ ] **Step 1: applyDraft transaction (the heart — implement exactly):**

```ts
const STUDIO_LOCK = 815552; // NOT 815551 (letter series)

export async function applyDraft() {
  try {
    const userId = await requireAdmin();
    let summary = "";
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${STUDIO_LOCK})`);
      const [pilot] = await tx.select().from(siteStudio).orderBy(asc(siteStudio.id)).limit(1);
      const row = pilot ?? (await tx.insert(siteStudio).values({}).returning())[0];

      const currentOverrides = async () => {
        const rows = await tx
          .select({ key: siteText.key, value: siteText.value })
          .from(siteText);
        return Object.fromEntries(rows.filter((r) => r.value.trim() !== "").map((r) => [r.key, r.value]));
      };

      // Baseline version on first apply: the pre-apply published state.
      const [{ n }] = await tx.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM studio_versions`);
      const prevSnap = { config: normalize(row.published), textOverrides: await currentOverrides() };
      if (n === 0) {
        await tx.insert(studioVersions).values({
          snapshot: prevSnap, summary: "Before the first Studio change", createdBy: userId,
        });
      }

      // Publish config.
      await tx.update(siteStudio).set({
        published: row.draft, updatedAt: new Date(), updatedBy: userId,
      }).where(eq(siteStudio.id, row.id));

      // Promote text drafts: blank draft = reset (delete row); else promote.
      await tx.execute(sql`DELETE FROM site_text WHERE draft_value IS NOT NULL AND btrim(draft_value) = ''`);
      await tx.execute(sql`
        UPDATE site_text SET value = draft_value, draft_value = NULL,
          updated_at = now(), updated_by = ${userId}
        WHERE draft_value IS NOT NULL`);
      // No orphan blank rows: carriers either promoted or deleted above.

      // Snapshot the NEW published state; newest row == current state.
      const nextSnap = { config: normalize(row.draft), textOverrides: await currentOverrides() };
      summary = summarize(prevSnap, nextSnap, sectionLabelMap(), themeNameMap());
      await tx.insert(studioVersions).values({ snapshot: nextSnap, summary, createdBy: userId });
      await tx.execute(sql`
        DELETE FROM studio_versions WHERE id NOT IN
          (SELECT id FROM studio_versions ORDER BY id DESC LIMIT 50)`);
    });
    updateTag("studio");
    updateTag("site-text");
    revalidatePath("/", "layout");
    return { ok: true, summary };
  } catch (err) {
    console.error("applyDraft failed", err);
    return { ok: false, error: "Could not apply. Nothing changed. Try again." };
  }
}
```

(`sectionLabelMap()`/`themeNameMap()` are 4-line helpers flattening SECTION_REGISTRY labels and THEMES names.)

- [ ] **Step 2: restoreVersion(id)** — same lock + transaction: read snapshot; write `draft = snapshot.config`; stage text as full diff: for every key currently overridden (value non-blank) but ABSENT from snapshot.textOverrides → set `draft_value = ''`; for every snapshot override → carrier-insert/UPDATE `draft_value = snapshotValue`. Registry-unknown snapshot keys dropped (collect + return count in the ok payload's error-free note if any). No cache tags touched (draft-only).
- [ ] **Step 3: discardDraft** — transaction: `draft = published`, NULL all draft_values. saveDraftConfig/saveDraftText/listVersions per interfaces (saveDraftText validates key ∈ SITE_TEXT_KEYS).
- [ ] **Step 4: site-text-admin draft-safety.** In saveSiteText's blank branch and resetSiteText: replace `db.delete(siteText).where(eq(siteText.key, key))` with delete-only-if-no-draft:

```ts
await db.update(siteText).set({ value: "", updatedAt: new Date(), updatedBy: userId })
  .where(and(eq(siteText.key, key), isNotNull(siteText.draftValue)));
await db.delete(siteText).where(and(eq(siteText.key, key), isNull(siteText.draftValue)));
```

- [ ] **Step 5: TDD the pure bits** already covered (summary/merge in Task 1). Gates + commit — `feat(studio): draft actions, advisory-locked apply/restore, version history`

---

### Task 6: (public) layout — theme block, marker, ribbon, mode forcer

**Files:**
- Create: `src/components/studio/StudioModeForcer.tsx`, `src/components/studio/DraftRibbon.tsx`
- Modify: `src/app/(public)/layout.tsx`

- [ ] **Step 1: layout.** Make PublicLayout async; read `const [config, { isEnabled }] = await Promise.all([getStudioConfig(), draftMode()])`; resolve theme via `themeById(resolveThemeId(config, THEME_IDS))`. Wrapper div gains `data-site-theme`. When theme is non-identity, render:

```tsx
{theme && Object.keys(theme.light).length > 0 && (
  <style>{`
    body:has([data-site-theme]) { ${cssVars(theme.light)} }
    .dark body:has([data-site-theme]) { ${cssVars(theme.dark)} }
  `}</style>
)}
{isEnabled && <DraftRibbon />}
{isEnabled && <StudioModeForcer />}
```

`cssVars(rec)` = `Object.entries(rec).map(([k,v]) => `${k}: ${v};`).join(" ")` (4-line local helper). Plain `<style>` — NO `precedence` prop.

- [ ] **Step 2: DraftRibbon** (server component, no client JS): fixed top strip, `z-[60]`, oxblood border/brass text on iron: "Draft preview — not live" + `<a href="/api/admin/studio/preview?off=1">Stop preview</a>`. Height ~32px; add matching top padding on the ribbon only (do NOT shift the masthead — the ribbon overlays, it's a preview affordance).
- [ ] **Step 3: StudioModeForcer** ("use client"):

```tsx
"use client";
import { useEffect } from "react";

/** Preview-only mode forcing. Reads ?studio-mode=dark|light and toggles the
 *  `dark` class + colorScheme on <html> DIRECTLY. NEVER next-themes setTheme,
 *  NEVER localStorage (storage events would flip every open tab, including
 *  the Studio itself). Rendered only when draftMode is enabled. */
export function StudioModeForcer() {
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("studio-mode");
    if (mode !== "dark" && mode !== "light") return;
    const el = document.documentElement;
    el.classList.toggle("dark", mode === "dark");
    el.style.colorScheme = mode;
  }, []);
  return null;
}
```

- [ ] **Step 4: Verify** — dev server: public pages render byte-identical with empty config (no style block in HTML — grep); with a hand-set draft themeId + draftMode cookie, the block appears and admin pages do NOT carry it. Gates + commit — `feat(studio): public-layout theme block, draft ribbon, preview mode forcer`

---

### Task 7: Homepage section assembly

**Files:**
- Modify: `src/app/(public)/page.tsx`

**Requirements:** restructure the render into the 7 registry sections (`hero, verse, what-this-is, gatherings, letter, story, join-cta` — ids MUST match Task 1's registry exactly). Pattern: keep all data fetching exactly where it is; wrap each top-level `<section>` (they exist today as commented blocks 1-7) into an entries map, then:

```tsx
const config = await getStudioConfig();
const sections: Record<string, React.ReactNode> = { hero: (…existing JSX…), verse: (…), … };
// in the return:
{renderMerge("home", config).filter((s) => s.visible).map((s) => (
  <Fragment key={s.id}>{sections[s.id]}</Fragment>
))}
```

The story section renders conditionally today (`{story && …}`) — keep that inner conditional INSIDE its entry. **Bar: with empty config the rendered HTML is DOM-identical to before** (the Fragment wrappers add no DOM nodes). getStudioConfig joins the existing Promise.all.

- [ ] Steps: restructure → `curl localhost:3000 | diff` against a pre-change capture (modulo next-build hashes) → gates → commit `feat(studio): homepage renders through the section merge`

---

### Task 8: /admin/studio page

**Files:**
- Create: `src/app/(app)/admin/studio/page.tsx` (server), `src/app/(app)/admin/studio/studio.tsx` (client)
- Modify: `src/components/admin/AdminSidebar.tsx` (Site Content group, first item: `{ href: "/admin/studio", label: "Studio", icon: "sparkles", hint: "Change the site's look, layout, and words. Preview first, apply when ready." }`)

**Server page** (force-dynamic): loads `{ draft, published }` raw rows + versions (listVersions) + registry + THEMES meta + the homepage site-text rows (key, value, draft_value) and passes to the client component. **Client component contract** (consumes Task 5's actions exactly):

- **Theme picker:** 5 cards (name, blurb, 4 swatch dots from the theme's light record: --background, --c-brass or --primary, --foreground, --c-oxblood; pasture-iron swatches read from a small hardcoded copy of the base values). Selecting calls `saveDraftConfig({...draft, themeId})` then refreshes the preview iframe.
- **Sections list (homepage):** rows from `renderMerge("home", draftConfig)`; unlocked rows get Show/Hide toggle + Up/Down buttons (recompute the sections array, `saveDraftConfig`); locked rows greyed with hint. All targets min-h-11.
- **Text fields:** the Homepage-group SITE_TEXT_KEYS rows, site-text-editor idiom (expand → textarea/input, maxLength 2000, Save = `saveDraftText`, "Original/Edited/Draft" chips: Draft chip when draft_value set).
- **Preview pane:** `<iframe src={pageUrl + "?studio-mode=" + mode}>` with width 375/1280 via wrapper class; toolbar = device, mode, Compare toggle, Refresh, "Open preview in tab", Start/Stop preview links (the Task 4 route). Compare = second iframe with `?studio=published&studio-mode=...` alongside, scroll sync via a 10-line onScroll postMessage-free approach: mirror `scrollTop` ratio between iframes on a rAF loop (same-origin access is allowed).
- **Apply/Discard:** buttons with plain confirms — Apply: "This puts your draft on the live site. A snapshot is saved so you can undo." Discard: "This throws away your draft. The live site is not touched."
- **Versions drawer:** listVersions rows + Restore button with the spec confirm: "This loads the old version into your draft. Your unsaved draft changes go away."
- **Stuck? panel:** the 7 spec cards, static. **Walkthrough:** 4-step dismissible strip; dismissal via `saveDraftConfig` on a `walkthroughDismissed?: true` field (add to StudioConfig type as optional — the merge/normalize passes it through).
- Preview requires draftMode ON: the page shows a "Start preview" primary state when the cookie isn't set (server page passes `draftEnabled: (await draftMode()).isEnabled`).

- [ ] Steps: build server page → client component → sidebar link → gates → authed smoke (200, no h-scroll at 375px) → commit `feat(admin): the Studio — theme picker, sections, text, preview/compare, versions`

---

### Task 9: Acceptance drills + ship

**Files:** docs stamps only (spec §DS-1 shipped line, CLAUDE.md routes + studio pattern, ledger).

- [ ] **Static gates:** tsc · 92+ vitest (new studio tests included) · eslint on all touched · check:contrast (5×2).
- [ ] **Controller pre-verified migration** (Task 3).
- [ ] **PARITY:** with prod-ish DB (empty site_studio/no drafts): `curl localhost:3000/ > after.html`, diff vs a `git stash`-era capture modulo `/_next/static` hashes → identical. check:contrast output shows 10 theme runs + baseline.
- [ ] **ISOLATION:** enable preview in the browser (cookie), set a draft theme + text edit; then 10 curl requests (no cookie) → zero occurrences of the override style block, draft copy, or ribbon markup.
- [ ] **LOOP:** via authed browser at 375 + desktop: switch theme to harvest, hide what-this-is, edit hero paragraph → preview shows all three in both modes/devices; compare shows live≠draft; Apply → fresh curl shows all three live.
- [ ] **UNDO:** Versions → restore "Before the first Studio change" → Apply → fresh curl matches the PARITY capture exactly.
- [ ] **SAFETY:** verse section has no toggle in UI; `saveDraftConfig` with a hand-crafted config hiding `verse` → renderMerge forces it visible on render; `?studio=published` from a clean browser changes nothing (diff).
- [ ] **Final review:** review-package over the branch → 3-lens workflow (spec-coverage / trust-regression / ledger-triage) → ONE fix wave → re-verdict.
- [ ] **Ship:** PR (--body-file; "Studio ships with pasture-iron active — the site looks identical until Jeremy acts") → Vercel green → squash-merge → migration Action green (0020 idempotent re-run) → live prod: / DOM-parity, /admin/studio 307 unauth, zero runtime errors → docs stamps → ledger + memory → report with how-to-use for Jeremy.

## Self-Review

1. **Spec coverage:** loop ✓ (T4-8), themes+gate ✓ (T2), render-merge ✓ (T1), migration ✓ (T3), apply/restore/versions ✓ (T5), layout/ribbon/forcer ✓ (T6), homepage ✓ (T7), studio UI+guides ✓ (T8), acceptance ✓ (T9). DS-2/3/4 items (other pages, AI, editor fold-in) correctly absent — EXCEPT the site-text editor draft-safety change, pulled into T5 deliberately (the hazard exists the moment draft_value ships).
2. **Placeholders:** T8 is contract-driven (UI code from precise action signatures + house idioms) — consistent with prior phases' UI tasks; T2 values are complete with the tuning license stated; T5 Step 2/3 name exact semantics. No TBDs.
3. **Type consistency:** StudioConfig/renderMerge/resolveThemeId/summarize signatures identical across T1/T4/T5/T7/T8; THEME_IDS/themeById across T2/T4/T6/T8; action return shapes uniform `{ok, error?}`.
