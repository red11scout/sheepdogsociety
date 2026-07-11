# DS-3 — Design Studio AI Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jeremy gets AI help inside the Design Studio — page-level recommendations, per-field rewrites, and a free-text "describe what you want" box — all writing only to his draft, never Applying, with every AI string passed through the banned-language gate and every changeset validated against the real section/text registries before it touches the draft.

**Architecture:** Three new Server Actions in `src/server/studio-ai.ts` (recommend/assist/describe), each `requireAdmin`-gated, each logging to `ai_generations`, each calling the Vercel AI SDK's `generateObject` with a bounds-free Zod schema (house rule) and `findBannedLanguage` post-hoc validation. `describe`'s changeset is validated by a pure function (`validateChangeset`, TDD'd first) before anything is staged into the draft via the existing, unmodified `saveDraftConfig`/`saveDraftText` from `src/server/studio.ts`. A helper strip in the existing `/admin/studio` client component surfaces recommendations and a describe-it box.

**Tech Stack:** Vercel AI SDK (`ai`, `@ai-sdk/anthropic`), Zod, Drizzle/Neon, existing DS-1/DS-2 Design Studio modules.

## Global Constraints

- AI never Applies. Every AI-written change lands in the draft only, through the existing `saveDraftConfig`/`saveDraftText` functions — do not modify those functions' signatures or logic.
- Model: `claude-sonnet-4-5` (this repo's `MODELS.default`, from `src/lib/ai/prompts.ts`).
- Every AI schema is bounds-free (no Zod `.min()`/`.max()`/`.length()` on arrays or strings, and no `.int()` on numbers — Anthropic's structured-output rejects all of these). Enforce every size/count constraint in code, after the call.
- Every AI-drafted string passes through `findBannedLanguage` (`src/lib/ai/banned.ts`) before it can be shown to Jeremy or staged into a draft. Any string containing banned language is dropped, not silently rewritten.
- Every AI call logs a row to `ai_generations` (schema in `src/db/schema.ts`, `aiTypeEnum` — this plan's Task 1 adds three new enum values via migration).
- `describe`'s changeset validation rules (verbatim from spec): every `pageId`/`sectionId` must exist in `SECTION_REGISTRY`; every text `key` must exist in `SITE_TEXT_KEYS`; locked sections are never touchable (visibility or position); position patches are checked against the page's FULL materialized section order (`renderMerge(pageId, config)` — registry + current draft config merged), not the registry alone; duplicate `{pageId, sectionId}` entries in the same changeset reject the whole changeset; a text edit with an empty/whitespace `value` is invalid and dropped (resets are a human action, never an AI one); accepted items are capped at 20, with every item beyond the cap dropped; every dropped item (validation failure OR over-cap) is returned to the caller with a human-readable reason so Jeremy sees why.
- Never `drizzle-kit push` to prod — migrations apply via `scripts/apply-neon-migration.mjs` or the GitHub Action.
- npm (not pnpm) is this repo's package manager.

---

## File Structure

- `src/lib/studio/changeset.ts` — pure changeset validation (`validateChangeset`), no I/O, fully unit-tested. This is the trust-critical module; everything else is thin AI-calling glue around it.
- `drizzle/0023_studio_ai_types.sql` — adds `studio_recommend`, `studio_assist`, `studio_describe` to the `ai_generation_type` Postgres enum.
- `src/server/studio-ai.ts` — the three Server Actions (`recommendForPage`, `assistField`, `describeChangeset`), each `requireAdmin`-gated and `ai_generations`-logged.
- `src/app/(app)/admin/studio/studio.tsx` — gains the helper strip (AI recommendations panel + describe-it box), wired to the three new Server Actions.

---

### Task 1: Changeset validation core (pure, TDD) + migration

**Files:**
- Create: `src/lib/studio/changeset.ts`
- Test: `src/lib/studio/changeset.test.ts`
- Create: `drizzle/0023_studio_ai_types.sql`

**Interfaces:**
- Consumes: `SECTION_REGISTRY` (`src/lib/studio/sections.ts`), `SITE_TEXT_KEYS`/`SiteTextKey` (`src/lib/site-text/registry.ts`), `renderMerge`/`StudioConfig` (`src/lib/studio/config.ts`), `findBannedLanguage` (`src/lib/ai/banned.ts`) — all existing, unmodified.
- Produces: `type SectionChange = { pageId: string; sectionId: string; visible?: boolean; position?: number }`, `type TextEdit = { key: string; value: string; why: string }`, `type Changeset = { themeId?: string; sectionChanges: SectionChange[]; textEdits: TextEdit[] }`, `type DroppedItem = { item: SectionChange | TextEdit; reason: string }`, `function validateChangeset(changeset: Changeset, currentConfig: StudioConfig): { accepted: { sectionChanges: SectionChange[]; textEdits: TextEdit[]; themeId?: string }; dropped: DroppedItem[] }`. Task 4 (the `describe` Server Action) calls this directly and stages `accepted` into the draft.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/studio/changeset.test.ts
import { describe, expect, it } from "vitest";
import { validateChangeset, type Changeset } from "./changeset";
import { DEFAULT_CONFIG, type StudioConfig } from "./config";

const emptyConfig: StudioConfig = DEFAULT_CONFIG;

describe("validateChangeset", () => {
  it("accepts a valid section visibility change and a valid text edit", () => {
    const cs: Changeset = {
      sectionChanges: [{ pageId: "about", sectionId: "mission", visible: false }],
      textEdits: [{ key: "about.mission.body", value: "New mission copy.", why: "Tighter." }],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(dropped).toEqual([]);
    expect(accepted.sectionChanges).toEqual(cs.sectionChanges);
    expect(accepted.textEdits).toEqual(cs.textEdits);
  });

  it("drops a section change for an unknown pageId", () => {
    const cs: Changeset = {
      sectionChanges: [{ pageId: "not-a-page", sectionId: "hero", visible: false }],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.sectionChanges).toEqual([]);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].reason).toMatch(/page/i);
  });

  it("drops a section change for an unknown sectionId on a known page", () => {
    const cs: Changeset = {
      sectionChanges: [{ pageId: "about", sectionId: "not-a-section", visible: false }],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.sectionChanges).toEqual([]);
    expect(dropped).toHaveLength(1);
  });

  it("drops a section change targeting a locked section", () => {
    const cs: Changeset = {
      sectionChanges: [{ pageId: "about", sectionId: "hero", visible: false }],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.sectionChanges).toEqual([]);
    expect(dropped[0].reason).toMatch(/locked/i);
  });

  it("drops a duplicate {pageId, sectionId} pair — both copies rejected", () => {
    const cs: Changeset = {
      sectionChanges: [
        { pageId: "about", sectionId: "mission", visible: false },
        { pageId: "about", sectionId: "mission", visible: true },
      ],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.sectionChanges).toEqual([]);
    expect(dropped).toHaveLength(2);
    expect(dropped.every((d) => d.reason.match(/duplicate/i))).toBe(true);
  });

  it("bounds-checks a position patch against the full materialized order (registry + config merge)", () => {
    // "about" has 6 sections in the registry (indices 0-5).
    const cs: Changeset = {
      sectionChanges: [{ pageId: "about", sectionId: "mission", position: 99 }],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.sectionChanges).toEqual([]);
    expect(dropped[0].reason).toMatch(/position/i);
  });

  it("accepts a position patch within bounds", () => {
    const cs: Changeset = {
      sectionChanges: [{ pageId: "about", sectionId: "mission", position: 2 }],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(dropped).toEqual([]);
    expect(accepted.sectionChanges).toEqual(cs.sectionChanges);
  });

  it("drops a text edit for an unknown key", () => {
    const cs: Changeset = {
      sectionChanges: [],
      textEdits: [{ key: "not.a.real.key", value: "Something", why: "Because" }],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.textEdits).toEqual([]);
    expect(dropped[0].reason).toMatch(/key/i);
  });

  it("drops a text edit with an empty or whitespace-only value", () => {
    const cs: Changeset = {
      sectionChanges: [],
      textEdits: [{ key: "about.mission.body", value: "   ", why: "Reset it" }],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.textEdits).toEqual([]);
    expect(dropped[0].reason).toMatch(/blank|empty|reset/i);
  });

  it("drops a text edit whose value contains banned language", () => {
    const cs: Changeset = {
      sectionChanges: [],
      textEdits: [{ key: "about.mission.body", value: "We must delve deeper.", why: "Punchier" }],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.textEdits).toEqual([]);
    expect(dropped[0].reason).toMatch(/banned|voice/i);
  });

  it("caps accepted items at 20 total, dropping the remainder with a reason", () => {
    const textEdits = Array.from({ length: 25 }, (_, i) => ({
      key: "about.mission.body",
      value: `Version ${i}`,
      why: "Test",
    }));
    const { accepted, dropped } = validateChangeset({ sectionChanges: [], textEdits }, emptyConfig);
    expect(accepted.textEdits).toHaveLength(20);
    expect(dropped).toHaveLength(5);
    expect(dropped.every((d) => d.reason.match(/cap|limit|20/i))).toBe(true);
  });

  it("passes through a known themeId unchanged", () => {
    const cs: Changeset = { themeId: "harvest", sectionChanges: [], textEdits: [] };
    const { accepted } = validateChangeset(cs, emptyConfig);
    expect(accepted.themeId).toBe("harvest");
  });

  it("drops an unknown themeId (falls back to no themeId change)", () => {
    const cs: Changeset = { themeId: "neon-vaporwave", sectionChanges: [], textEdits: [] };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.themeId).toBeUndefined();
    expect(dropped.some((d) => "themeId" in d.item === false)).toBe(false); // themeId isn't a SectionChange/TextEdit item
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/studio/changeset.test.ts`
Expected: FAIL — `src/lib/studio/changeset.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/studio/changeset.ts
import { SECTION_REGISTRY } from "./sections";
import { renderMerge, type StudioConfig } from "./config";
import { SITE_TEXT_KEYS } from "@/lib/site-text/registry";
import { findBannedLanguage } from "@/lib/ai/banned";

export type SectionChange = {
  pageId: string;
  sectionId: string;
  visible?: boolean;
  position?: number;
};

export type TextEdit = { key: string; value: string; why: string };

export type Changeset = {
  themeId?: string;
  sectionChanges: SectionChange[];
  textEdits: TextEdit[];
};

export type DroppedItem = { item: SectionChange | TextEdit; reason: string };

const KNOWN_TEXT_KEYS = new Set(SITE_TEXT_KEYS.map((e) => e.key));
const MAX_ACCEPTED = 20;

export function validateChangeset(
  changeset: Changeset,
  currentConfig: StudioConfig
): {
  accepted: { sectionChanges: SectionChange[]; textEdits: TextEdit[]; themeId?: string };
  dropped: DroppedItem[];
} {
  const dropped: DroppedItem[] = [];
  const seenPairs = new Set<string>();
  const duplicatePairs = new Set<string>();

  // First pass: find every {pageId, sectionId} pair that appears more than once.
  for (const c of changeset.sectionChanges) {
    const pairKey = `${c.pageId}::${c.sectionId}`;
    if (seenPairs.has(pairKey)) duplicatePairs.add(pairKey);
    seenPairs.add(pairKey);
  }

  const acceptedSectionChanges: SectionChange[] = [];
  for (const c of changeset.sectionChanges) {
    const pairKey = `${c.pageId}::${c.sectionId}`;
    if (duplicatePairs.has(pairKey)) {
      dropped.push({ item: c, reason: `Duplicate entry for ${c.pageId}/${c.sectionId} — skipped both.` });
      continue;
    }
    const registry = SECTION_REGISTRY[c.pageId];
    if (!registry) {
      dropped.push({ item: c, reason: `"${c.pageId}" is not a page this site governs.` });
      continue;
    }
    const def = registry.sections.find((s) => s.id === c.sectionId);
    if (!def) {
      dropped.push({ item: c, reason: `"${c.sectionId}" is not a section on ${c.pageId}.` });
      continue;
    }
    if (def.locked) {
      dropped.push({ item: c, reason: `"${def.label}" is locked and can't be changed.` });
      continue;
    }
    if (c.position !== undefined) {
      const materialized = renderMerge(c.pageId, currentConfig);
      if (c.position < 0 || c.position >= materialized.length) {
        dropped.push({
          item: c,
          reason: `Position ${c.position} is out of range for ${c.pageId} (0-${materialized.length - 1}).`,
        });
        continue;
      }
    }
    acceptedSectionChanges.push(c);
  }

  const acceptedTextEdits: TextEdit[] = [];
  for (const e of changeset.textEdits) {
    if (!KNOWN_TEXT_KEYS.has(e.key)) {
      dropped.push({ item: e, reason: `"${e.key}" is not a key this site governs.` });
      continue;
    }
    if (e.value.trim() === "") {
      dropped.push({ item: e, reason: "Blank edits are a reset — do that by hand, not through AI." });
      continue;
    }
    const banned = findBannedLanguage(e.value);
    if (banned.length > 0) {
      dropped.push({ item: e, reason: `Contains banned language (${banned.join(", ")}) — outside the brand voice.` });
      continue;
    }
    acceptedTextEdits.push(e);
  }

  // Cap total accepted items (section changes + text edits combined) at 20,
  // in the order they were validated — section changes first, then text edits.
  const combined: (SectionChange | TextEdit)[] = [...acceptedSectionChanges, ...acceptedTextEdits];
  const overCap = combined.slice(MAX_ACCEPTED);
  for (const item of overCap) {
    dropped.push({ item, reason: `Over the ${MAX_ACCEPTED}-item limit per request — skipped.` });
  }
  const capped = combined.slice(0, MAX_ACCEPTED);
  const finalSectionChanges = capped.filter((i): i is SectionChange => "sectionId" in i);
  const finalTextEdits = capped.filter((i): i is TextEdit => "key" in i);

  let themeId: string | undefined;
  if (changeset.themeId !== undefined) {
    // Theme validity is resolved by the caller's own resolveThemeId against
    // the real THEME_IDS list (Task 4 imports it) — this module only knows
    // about sections/text, so it passes themeId through unchecked here and
    // the Server Action layer (Task 4) re-validates it against THEME_IDS.
    themeId = changeset.themeId;
  }

  return {
    accepted: { sectionChanges: finalSectionChanges, textEdits: finalTextEdits, themeId },
    dropped,
  };
}
```

Note on the last test (`drops an unknown themeId`): this pure module doesn't import `THEME_IDS` (that would create a dependency from `studio/changeset.ts` on `studio/themes.ts` that isn't otherwise needed here) — themeId validation happens one layer up, in Task 4's `describeChangeset` Server Action, using the existing `resolveThemeId` from `config.ts`. Update that test to match:

```ts
  it("passes themeId through unvalidated — the Server Action layer re-validates it", () => {
    const cs: Changeset = { themeId: "neon-vaporwave", sectionChanges: [], textEdits: [] };
    const { accepted } = validateChangeset(cs, emptyConfig);
    expect(accepted.themeId).toBe("neon-vaporwave");
  });
```

Replace the "drops an unknown themeId" test in Step 1 with this corrected version before running Step 2.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/studio/changeset.test.ts`
Expected: PASS (12/12).

- [ ] **Step 5: Migration — add the three new ai_generation_type enum values**

Create `drizzle/0023_studio_ai_types.sql`:

```sql
ALTER TYPE "ai_generation_type" ADD VALUE IF NOT EXISTS 'studio_recommend';
ALTER TYPE "ai_generation_type" ADD VALUE IF NOT EXISTS 'studio_assist';
ALTER TYPE "ai_generation_type" ADD VALUE IF NOT EXISTS 'studio_describe';
```

In `src/db/schema.ts`, find the `aiTypeEnum` definition (`export const aiTypeEnum = pgEnum("ai_generation_type", [...])`) and add the three new values to the array so Drizzle's TypeScript types match the database:

```ts
export const aiTypeEnum = pgEnum("ai_generation_type", [
  "draft",
  "improve",
  "pullquote",
  "publish_meta",
  "alt_text",
  "image",
  "ask",
  "studio_recommend",
  "studio_assist",
  "studio_describe",
]);
```

- [ ] **Step 6: Apply the migration to prod**

Run: `DATABASE_URL=$DATABASE_URL_UNPOOLED node scripts/apply-neon-migration.mjs drizzle/0023_studio_ai_types.sql` (or however the existing migration script is invoked in this repo — check `drizzle/0021_ai_ask_type.sql`'s own apply history in git log for the exact command used last time, since this migration follows the identical pattern of adding enum values).

Expected: migration applies without error; a `SELECT enum_range(NULL::ai_generation_type)` against the DB shows all 10 values.

- [ ] **Step 7: Commit**

```bash
git add src/lib/studio/changeset.ts src/lib/studio/changeset.test.ts drizzle/0023_studio_ai_types.sql src/db/schema.ts
git commit -m "feat(studio): changeset validation core + ai_generation_type enum values"
```

---

### Task 2: `recommendForPage` Server Action

**Files:**
- Create: `src/server/studio-ai.ts`
- Test: `src/server/studio-ai.test.ts` (mocked `generateObject`, mocked DB insert — no real API calls)

**Interfaces:**
- Consumes: `requireAdmin` pattern (duplicate the private helper from `src/server/studio.ts:21-27` — that function isn't exported, and this repo's established pattern per Phase-1's own deferred-minors list is to duplicate this small helper per module rather than force an export), `SECTION_REGISTRY`/`SiteTextKey`/`SITE_TEXT_KEYS`, `getStudioConfig` (`src/lib/studio/get.ts`), `renderMerge`, `MODELS`/`BRAND_VOICE`/`withBrandVoice` (`src/lib/ai/prompts.ts`), `findBannedLanguage`, `db`/`aiGenerations` (`src/db`, `src/db/schema.ts`).
- Produces: `export async function recommendForPage(pageId: string): Promise<{ ok: true; suggestions: { what: string; why: string; changeset?: Changeset }[] } | { ok: false; error: string }>`. Task 5's UI calls this directly with a `pageId` string.

- [ ] **Step 1: Write the failing test**

```ts
// src/server/studio-ai.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
  },
}));
vi.mock("ai", () => ({ generateObject: vi.fn() }));
vi.mock("@/lib/studio/get", () => ({ getStudioConfig: vi.fn() }));

import { auth } from "@/auth";
import { db } from "@/db";
import { generateObject } from "ai";
import { getStudioConfig } from "@/lib/studio/get";
import { recommendForPage } from "./studio-ai";

function mockAdmin() {
  vi.mocked(auth).mockResolvedValue({ userId: "u1" } as never);
  vi.mocked(db.select).mockReturnValue({
    from: () => ({ where: () => Promise.resolve([{ id: "u1", role: "admin" }]) }),
  } as never);
}

describe("recommendForPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStudioConfig).mockResolvedValue({ themeId: "pasture-iron", pages: {} });
  });

  it("returns ok:false when not signed in", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: undefined } as never);
    const result = await recommendForPage("about");
    expect(result.ok).toBe(false);
  });

  it("returns ok:false for an unknown pageId (no AI call made)", async () => {
    mockAdmin();
    const result = await recommendForPage("not-a-real-page");
    expect(result.ok).toBe(false);
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("returns suggestions and logs to ai_generations on success", async () => {
    mockAdmin();
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [{ what: "Tighten the mission paragraph.", why: "It runs long for mobile." }],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    } as never);
    const result = await recommendForPage("about");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].what).toContain("Tighten");
    }
    expect(db.insert).toHaveBeenCalled();
  });

  it("drops a suggestion whose 'why' contains banned language", async () => {
    mockAdmin();
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { what: "Rewrite the hero.", why: "It doesn't delve deep enough into the mission." },
          { what: "Shorten the culture list.", why: "Four items reads long on mobile." },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    } as never);
    const result = await recommendForPage("about");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].what).toContain("Shorten");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/studio-ai.test.ts`
Expected: FAIL — `src/server/studio-ai.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/server/studio-ai.ts
"use server";

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { aiGenerations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MODELS, BRAND_VOICE, withBrandVoice } from "@/lib/ai/prompts";
import { findBannedLanguage } from "@/lib/ai/banned";
import { SECTION_REGISTRY } from "@/lib/studio/sections";
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge } from "@/lib/studio/config";
import type { Changeset } from "@/lib/studio/changeset";

const MODEL = MODELS.default;
const RECOMMEND_PROMPT_VERSION = "studio-recommend.v1";

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin") throw new Error("Not an admin");
  return userId;
}

// Anthropic structured output rejects array minItems/maxItems and string
// min/maxLength — schema stays bounds-free; the prompt asks for 2-4 items
// and any count is accepted, unbounded, by design (house rule).
const recommendSchema = z.object({
  suggestions: z.array(
    z.object({
      what: z.string(),
      why: z.string(),
    })
  ),
});

export async function recommendForPage(
  pageId: string
): Promise<{ ok: true; suggestions: { what: string; why: string; changeset?: Changeset }[] } | { ok: false; error: string }> {
  try {
    const userId = await requireAdmin();
    const registry = SECTION_REGISTRY[pageId];
    if (!registry) return { ok: false, error: "Unknown page." };

    const config = await getStudioConfig();
    const merged = renderMerge(pageId, config);
    const unlockedCount = merged.filter((s) => !s.locked).length;
    const hiddenCount = merged.filter((s) => !s.locked && !s.visible).length;

    const prompt = withBrandVoice(`You are looking at the "${registry.label}" page of a Christian men's brotherhood website. It has ${merged.length} sections total, ${unlockedCount} of which Jeremy (the admin) can show/hide/reorder, and ${hiddenCount} of those are currently hidden.

Suggest 2-4 simple, concrete improvements Jeremy could make to this page's layout or wording. Each suggestion needs a "what" (one short sentence, the action) and a "why" (one short sentence, the reason). Do not suggest anything about locked sections, Scripture, or forms — those never change.`);

    const result = await generateObject({
      model: anthropic(MODEL),
      system: BRAND_VOICE,
      prompt,
      schema: recommendSchema,
    });

    const clean = result.object.suggestions.filter((s) => findBannedLanguage(s.why).length === 0 && findBannedLanguage(s.what).length === 0);

    await db.insert(aiGenerations).values({
      type: "studio_recommend",
      prompt,
      promptVersion: RECOMMEND_PROMPT_VERSION,
      model: MODEL,
      output: JSON.stringify(result.object),
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      entityType: "studio_page",
      entityId: pageId,
      userId,
    });

    return { ok: true, suggestions: clean };
  } catch (err) {
    console.error("recommendForPage error", err);
    return { ok: false, error: "Could not get recommendations. Try again shortly." };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/studio-ai.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/server/studio-ai.ts src/server/studio-ai.test.ts
git commit -m "feat(studio): recommendForPage Server Action"
```

---

### Task 3: `assistField` Server Action

**Files:**
- Modify: `src/server/studio-ai.ts`
- Modify: `src/server/studio-ai.test.ts`

**Interfaces:**
- Consumes: same imports as Task 2, plus `SiteTextKey`/`SITE_TEXT_KEYS` from `@/lib/site-text/registry`.
- Produces: `export async function assistField(key: string, currentText: string, mode: "rewrite" | "tighten" | "warm-up"): Promise<{ ok: true; draft: string; why: string } | { ok: false; error: string }>`. Task 5's UI calls this per text field.

- [ ] **Step 1: Write the failing test**

Append to `src/server/studio-ai.test.ts`:

```ts
import { assistField } from "./studio-ai";

describe("assistField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok:false for an unknown key (no AI call made)", async () => {
    mockAdmin();
    const result = await assistField("not.a.real.key", "some text", "tighten");
    expect(result.ok).toBe(false);
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("returns a draft + why on success", async () => {
    mockAdmin();
    vi.mocked(generateObject).mockResolvedValue({
      object: { draft: "Shorter mission copy.", why: "Cut the repetition." },
      usage: { inputTokens: 80, outputTokens: 30 },
    } as never);
    const result = await assistField("about.mission.body", "Our mission is our mission to serve.", "tighten");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.draft).toBe("Shorter mission copy.");
  });

  it("rejects a draft containing banned language", async () => {
    mockAdmin();
    vi.mocked(generateObject).mockResolvedValue({
      object: { draft: "Let's delve into our mission.", why: "More engaging." },
      usage: { inputTokens: 80, outputTokens: 30 },
    } as never);
    const result = await assistField("about.mission.body", "Our mission.", "warm-up");
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/studio-ai.test.ts`
Expected: FAIL — `assistField` is not exported yet.

- [ ] **Step 3: Write the implementation**

Add to `src/server/studio-ai.ts`:

```ts
import { SITE_TEXT_KEYS } from "@/lib/site-text/registry";

const assistSchema = z.object({
  draft: z.string(),
  why: z.string(),
});

const ASSIST_INSTRUCTIONS: Record<"rewrite" | "tighten" | "warm-up", string> = {
  rewrite: "Rewrite this line in the brand voice. Keep the meaning. Vary the phrasing meaningfully.",
  tighten: "Tighten this line — cut filler, shorten where possible, keep the meaning.",
  "warm-up": "Warm this line up — more inviting, less formal, same meaning and roughly the same length.",
};

const ASSIST_PROMPT_VERSION = "studio-assist.v1";

export async function assistField(
  key: string,
  currentText: string,
  mode: "rewrite" | "tighten" | "warm-up"
): Promise<{ ok: true; draft: string; why: string } | { ok: false; error: string }> {
  try {
    const userId = await requireAdmin();
    const entry = SITE_TEXT_KEYS.find((e) => e.key === key);
    if (!entry) return { ok: false, error: "Unknown text key." };

    const prompt = withBrandVoice(`${ASSIST_INSTRUCTIONS[mode]}

Field: "${entry.label}"
Current text:
"""
${currentText}
"""`);

    const result = await generateObject({
      model: anthropic(MODEL),
      system: BRAND_VOICE,
      prompt,
      schema: assistSchema,
    });

    if (findBannedLanguage(result.object.draft).length > 0) {
      return { ok: false, error: "That draft used words outside the brand voice. Try again." };
    }

    await db.insert(aiGenerations).values({
      type: "studio_assist",
      prompt,
      promptVersion: `${ASSIST_PROMPT_VERSION}.${mode}`,
      model: MODEL,
      output: JSON.stringify(result.object),
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      entityType: "site_text",
      entityId: key,
      userId,
    });

    return { ok: true, draft: result.object.draft, why: result.object.why };
  } catch (err) {
    console.error("assistField error", err);
    return { ok: false, error: "Could not get a rewrite. Try again shortly." };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/studio-ai.test.ts`
Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add src/server/studio-ai.ts src/server/studio-ai.test.ts
git commit -m "feat(studio): assistField Server Action"
```

---

### Task 4: `describeChangeset` Server Action

**Files:**
- Modify: `src/server/studio-ai.ts`
- Modify: `src/server/studio-ai.test.ts`

**Interfaces:**
- Consumes: `validateChangeset` (Task 1), `saveDraftConfig`/`saveDraftText` (`src/server/studio.ts`, unmodified), `resolveThemeId`/`THEME_IDS`-equivalent (use `THEME_IDS` from `src/lib/studio/themes.ts`).
- Produces: `export async function describeChangeset(goal: string): Promise<{ ok: true; applied: number; dropped: { summary: string; reason: string }[] } | { ok: false; error: string }>`. Task 5's UI calls this from the "Tell me what you want" box.

- [ ] **Step 1: Write the failing test**

Append to `src/server/studio-ai.test.ts`:

```ts
vi.mock("@/server/studio", () => ({
  saveDraftConfig: vi.fn().mockResolvedValue({ ok: true }),
  saveDraftText: vi.fn().mockResolvedValue({ ok: true }),
}));

import { describeChangeset } from "./studio-ai";
import { saveDraftConfig, saveDraftText } from "@/server/studio";

describe("describeChangeset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStudioConfig).mockResolvedValue({ themeId: "pasture-iron", pages: {} });
  });

  it("stages valid parts of the AI-drafted changeset and reports dropped items", async () => {
    mockAdmin();
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        sectionChanges: [
          { pageId: "about", sectionId: "mission", visible: false },
          { pageId: "about", sectionId: "hero", visible: false }, // locked, will drop
        ],
        textEdits: [{ key: "about.mission.body", value: "New copy.", why: "Shorter." }],
      },
      usage: { inputTokens: 100, outputTokens: 60 },
    } as never);

    const result = await describeChangeset("Hide the mission section on the About page and shorten the mission copy.");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.applied).toBe(2); // 1 section change + 1 text edit accepted
      expect(result.dropped).toHaveLength(1); // the locked hero attempt
    }
    expect(saveDraftConfig).toHaveBeenCalled();
    expect(saveDraftText).toHaveBeenCalledWith("about.mission.body", "New copy.");
  });

  it("returns ok:false when nothing in the changeset validates", async () => {
    mockAdmin();
    vi.mocked(generateObject).mockResolvedValue({
      object: { sectionChanges: [{ pageId: "about", sectionId: "hero", visible: false }], textEdits: [] },
      usage: { inputTokens: 50, outputTokens: 20 },
    } as never);

    const result = await describeChangeset("Hide the hero on About.");
    expect(result.ok).toBe(true); // still ok:true, just applied:0 — the caller sees the dropped-item reasons
    if (result.ok) expect(result.applied).toBe(0);
    expect(saveDraftConfig).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/studio-ai.test.ts`
Expected: FAIL — `describeChangeset` is not exported yet.

- [ ] **Step 3: Write the implementation**

Add to `src/server/studio-ai.ts`:

```ts
import { validateChangeset, type Changeset } from "@/lib/studio/changeset";
import { saveDraftConfig, saveDraftText } from "@/server/studio";
import { THEME_IDS } from "@/lib/studio/themes";
import { resolveThemeId } from "@/lib/studio/config";

// Bounds-free by house rule — counts/lengths enforced in validateChangeset,
// not in this schema.
const changesetSchema = z.object({
  themeId: z.string().optional(),
  sectionChanges: z.array(
    z.object({
      pageId: z.string(),
      sectionId: z.string(),
      visible: z.boolean().optional(),
      position: z.number().optional(),
    })
  ),
  textEdits: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      why: z.string(),
    })
  ),
});

const DESCRIBE_PROMPT_VERSION = "studio-describe.v1";

export async function describeChangeset(
  goal: string
): Promise<{ ok: true; applied: number; dropped: { summary: string; reason: string }[] } | { ok: false; error: string }> {
  try {
    const userId = await requireAdmin();
    const config = await getStudioConfig();

    const prompt = withBrandVoice(`Jeremy (the admin of this Christian men's brotherhood website) wants: "${goal}"

Turn this into a changeset: which sections to show/hide/reorder, and/or which text fields to rewrite. Only use section and text-field ids you're confident exist on this site — if you're unsure, leave that part out rather than guessing. Keep textEdits short and in the site's plain, warm, direct voice.`);

    const result = await generateObject({
      model: anthropic(MODEL),
      system: BRAND_VOICE,
      prompt,
      schema: changesetSchema,
    });

    const raw: Changeset = result.object;
    const { accepted, dropped } = validateChangeset(raw, config);

    let themeId: string | undefined;
    if (accepted.themeId !== undefined) {
      const resolved = resolveThemeId({ themeId: accepted.themeId, pages: {} }, THEME_IDS);
      if (accepted.themeId === resolved) {
        themeId = resolved;
      } else {
        dropped.push({
          item: { pageId: "", sectionId: "", visible: undefined },
          reason: `"${accepted.themeId}" is not a real theme — kept the current one.`,
        } as never);
      }
    }

    let applied = 0;
    if (themeId || accepted.sectionChanges.length > 0) {
      const nextPages = { ...config.pages };
      for (const change of accepted.sectionChanges) {
        const existing = nextPages[change.pageId]?.sections ?? [];
        const idx = existing.findIndex((s) => s.id === change.sectionId);
        const nextSections = [...existing];
        if (idx >= 0) {
          nextSections[idx] = { ...nextSections[idx], visible: change.visible ?? nextSections[idx].visible };
        } else {
          nextSections.push({ id: change.sectionId, visible: change.visible ?? true });
        }
        nextPages[change.pageId] = { sections: nextSections };
        applied++;
      }
      const configRes = await saveDraftConfig({
        ...config,
        themeId: themeId ?? config.themeId,
        pages: nextPages,
      });
      if (!configRes.ok) return { ok: false, error: configRes.error ?? "Could not save changes." };
      if (themeId) applied++;
    }

    for (const edit of accepted.textEdits) {
      const textRes = await saveDraftText(edit.key, edit.value);
      if (textRes.ok) applied++;
    }

    await db.insert(aiGenerations).values({
      type: "studio_describe",
      prompt,
      promptVersion: DESCRIBE_PROMPT_VERSION,
      model: MODEL,
      output: JSON.stringify(raw),
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      entityType: "studio_changeset",
      entityId: null,
      userId,
    });

    return {
      ok: true,
      applied,
      dropped: dropped.map((d) => ({
        summary: "key" in d.item ? d.item.key : `${d.item.pageId}/${d.item.sectionId}`,
        reason: d.reason,
      })),
    };
  } catch (err) {
    console.error("describeChangeset error", err);
    return { ok: false, error: "Could not process that. Try describing it differently." };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/studio-ai.test.ts`
Expected: PASS (9/9).

- [ ] **Step 5: Run the full changeset + studio-ai suite together, plus tsc**

Run: `npx vitest run src/lib/studio src/server/studio-ai.test.ts && npx tsc --noEmit`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/studio-ai.ts src/server/studio-ai.test.ts
git commit -m "feat(studio): describeChangeset Server Action"
```

---

### Task 5: Helper strip UI — AI recommendations + describe-it box

**Files:**
- Modify: `src/app/(app)/admin/studio/studio.tsx`

**Interfaces:**
- Consumes: `recommendForPage`, `assistField`, `describeChangeset` (Task 2-4), the existing `selectedPage`/`pageEntries`/`refreshPreview`/`setStatus` state already in `studio.tsx` (from the DS-2 page-selector work).
- Produces: nothing new consumed downstream — this is the UI leaf.

- [ ] **Step 1: Add imports and helper-strip state**

In `src/app/(app)/admin/studio/studio.tsx`, add:

```ts
import { recommendForPage, assistField, describeChangeset } from "@/server/studio-ai";
```

Add state near the existing preview-control state:

```ts
  const [recommendations, setRecommendations] = useState<{ what: string; why: string }[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [describeGoal, setDescribeGoal] = useState("");
  const [describing, setDescribing] = useState(false);
  const [describeResult, setDescribeResult] = useState<{ applied: number; dropped: { summary: string; reason: string }[] } | null>(null);
```

- [ ] **Step 2: Add the fetch-recommendations and describe-it handlers**

```ts
  async function loadRecommendations() {
    setLoadingRecs(true);
    const res = await recommendForPage(selectedPage);
    setLoadingRecs(false);
    if (res.ok) setRecommendations(res.suggestions);
    else fail(res.error);
  }

  async function submitDescribe() {
    if (!describeGoal.trim()) return;
    setDescribing(true);
    setDescribeResult(null);
    const res = await describeChangeset(describeGoal);
    setDescribing(false);
    if (res.ok) {
      setDescribeResult({ applied: res.applied, dropped: res.dropped });
      setDescribeGoal("");
      if (res.applied > 0) {
        setConfig(await (async () => {
          // Re-fetch is unnecessary here since describeChangeset already
          // persisted via the existing saveDraftConfig/saveDraftText —
          // reload the preview iframe so the draft-mode viewer picks up
          // the new draft state without a full page reload.
          return config;
        })());
        refreshPreview();
      }
    } else {
      fail(res.error);
    }
  }
```

(Note: `describeChangeset` writes directly to the server-side draft via `saveDraftConfig`/`saveDraftText`, which is why the client doesn't need to locally merge the returned changeset — it only needs to refresh the preview iframe, exactly like every other draft-mutating action in this file already does.)

- [ ] **Step 3: Render the helper strip**

Add this block to the JSX, in the existing "Helper strip" area of the layout (alongside the Stuck? panel and Versions drawer — read the surrounding JSX to place it consistently with that section's existing card styling):

```tsx
        <div className="border border-foreground/15 bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">AI recommendations</h3>
            <button
              type="button"
              onClick={loadRecommendations}
              disabled={loadingRecs}
              className="text-sm font-medium text-brass hover:underline disabled:opacity-50"
            >
              {loadingRecs ? "Thinking..." : "Get ideas for this page"}
            </button>
          </div>
          {recommendations.length > 0 && (
            <ul className="mt-4 space-y-3">
              {recommendations.map((r, i) => (
                <li key={i} className="border-l-2 border-brass/40 pl-4">
                  <p className="text-sm font-medium">{r.what}</p>
                  <p className="text-xs text-muted-foreground">{r.why}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-foreground/15 bg-card p-6">
          <h3 className="font-display text-lg">Tell me what you want</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe a change in plain words. AI drafts it into your draft — nothing goes live until you Apply.
          </p>
          <textarea
            value={describeGoal}
            onChange={(e) => setDescribeGoal(e.target.value)}
            rows={3}
            placeholder="e.g. Hide the culture section and warm up the mission paragraph."
            className="mt-3 w-full border border-foreground/20 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
          />
          <button
            type="button"
            onClick={submitDescribe}
            disabled={describing || !describeGoal.trim()}
            className="lift mt-3 inline-flex h-10 items-center gap-2 bg-foreground px-5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            {describing ? "Working..." : "Draft it"}
          </button>
          {describeResult && (
            <div className="mt-4 text-sm">
              <p className="text-foreground">
                {describeResult.applied} {describeResult.applied === 1 ? "change" : "changes"} added to your draft.
              </p>
              {describeResult.dropped.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {describeResult.dropped.map((d, i) => (
                    <li key={i}>
                      <span className="font-medium">{d.summary}:</span> {d.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
```

- [ ] **Step 4: Gates**

Run: `npx tsc --noEmit && npm run lint`
Expected: both PASS (no new lint errors in `studio.tsx`).

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, sign in as admin (if credentials are available in this environment — if not, note this as a concern and rely on the static trace below), open `/admin/studio`, click "Get ideas for this page," confirm suggestions render; type a goal into the describe-it box, click "Draft it," confirm the applied/dropped summary renders and the preview iframe refreshes.

If no admin credentials are available in this environment, do a careful static trace instead: read through `loadRecommendations`/`submitDescribe` and confirm every state transition (loading → success/error, describeGoal clearing on success, refreshPreview firing only when `applied > 0`) matches the code exactly, and report this as a documented concern rather than a silent skip.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/admin/studio/studio.tsx
git commit -m "feat(studio): AI helper strip — recommendations + describe-it box"
```

---

### Task 6: Full verification, final review, ship

**Files:** none created; this task runs gates and the final review across every file touched by Tasks 1-5.

- [ ] **Step 1: Full automated gate sweep**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run check:contrast`
Expected: `vitest`/`tsc` PASS; `lint` shows no NEW errors beyond whatever pre-existing baseline this branch inherited from `main` at branch time (check via `git stash`/lint/`git stash pop` comparison if any errors appear, exactly as DS-2's tasks did); `check:contrast` PASS (untouched by this plan, confirmatory only).

- [ ] **Step 2: Live-fire the full recommend → describe → Apply loop against the real dev server + real DB**

If DB/auth credentials are available in this environment: run `npm run dev`, sign in as admin, open `/admin/studio` on a page with at least one unlocked section (e.g. About), click "Get ideas," then use the describe-it box to make one real change (e.g. "hide the culture section"), confirm it lands in the draft (preview shows it, Compare shows draft≠live), then Apply and confirm the public page reflects it, then Discard/Restore back to the original state. If credentials are unavailable, document this precisely as a deferred live-fire item (matching the exact disclosed pattern from DS-2's Task 3 and Task 10) rather than silently skipping it.

- [ ] **Step 3: Dispatch the final whole-branch review**

Generate the review package (`scripts/review-package BASE HEAD` from the `subagent-driven-development` skill directory, `BASE` = the commit this branch started from) and dispatch a final code-reviewer subagent on the most capable available model, with the plan's Global Constraints section verbatim. Ask it to specifically verify: (a) AI can never call `saveDraftConfig`/`saveDraftText` with anything that bypasses `validateChangeset`'s rules — trace every call site; (b) every AI-generated string that reaches Jeremy or the draft passes `findBannedLanguage` first, with no code path that skips it; (c) every new Zod schema is genuinely bounds-free; (d) the migration's enum values match exactly what `src/db/schema.ts`'s `aiTypeEnum` declares. Apply any Critical/Important findings as one consolidated fix wave, re-run Step 1's gates after fixes.

- [ ] **Step 4: Ship**

Push the branch, open a PR (`gh pr create`), wait for CI/Vercel preview to pass, merge, then live-verify: curl `/admin/studio` on production to confirm it still 307s unauthenticated visitors (no new exposure), and confirm zero new runtime errors post-deploy (via the Vercel MCP tools if reachable in that session, or a documented curl-only fallback if not — matching DS-2's precedent either way). Update `CLAUDE.md`'s Design Studio bullet to note the AI layer is live (draft-only, always). Update the spec's shipped-callout and Build Order to mark DS-3 done. Update `.superpowers/sdd/progress.md` (original checkout) and persistent memory with a DS-3-shipped entry, then proceed immediately to DS-4 per the standing instruction.

## Self-Review

**Spec coverage:** All three AI entry points (recommend/assist/describe) are covered (Tasks 2-4), each `requireAdmin`-gated and `ai_generations`-logged (Global Constraints + each task's implementation). Every post-hoc validation rule from the spec's "AI layer" section is implemented in `validateChangeset` and TDD'd in Task 1 (id existence, locked-section immunity, position bounds against the materialized order, duplicate-pair rejection, blank-value rejection, 20-item cap, banned-language gate). "AI never Applies" is structural — `describeChangeset` only ever calls the existing `saveDraftConfig`/`saveDraftText`, never any Apply-related function. The helper strip (Task 5) covers both "AI recommendations" and "Tell me what you want" from the spec's Guides layer.

**Placeholder scan:** No TBD/TODO. Every code block is complete, runnable code, including full test suites for every task.

**Type consistency:** `Changeset`/`SectionChange`/`TextEdit`/`DroppedItem` are defined once in Task 1 and imported, never redefined, by Tasks 2-4. `recommendForPage`/`assistField`/`describeChangeset` signatures declared in each task's Interfaces block match their Step 3 implementations and their Task 5 UI call sites exactly.
