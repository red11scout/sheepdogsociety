# Phase A-FN — Resources Field Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every resource becomes readable on a phone in two taps: an AI-drafted, admin-approved "field notes" block (what it says · key scriptures · how to use it in a study) renders on the detail page above the external link.

**Architecture:** Two new pure modules under Vitest (banned-language gate, drafting-input selector with the anti-hallucination rule), one generator module wrapping `generateObject` in the codebase's exact categorize.ts pattern, three new columns on `resources` (migration 0017), generation hooks at both creation paths, per-row + per-section admin API routes, an inline approve strip in the existing ResourceRow, and one render block on the public detail page. Also retires Phase A's dead weight (typeLabel module, orphaned ItemLite fields, stale comments, missing orderBy).

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Drizzle/Neon, Vercel AI SDK `generateObject` + `@ai-sdk/anthropic` (`claude-sonnet-4-5` — field notes are user-facing prose in Jeremy's voice; the haiku tier used for categorize/cluster is not voice-safe), zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-09-phase4-mobile-simplification-design.md` §Phase A-FN. Read it first.

## Global Constraints

- Voice per `src/lib/ai/system-prompt.ts`. Bible verse text is NEVER generated or rendered — scripture entries are reference + a short original note only.
- Anti-hallucination contract (spec, verbatim): below a content threshold, Claude must draft framing-only notes (why we recommend it, how to use it in a study) with **no claims about the work's specific content**; if even that isn't possible, the resource is flagged "needs manual notes" instead of generated. Prompt-contract rule, not just admin review.
- Drafting inputs are provider-specific (spec, verbatim): file/docx → `bodyText`; YouTube → title + description; Amazon/web → title + author + description only.
- Drafts never render publicly. Only `fieldNotesStatus === "approved"` renders.
- Backfill: capped batch size per run; a failed item stays without a draft rather than blocking its section.
- Metric: from the `/resources` list, ≤ 2 taps to approved field notes on the detail page.
- Migrations: hand-written SQL in `drizzle/0017_resources_field_notes.sql` following the 0012/0016 template (`ADD COLUMN IF NOT EXISTS`, comment header). NEVER `drizzle-kit push`.
- AI calls log to `ai_generations` inline (no helper exists) per the pattern at `src/app/api/admin/resources/bulk-upload/route.ts:191-201`, with their own try/catch.
- Repo `/Users/drewgodwin/Code/sheepdogsociety`, npm, branch `feat/phase-a-fn-field-notes` off fresh main. Gates before PR: `npx tsc --noEmit` · `npm test` · `npx eslint <changed files>` · `npm run check:contrast`.

---

### Task 1: Banned-language gate (pure, TDD)

**Files:**
- Create: `src/lib/ai/banned.ts`
- Test: `src/lib/ai/banned.test.ts`

**Interfaces:**
- Produces: `export const BANNED_WORDS: string[]`, `export const BANNED_PHRASES: string[]`, `export function findBannedLanguage(text: string): string[]` (returns every banned term found, lowercase, deduped; empty array = clean). Task 4 consumes `findBannedLanguage`. Phase C's autopilot will consume this same module — do not couple it to resources.

The lists come verbatim from `src/lib/ai/system-prompt.ts:15-16` (the fuller list — `src/lib/ai/prompts.ts` has a shorter stale duplicate; ignore it). "journey" is banned only as a noun — too ambiguous to machine-check reliably, so the gate checks the unambiguous terms and leaves "journey" to the prompt; document that in a comment.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/ai/banned.test.ts
import { describe, expect, it } from "vitest";
import { findBannedLanguage } from "./banned";

describe("findBannedLanguage", () => {
  it("finds banned single words case-insensitively", () => {
    expect(findBannedLanguage("We must LEVERAGE this robust plan.")).toEqual([
      "leverage",
      "robust",
    ]);
  });
  it("finds banned phrases", () => {
    expect(
      findBannedLanguage("Men who do life together level up at the end of the day.")
    ).toEqual(["do life together", "level up", "at the end of the day"]);
  });
  it("matches whole words only, not substrings", () => {
    // "navigate" banned; "navigator" fine. "based" banned; "database" fine.
    expect(findBannedLanguage("The navigator opened the database.")).toEqual([]);
  });
  it("dedupes repeats", () => {
    expect(findBannedLanguage("Unpack it. Then unpack it again.")).toEqual(["unpack"]);
  });
  it("returns empty for clean brand-voice text", () => {
    expect(
      findBannedLanguage("A weekly table. Scripture read plain. One concrete move.")
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/ai/banned.test.ts`
Expected: FAIL — cannot find module `./banned`.

- [ ] **Step 3: Implement**

```ts
// src/lib/ai/banned.ts
/**
 * Programmatic gate for the brand-voice bans that until now lived only in
 * the system prompt (src/lib/ai/system-prompt.ts:15-16) with nothing
 * checking the output. Used by resources field notes (A-FN) and the
 * Letter autopilot (Phase C). "journey" is banned only as a noun — too
 * ambiguous to machine-check, left to the prompt.
 */
export const BANNED_WORDS = [
  "delve",
  "leverage",
  "navigate",
  "robust",
  "tapestry",
  "rise",
  "reclaim",
  "unpack",
  "based",
  "alpha",
];

export const BANNED_PHRASES = [
  "fight back",
  "real men",
  "toxic masculinity",
  "walk with god",
  "do life together",
  "in today's fast-paced world",
  "level up",
  "the journey of faith",
  "at the end of the day",
  "speak life",
  "season of life",
];

export function findBannedLanguage(text: string): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) hits.push(phrase);
  }
  for (const word of BANNED_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) hits.push(word);
  }
  // Preserve first-appearance order within the text itself.
  const seen = new Set<string>();
  return hits
    .filter((h) => (seen.has(h) ? false : (seen.add(h), true)))
    .sort((a, b) => lower.indexOf(a) - lower.indexOf(b));
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/lib/ai/banned.test.ts`
Expected: PASS (5 tests). Note: "rise" is a banned word and legitimately appears in scripture references' surrounding prose rarely; if the first test run shows an ordering mismatch in test 2 (phrases sort by text position), fix the EXPECTED array order to match text order, not the implementation.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/banned.ts src/lib/ai/banned.test.ts
git commit -m "feat(ai): programmatic banned-language gate (shared by field notes and autopilot)"
```

---

### Task 2: Drafting-input selector (pure, TDD)

**Files:**
- Create: `src/lib/resources/field-notes-input.ts`
- Test: `src/lib/resources/field-notes-input.test.ts`

**Interfaces:**
- Produces:
```ts
export type FieldNotesMode = "full" | "framing" | "insufficient";
export interface FieldNotesInput { mode: FieldNotesMode; content: string }
export function selectDraftingInput(row: {
  provider: string | null;
  bodyText: string | null;
  title: string;
  author: string | null;
  description: string | null;
  summary: string | null;
}): FieldNotesInput;
```
Task 4 consumes this. Rules (spec-locked): file/docx (provider null or "file") with `bodyText` ≥ 400 chars → `full` with the bodyText (capped at 12,000 chars); YouTube → `framing` from title + description/summary; Amazon/web → `framing` from title + author + description/summary. `framing` requires title plus at least 40 chars of author+description+summary combined; anything else → `insufficient`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/resources/field-notes-input.test.ts
import { describe, expect, it } from "vitest";
import { selectDraftingInput } from "./field-notes-input";

const base = { provider: null as string | null, bodyText: null as string | null, title: "Made to Provide", author: null as string | null, description: null as string | null, summary: null as string | null };

describe("selectDraftingInput", () => {
  it("file resources with a real body draft in full mode", () => {
    const r = selectDraftingInput({ ...base, bodyText: "x".repeat(500) });
    expect(r.mode).toBe("full");
    expect(r.content).toContain("x");
  });
  it("full-mode content is capped at 12000 chars", () => {
    const r = selectDraftingInput({ ...base, bodyText: "x".repeat(20000) });
    expect(r.content.length).toBeLessThanOrEqual(12000 + 200); // + header allowance
  });
  it("a file with a stub body falls to framing when metadata suffices", () => {
    const r = selectDraftingInput({ ...base, bodyText: "too short", description: "A 12-week study on biblical manhood and provision for men." });
    expect(r.mode).toBe("framing");
  });
  it("amazon books never use bodyText even if present", () => {
    const r = selectDraftingInput({ ...base, provider: "amazon", bodyText: "x".repeat(500), author: "Doug Smith", description: "A study book for men on providing as a Christian." });
    expect(r.mode).toBe("framing");
    expect(r.content).not.toContain("xxx");
    expect(r.content).toContain("Doug Smith");
  });
  it("youtube uses title + description", () => {
    const r = selectDraftingInput({ ...base, provider: "youtube", description: "Sermon on Acts 20:28 and the shepherd's charge to the church." });
    expect(r.mode).toBe("framing");
  });
  it("bare title with no metadata is insufficient", () => {
    expect(selectDraftingInput(base).mode).toBe("insufficient");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/resources/field-notes-input.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/resources/field-notes-input.ts
/**
 * Decides WHAT the field-notes generator is allowed to read, per provider
 * (spec §A-FN). External links carry only metadata — letting Claude
 * "summarize" a book from its title is a hallucination pipeline, so
 * amazon/web/youtube rows are framing-only regardless of what else is on
 * the row. Below a floor of usable text, no draft is generated at all.
 */
export type FieldNotesMode = "full" | "framing" | "insufficient";

export interface FieldNotesInput {
  mode: FieldNotesMode;
  content: string;
}

const FULL_BODY_MIN = 400;
const FULL_BODY_CAP = 12000;
const FRAMING_META_MIN = 40;

export function selectDraftingInput(row: {
  provider: string | null;
  bodyText: string | null;
  title: string;
  author: string | null;
  description: string | null;
  summary: string | null;
}): FieldNotesInput {
  const meta = [row.author ?? "", row.description ?? "", row.summary ?? ""]
    .filter(Boolean)
    .join("\n");

  const isExternal =
    row.provider === "amazon" || row.provider === "web" || row.provider === "youtube";

  if (!isExternal && (row.bodyText?.trim().length ?? 0) >= FULL_BODY_MIN) {
    return {
      mode: "full",
      content: `Title: ${row.title}\n\n${row.bodyText!.trim().slice(0, FULL_BODY_CAP)}`,
    };
  }

  if (row.title.trim() && meta.trim().length >= FRAMING_META_MIN) {
    const authorLine = row.author ? `Author/creator: ${row.author}\n` : "";
    return {
      mode: "framing",
      content: `Title: ${row.title}\n${authorLine}About it: ${[row.description, row.summary].filter(Boolean).join("\n")}`,
    };
  }

  return { mode: "insufficient", content: "" };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/lib/resources/field-notes-input.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/resources/field-notes-input.ts src/lib/resources/field-notes-input.test.ts
git commit -m "feat(resources): provider-aware drafting-input selector with insufficiency floor"
```

---

### Task 3: Schema, migration 0017, server plumbing

**Files:**
- Modify: `src/db/schema.ts` (resources pgTable, lines 624-693 — add three columns after `aiCategorizedAt`)
- Create: `drizzle/0017_resources_field_notes.sql`
- Modify: `src/server/resources-admin.ts` — `updateResource` whitelist (line ~170) + `getPublicResourceBySlug` select (lines 318-368)

**Interfaces:**
- Produces DB columns: `field_notes_html` (text, default ''), `field_notes_status` (text NOT NULL default 'none' — values `none | draft | approved`; the spec names draft|approved, `none` is the pre-generation state), `field_notes_generated_at` (timestamp, nullable). Drizzle names: `fieldNotesHtml`, `fieldNotesStatus`, `fieldNotesGeneratedAt`.
- `updateResource` accepts optional `fieldNotesHtml?: string` and `fieldNotesStatus?: "none" | "draft" | "approved"` in its patch input.
- `getPublicResourceBySlug` returns `fieldNotesHtml` and `fieldNotesStatus`.

- [ ] **Step 1: Schema columns**

In `src/db/schema.ts`, inside the resources table after the `aiCategorizedAt` column:

```ts
    /** AI-drafted, admin-approved study notes (spec §A-FN). Only
     *  status === "approved" renders publicly; "none" = never generated
     *  or insufficient source material. */
    fieldNotesHtml: text("field_notes_html").default(""),
    fieldNotesStatus: text("field_notes_status").notNull().default("none"),
    fieldNotesGeneratedAt: timestamp("field_notes_generated_at"),
```

- [ ] **Step 2: Migration**

```sql
-- Migration 0017: resources field notes
--
-- AI-drafted, admin-approved "field notes" per resource: what it says,
-- key scripture references, how to use it in a study. Drafts never
-- render publicly; only status='approved' does. status='none' means
-- never generated (or source material insufficient). Spec §A-FN.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "field_notes_html" text DEFAULT '';

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "field_notes_status" text NOT NULL DEFAULT 'none';

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "field_notes_generated_at" timestamp;
```

- [ ] **Step 3: Apply to prod now (idempotent runner — the GH Action re-run at merge tolerates already-exists)**

Run from repo root with the pulled prod env:
`DATABASE_URL=$DATABASE_URL_UNPOOLED node scripts/apply-neon-migration.mjs`
Expected: 0017 statements OK; earlier files report "already exists, skipping" NOTICEs then OK; final line `Done.`

- [ ] **Step 4: updateResource whitelist**

In `src/server/resources-admin.ts`, `updateResource` (line ~170) uses a whitelist-patch pattern. Add to the input type: `fieldNotesHtml?: string; fieldNotesStatus?: "none" | "draft" | "approved";` and to the patch builder (same style as neighboring fields):

```ts
  if (input.fieldNotesHtml !== undefined) patch.fieldNotesHtml = input.fieldNotesHtml;
  if (input.fieldNotesStatus !== undefined) patch.fieldNotesStatus = input.fieldNotesStatus;
```

- [ ] **Step 5: Public select**

In `getPublicResourceBySlug` (line ~318), add to the select object:

```ts
      fieldNotesHtml: resources.fieldNotesHtml,
      fieldNotesStatus: resources.fieldNotesStatus,
```

- [ ] **Step 6: Gates + commit**

Run: `npx tsc --noEmit && npm test && npx eslint src/db/schema.ts src/server/resources-admin.ts`
Expected: clean.

```bash
git add src/db/schema.ts drizzle/0017_resources_field_notes.sql src/server/resources-admin.ts
git commit -m "feat(resources): field-notes columns, migration 0017, server plumbing"
```

---

### Task 4: Generator module + API routes + creation hooks

**Files:**
- Create: `src/lib/resources/generate-field-notes.ts`
- Create: `src/app/api/admin/resources/[id]/field-notes/route.ts`
- Create: `src/app/api/admin/resources/sections/[id]/field-notes/route.ts`
- Modify: `src/app/api/admin/resources/bulk-upload/route.ts` (hook after the categorize block, ~line 211)
- Modify: `src/server/resources-link.ts` (hook after categorize in `createLinkResource`, ~line 106)
- Modify: `vercel.json` (functions entry: section route gets `maxDuration: 300`, matching the retag route's entry style)

**Interfaces:**
- Consumes: `selectDraftingInput` (Task 2), `findBannedLanguage` (Task 1), `parseReference` from `@/lib/bible/books`, `scrubAiPayload` from `@/lib/ai/scrub`.
- Produces: `export async function generateFieldNotes(row): Promise<{ html: string; tokensIn: number; tokensOut: number } | null>` — null means no draft (insufficient input, or gates failed after one retry). Row param type matches Task 2's input plus `id`. `export const FIELD_NOTES_PROMPT_VERSION = "resource-field-notes.v1"`.
- Routes: `POST /api/admin/resources/[id]/field-notes` → `{ status: "draft" | "insufficient" | "failed" }`; `POST /api/admin/resources/sections/[id]/field-notes` → `{ processed, drafted, insufficient, failed, remaining }` (batch cap 15 rows/invocation; only rows with `fieldNotesStatus = 'none'` and `deletedAt IS NULL`; `remaining` = count still at 'none' after the run so the UI can say "run again").

- [ ] **Step 1: Generator module**

```ts
// src/lib/resources/generate-field-notes.ts
import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { scrubAiPayload } from "@/lib/ai/scrub";
import { findBannedLanguage } from "@/lib/ai/banned";
import { parseReference } from "@/lib/bible/books";
import { selectDraftingInput } from "./field-notes-input";

export const FIELD_NOTES_PROMPT_VERSION = "resource-field-notes.v1";

const anthropic = createAnthropic({ baseURL: "https://api.anthropic.com/v1" });

const notesSchema = z.object({
  paragraphs: z
    .array(z.string().min(40).max(600))
    .min(2)
    .max(3)
    .describe("What this resource says (full mode) or why we recommend it (framing mode)"),
  scriptures: z
    .array(
      z.object({
        reference: z.string().max(40).describe('e.g. "John 15:5" — reference ONLY, never verse text'),
        note: z.string().min(10).max(200).describe("One original sentence on why this passage matters here"),
      })
    )
    .min(3)
    .max(5),
  howToUse: z.string().min(60).max(500).describe("How a man uses this in a weekly study, concretely"),
});

const FRAMING_RULE = `You have ONLY the metadata below — you have NOT read this work.
You MUST NOT claim, imply, or invent anything about its specific contents,
chapters, arguments, or stories. Write why our brotherhood recommends a
resource like this and how to put it to work in a study. Scriptures should
fit the resource's stated topic.`;

const FULL_RULE = `The full text is below. Ground every claim in it.`;

export async function generateFieldNotes(row: {
  provider: string | null;
  bodyText: string | null;
  title: string;
  author: string | null;
  description: string | null;
  summary: string | null;
}): Promise<{ html: string; tokensIn: number; tokensOut: number } | null> {
  const input = selectDraftingInput(row);
  if (input.mode === "insufficient") return null;

  const prompt = `Write field notes for a resource our men use in weekly Bible studies.

${input.mode === "framing" ? FRAMING_RULE : FULL_RULE}

Scripture rule: give references only, never quote verse text. 3 to 5 references.

Resource:
${input.content}`;

  let totalIn = 0;
  let totalOut = 0;

  // Single retry budget: one regeneration if the banned-language or
  // scripture gates fail. Second failure -> no draft (fail silent).
  for (let attempt = 1; attempt <= 2; attempt++) {
    let object: z.infer<typeof notesSchema>;
    try {
      const result = await generateObject({
        model: anthropic("claude-sonnet-4-5"),
        system: SYSTEM_PROMPT,
        prompt,
        schema: notesSchema,
        temperature: 0.4,
        maxRetries: 1,
      });
      object = scrubAiPayload(result.object);
      totalIn += result.usage?.inputTokens ?? 0;
      totalOut += result.usage?.outputTokens ?? 0;
    } catch {
      return null;
    }

    // Gate 1: banned language across all prose.
    const prose = [...object.paragraphs, object.howToUse, ...object.scriptures.map((s) => s.note)].join(" ");
    if (findBannedLanguage(prose).length > 0) continue;

    // Gate 2: every scripture reference must parse against the canon
    // (catches hallucinated books/chapters locally, zero API calls).
    const validScriptures = object.scriptures.filter((s) => parseReference(s.reference) !== null);
    if (validScriptures.length < 2) continue;

    const html = [
      ...object.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`),
      `<h3>Key scriptures</h3>`,
      `<ul>${validScriptures
        .map((s) => `<li><strong>${escapeHtml(s.reference)}</strong> — ${escapeHtml(s.note)}</li>`)
        .join("")}</ul>`,
      `<h3>Use it in a study</h3>`,
      `<p>${escapeHtml(object.howToUse)}</p>`,
    ].join("\n");

    return { html, tokensIn: totalIn, tokensOut: totalOut };
  }

  return null;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
```

(Note: `scrubAiText` replaces em-dashes with commas; the `—` in the `<li>` template above is OUR furniture added after scrubbing, matching the site's list style — it never comes from the model.)

**Binding rule for this module:** before writing it, read `src/lib/resources/categorize.ts` and MIRROR its exact model-client construction and `result.usage` property names (that file is proven in production; if it differs from this snippet's `createAnthropic({ baseURL })` or `usage.inputTokens`, categorize.ts wins). Keep the model id `claude-sonnet-4-5` and temperature 0.4 from this plan.

- [ ] **Step 2: Per-row route**

```ts
// src/app/api/admin/resources/[id]/field-notes/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, resources, aiGenerations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateFieldNotes, FIELD_NOTES_PROMPT_VERSION } from "@/lib/resources/generate-field-notes";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [row] = await db.select().from(resources).where(eq(resources.id, id));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const notes = await generateFieldNotes(row);
  if (!notes) {
    return NextResponse.json({
      status: (row.bodyText?.length ?? 0) > 0 || row.description || row.summary ? "failed" : "insufficient",
    });
  }

  await db
    .update(resources)
    .set({ fieldNotesHtml: notes.html, fieldNotesStatus: "draft", fieldNotesGeneratedAt: new Date() })
    .where(eq(resources.id, id));

  try {
    await db.insert(aiGenerations).values({
      type: "draft",
      prompt: `field-notes: ${row.title}`,
      promptVersion: FIELD_NOTES_PROMPT_VERSION,
      model: "claude-sonnet-4-5",
      output: notes.html.slice(0, 4000),
      inputTokens: notes.tokensIn,
      outputTokens: notes.tokensOut,
      entityType: "resource",
      userId,
    });
  } catch (err) {
    console.error("field-notes ai_generations log failed", err);
  }

  return NextResponse.json({ status: "draft" });
}
```

- [ ] **Step 3: Section batch route**

```ts
// src/app/api/admin/resources/sections/[id]/field-notes/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, resources } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { generateFieldNotes } from "@/lib/resources/generate-field-notes";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Spec: capped batch per run; a failed item stays draft-less rather than
 *  blocking its section. 15 rows ≈ well inside 300s at one sonnet call each. */
const BATCH_CAP = 15;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const pending = await db
    .select()
    .from(resources)
    .where(
      and(eq(resources.sectionId, id), eq(resources.fieldNotesStatus, "none"), isNull(resources.deletedAt))
    )
    .limit(BATCH_CAP);

  let drafted = 0;
  let insufficient = 0;
  let failed = 0;

  for (const row of pending) {
    try {
      const notes = await generateFieldNotes(row);
      if (!notes) {
        insufficient++;
        continue;
      }
      await db
        .update(resources)
        .set({ fieldNotesHtml: notes.html, fieldNotesStatus: "draft", fieldNotesGeneratedAt: new Date() })
        .where(eq(resources.id, row.id));
      drafted++;
    } catch (err) {
      console.error("field-notes batch item failed", row.id, err);
      failed++;
    }
  }

  const [{ count: remaining }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(resources)
    .where(
      and(eq(resources.sectionId, id), eq(resources.fieldNotesStatus, "none"), isNull(resources.deletedAt))
    );

  return NextResponse.json({ processed: pending.length, drafted, insufficient, failed, remaining });
}
```

- [ ] **Step 4: Creation hooks (both paths, non-blocking)**

In `src/app/api/admin/resources/bulk-upload/route.ts`, directly after the categorize block (~line 211) where the row's values are assembled/inserted — generate ONCE post-insert using the inserted row's id and data:

```ts
    // Field notes draft (spec §A-FN) — non-blocking; a failure leaves the
    // row at status 'none' for the section backfill or a manual draft.
    try {
      const notes = await generateFieldNotes({
        provider: null,
        bodyText,
        title,
        author: null,
        description: description ?? "",
        summary: aiSummary ?? "",
      });
      if (notes) {
        await db
          .update(resources)
          .set({ fieldNotesHtml: notes.html, fieldNotesStatus: "draft", fieldNotesGeneratedAt: new Date() })
          .where(eq(resources.id, insertedId));
      }
    } catch (err) {
      console.error("field-notes on upload failed", err);
    }
```

(The implementer must bind `bodyText`/`title`/`description`/`aiSummary`/`insertedId` to that route's ACTUAL local variable names at the hook point — read the surrounding 40 lines first; the concept is fixed, the identifiers come from the file.)

Same shape in `src/server/resources-link.ts` `createLinkResource` after its categorize block (~line 106), passing `provider` (that function's detected provider), `bodyText: null`, and its own title/author/description locals.

- [ ] **Step 5: vercel.json**

Add to the `functions` block (alongside the existing entries):

```json
    "src/app/api/admin/resources/sections/**/route.ts": { "maxDuration": 300 },
```

Check first whether an equivalent glob already covers the retag route (the research says retag sets maxDuration in-file; in-file `export const maxDuration` also works on Pro — if the existing retag route relies on the in-file export only, SKIP this step and rely on the in-file exports for both new routes, noting that in the report).

- [ ] **Step 6: Gates + commit**

Run: `npx tsc --noEmit && npm test && npx eslint src/lib/resources/generate-field-notes.ts "src/app/api/admin/resources/[id]/field-notes/route.ts" "src/app/api/admin/resources/sections/[id]/field-notes/route.ts" src/app/api/admin/resources/bulk-upload/route.ts src/server/resources-link.ts`
Expected: clean.

```bash
git add -A src/lib/resources/generate-field-notes.ts "src/app/api/admin/resources" src/app/api/admin/resources/bulk-upload/route.ts src/server/resources-link.ts vercel.json
git commit -m "feat(resources): field-notes generator, per-row + section batch routes, creation hooks"
```

---

### Task 5: Admin UI — inline approve strip + automation-bar action

**Files:**
- Modify: `src/app/(app)/admin/resources/admin.tsx` — `ResourceRow` (line ~687) + the `updateResource` call path (line ~468)
- Modify: `src/app/(app)/admin/resources/section-automation-bar.tsx` — fourth action

**Interfaces:**
- Consumes: `POST /api/admin/resources/[id]/field-notes`, `POST /api/admin/resources/sections/[id]/field-notes` (Task 4), `updateResource` with `fieldNotesHtml`/`fieldNotesStatus` (Task 3).
- The admin resource list payload must include `fieldNotesHtml` and `fieldNotesStatus` — check `listResourcesForAdmin` in `src/server/resources-admin.ts`; if it does `select()` whole rows the fields flow automatically, if it selects columns add the two fields.

- [ ] **Step 1: ResourceRow field-notes strip**

Inside `ResourceRow`, beside the existing per-row AI buttons (recategorize/reextract/refresh-metadata/generate-cover, handlers at lines ~709-782), add a field-notes block following the file's existing button + state conventions (`ActionState`-style pending flags, `confirm()` where destructive). Exact behavior contract:

- Status `none`: muted chip "No field notes" + button **"Draft notes"** → POST per-row route → on `{status:"draft"}` refresh (router.refresh() or local state update matching how generate-cover updates); on `insufficient` show chip "Needs manual notes"; on `failed` show a plain error line.
- Status `draft`: amber chip "Draft" + collapsed preview (first ~140 chars of `fieldNotesHtml` stripped of tags) + buttons **"Approve"** (→ `updateResource({ id, fieldNotesStatus: "approved" })`), **"Edit"** (textarea bound to the raw HTML, Save → `updateResource({ id, fieldNotesHtml })`), **"Redraft"** (per-row POST again, `confirm()` first — overwrites the draft).
- Status `approved`: olive chip "Approved · public" + **"Unpublish"** (→ `fieldNotesStatus: "draft"`) + Edit as above (saving an edit while approved keeps approved).
- All buttons ≥ 44px targets is NOT required here (admin desktop tool; Phase B owns admin mobile) — match the row's existing button sizing.

Follow the file's existing markup/styling exactly; this file is 41KB of established convention — copy a neighboring button block's classes rather than inventing.

- [ ] **Step 2: Automation-bar action**

In `section-automation-bar.tsx`, add a fourth action "Draft field notes" cloning the retag action's structure (`ActionState`, `confirm()` with a message stating the cap: "Draft field notes for up to 15 resources missing them in this section? Costs AI tokens."), calling the section batch route, rendering the result line: `Drafted X · insufficient Y · failed Z · remaining N` and, when `remaining > 0`, the hint "Run again for the next batch."

- [ ] **Step 3: Gates + visual check + commit**

Run: `npx tsc --noEmit && npm test && npx eslint src/app/\(app\)/admin/resources/admin.tsx src/app/\(app\)/admin/resources/section-automation-bar.tsx`
Expected: clean. (Authenticated browser check happens centrally in Task 7 — do not start a dev server.)

```bash
git add "src/app/(app)/admin/resources/admin.tsx" "src/app/(app)/admin/resources/section-automation-bar.tsx" src/server/resources-admin.ts
git commit -m "feat(admin): field-notes draft/approve strip on resource rows + section batch action"
```

---

### Task 6: Public render + Phase A inherited cleanups

**Files:**
- Modify: `src/app/(public)/resources/[slug]/page.tsx` (insert block between the hairline at ~line 248 and the provider branch at ~line 258)
- Modify: `src/app/(public)/resources/browser.tsx` — prune orphaned `ItemLite` fields (`sourceMime`, `durationSeconds`, `estimatedMinutes`)
- Modify: `src/app/(public)/resources/page.tsx` — drop the same three fields from the items mapping
- Modify: `src/server/resources-admin.ts` — remove `sourceMime` from `listSectionsAndResourcesForPublic`'s select (Phase A added it for typeLabel; nothing reads it now). KEEP it in `getPublicResourceBySlug` (pre-existing, detail page uses it).
- Delete: `src/lib/resources/type-label.ts`, `src/lib/resources/type-label.test.ts` (final-review ruling: A-FN uses it or drops it — field notes don't need it; CTA verbs carry type)
- Modify: `src/app/(public)/page.tsx` — renumber the stale section comments (sequence currently skips 6) and add a stable order to `getMeetingRhythms` (`.orderBy(asc(locations.city), asc(locations.meetingDay))` — add `asc` to the drizzle-orm import if not present)

**Interfaces:**
- Consumes: `fieldNotesHtml`/`fieldNotesStatus` from `getPublicResourceBySlug` (Task 3).

- [ ] **Step 1: Detail-page render block**

In `src/app/(public)/resources/[slug]/page.tsx`, directly after the `<div className="hairline mb-10" />` (~line 248) and BEFORE the provider-branch comment block:

```tsx
          {/* Field notes — the two-tap answer (spec §A-FN). Approved only;
              drafts never render publicly. Sits above the provider branch
              so a man reads the notes before being offered the exit link. */}
          {row.fieldNotesStatus === "approved" && row.fieldNotesHtml && (
            <section className="mb-12">
              <div className="flex items-center gap-3">
                <span className="section-mark text-brass">§ Field notes</span>
                <div className="hairline flex-1" />
              </div>
              <div
                className="resource-prose mt-6"
                dangerouslySetInnerHTML={{ __html: row.fieldNotesHtml }}
              />
            </section>
          )}
```

(`resource-prose` is the existing semantic-token prose class used by `ResourceBody`; the HTML is generated by our own escaping renderer in Task 4 — model text never reaches the DOM unescaped.)

- [ ] **Step 2: Prune orphaned fields**

- `browser.tsx` `ItemLite`: delete the `sourceMime`, `durationSeconds`, `estimatedMinutes` lines.
- `resources/page.tsx` mapping: delete `sourceMime: i.sourceMime ?? null,`, `durationSeconds: i.durationSeconds ?? null,`, `estimatedMinutes: i.estimatedMinutes ?? null,`.
- `resources-admin.ts` `listSectionsAndResourcesForPublic`: remove the `sourceMime: resources.sourceMime,` select line (added in Phase A for typeLabel; now feeds nothing). Leave `durationSeconds`/`estimatedMinutes` in the SERVER select only if other callers use them — there is exactly one caller (the public page); if the mapping no longer passes them, remove from the select too.

- [ ] **Step 3: Delete typeLabel**

```bash
git rm src/lib/resources/type-label.ts src/lib/resources/type-label.test.ts
```

- [ ] **Step 4: Homepage cleanups**

- Renumber section comments so they read 1..7 in order (currently 1,2,3,4,5,7,8).
- `getMeetingRhythms`: append `.orderBy(asc(locations.city), asc(locations.meetingDay))` before `.limit(4)`; ensure `asc` is imported from drizzle-orm (the file already imports `asc` — verify).

- [ ] **Step 5: Gates + commit**

Run: `npx tsc --noEmit && npm test && npx eslint "src/app/(public)/resources/[slug]/page.tsx" "src/app/(public)/resources/browser.tsx" "src/app/(public)/resources/page.tsx" src/server/resources-admin.ts "src/app/(public)/page.tsx"`
Expected: clean; test count drops by 4 (type-label suite removed) — vitest reports 3 files.

```bash
git add -A
git commit -m "feat(resources): render approved field notes on detail page; retire Phase A dead weight"
```

---

### Task 7: Gates, live-fire, final review, ship

Controller-owned (browser + prod-DB access live in the main session).

- [ ] **Step 1: Full static gates** — tsc, vitest, eslint over all changed files, `npm run check:contrast`.
- [ ] **Step 2: Live-fire generation** against the prod DB via local dev server with real `ANTHROPIC_API_KEY`: POST the per-row route for TWO real rows — one file-backed (full mode) and one Amazon book (framing mode). Verify: draft lands with status `draft`, HTML structure (2-3 `<p>`, `<h3>Key scriptures</h3>` list with parseable refs, `<h3>Use it in a study</h3>`), framing draft makes NO content claims about the book (read it), banned-language gate returns clean, `ai_generations` row logged. Approve ONE via `updateResource`, confirm it renders at `/resources/[slug]` in 2 taps from the list, then flip it back to `draft` (drafts are real value — leave them, they never render publicly).
- [ ] **Step 3: Section batch route live-fire** on the smallest section: verify `{processed, drafted, insufficient, failed, remaining}` accounting sums correctly and re-running processes the next batch.
- [ ] **Step 4: Final whole-branch review** (most capable model) with the accumulated Minors list; fix wave; re-verdict.
- [ ] **Step 5: PR** (body to scratchpad file, `--body-file`), wait Vercel, squash-merge, confirm the migration Action green, then live prod checks: detail page of the approved test row IF one was left approved — otherwise confirm `/resources` and a detail page render unchanged (no approved notes yet = no block, correct). Zero runtime errors for 10 minutes.
- [ ] **Step 6: Docs** — stamp spec §A-FN shipped; note in CLAUDE.md's AI section that field notes exist and the banned-language gate is at `src/lib/ai/banned.ts` (Phase C dependency); ledger + memory updates.
