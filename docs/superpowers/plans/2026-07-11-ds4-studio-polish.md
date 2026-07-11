# DS-4 — Design Studio Polish & Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out the Design Studio Build Order's final phase — fix the one remaining concurrency gap, clean up two disclosed UI Minors, verify the admin UI holds up at 375px, and stamp the whole DS-1→DS-4 arc as complete.

**Architecture:** This phase touches no new subsystems — it hardens and polishes what DS-1/DS-2/DS-3 already shipped. No new tables, no new Server Actions, no new pages.

**Tech Stack:** Same as DS-1/2/3 — Next.js 16, Drizzle/Neon, Vitest, existing `src/lib/studio/*`/`src/server/studio*.ts` modules.

## Global Constraints

- Do NOT modify `src/lib/studio/config.ts`, `src/lib/studio/changeset.ts`, `src/middleware.ts`, `src/app/(public)/layout.tsx`, or any existing Server Action's signature — this phase is polish, not re-architecture.
- `discardDraft`'s fix must use the exact same lock constant as `applyDraft`/`restoreVersion`: `pg_advisory_xact_lock(815552)` (the existing `STUDIO_LOCK` constant in `src/server/studio.ts` — NOT 815551, which belongs to letter series).
- `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run check:contrast` must all pass before any task is marked complete.
- Voice rules apply to any new/changed admin-facing copy: no em-dashes where a comma works, no banned words (repo CLAUDE.md).

---

## File Structure

- `src/server/studio.ts` — `discardDraft` gains the missing advisory lock (one line).
- `src/app/(app)/admin/studio/studio.tsx` — page-switch handler resets `openKey`/`fieldDraft`; `WALKTHROUGH_STEPS` copy generalized; any 375px fixes found in Task 3 land here too.
- `docs/superpowers/specs/2026-07-11-admin-design-studio-design.md` — final "Design Studio COMPLETE" stamp.
- `CLAUDE.md` — Design Studio bullet updated to reflect the finished arc.

---

### Task 1: `discardDraft` advisory lock

**Files:**
- Modify: `src/server/studio.ts`

**Interfaces:**
- Consumes: existing `STUDIO_LOCK` constant (already defined in this file, used by `applyDraft` and `restoreVersion`).
- Produces: nothing new consumed downstream — this is a one-line hardening fix inside an existing function's transaction.

- [ ] **Step 1: Confirm the exact gap**

Read `src/server/studio.ts`'s `applyDraft` function — its `db.transaction(async (tx) => { ... })` callback's FIRST statement is:
```ts
await tx.execute(sql`SELECT pg_advisory_xact_lock(${STUDIO_LOCK})`);
```
`restoreVersion` has the identical first statement in its own transaction. `discardDraft`'s transaction callback currently has NO such statement — it goes straight to `const row = await pilotRow(tx as unknown as typeof db);`. This is the gap: three server actions all read-modify-write the same `site_studio` row and `site_text.draft_value` column, but only two of the three serialize themselves against each other and against concurrent calls to themselves.

- [ ] **Step 2: Add the lock**

In `src/server/studio.ts`, inside `discardDraft`'s `await db.transaction(async (tx) => { ... })` callback, add the lock acquisition as the FIRST statement, before `const row = await pilotRow(...)`:

```ts
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${STUDIO_LOCK})`);
      const row = await pilotRow(tx as unknown as typeof db);
```

(The rest of the function body is unchanged — only this one line is inserted.)

- [ ] **Step 3: Verify gates**

Run: `npx tsc --noEmit && npm run lint`
Expected: both PASS.

- [ ] **Step 4: Manual concurrency trace**

There is no existing Vitest harness for `src/server/studio.ts`'s Server Actions (they were verified via live-fire drills against a real Neon connection during DS-1's acceptance testing, not unit tests — read `.superpowers/sdd/progress.md`'s "DS-1 SHIPPED" entry in the original checkout at `/Users/drewgodwin/Code/sheepdogsociety` for that precedent if you want the full history, but do not modify anything there). For this fix, do a careful manual trace instead of a new test file: confirm by reading the code that `applyDraft`, `discardDraft`, and `restoreVersion` now ALL take `pg_advisory_xact_lock(STUDIO_LOCK)` as the first statement inside their respective `db.transaction` callbacks — grep for `pg_advisory_xact_lock` in `src/server/studio.ts` and confirm exactly 3 matches, one per function, all using the same `${STUDIO_LOCK}` constant.

If DB credentials are available in this environment, additionally do a live drill: open two terminal sessions, start a transaction manually holding `pg_advisory_xact_lock(815552)` via `psql`/a scratch script against `DATABASE_URL_UNPOOLED`, then call `discardDraft()` from the app and confirm it blocks until the lock is released (rather than proceeding concurrently). If no DB credentials are available (a known, expected limitation in this sandbox — no `.env` access, no exported vars), document this as a deferred live-fire item exactly like earlier DS-2/DS-3 tasks did, and rely on the code-level trace as sufficient evidence for this one-line, low-risk change.

- [ ] **Step 5: Commit**

```bash
git add src/server/studio.ts
git commit -m "fix(studio): discardDraft takes the same advisory lock as applyDraft/restoreVersion"
```

---

### Task 2: Two deferred UI Minors

**Files:**
- Modify: `src/app/(app)/admin/studio/studio.tsx`

**Interfaces:**
- Consumes: existing `selectedPage`/`setSelectedPage`/`openKey`/`setOpenKey`/`fieldDraft`/`setFieldDraft`/`WALKTHROUGH_STEPS` state and constants, all already defined in this file.
- Produces: nothing new consumed downstream.

- [ ] **Step 1: Fix the stale `openKey`/`fieldDraft` on page switch**

Find the page-selector `<select>`'s `onChange` handler (currently `onChange={(e) => setSelectedPage(e.target.value)}`). The bug: if the admin has a text field open (editing) on page A and switches to page B via this dropdown, `openKey` still points at page A's field key. Since `pageEntries` recomputes for the new page, `openKey === e.key` will simply never match any of page B's entries — so the editor UI silently closes, but `fieldDraft` (the possibly-half-typed text) is left dangling in state, invisible but not cleared. Fix by clearing both on page switch:

```tsx
              onChange={(e) => {
                setSelectedPage(e.target.value);
                setOpenKey(null);
                setFieldDraft("");
              }}
```

- [ ] **Step 2: Generalize the walkthrough copy**

Find `WALKTHROUGH_STEPS` (an array near the top of the file, one of its entries currently reads `"Show, hide, or move a homepage section."`). Since the page selector now covers all 12 pages (from DS-2), this wording is stale — it should read `"Show, hide, or move a section on this page."` (matching the voice already used elsewhere in this file for the Sections panel's own hint tooltip, e.g. "Show, hide, or reorder the pieces of this page.").

- [ ] **Step 3: Run gates**

Run: `npx tsc --noEmit && npm run lint`
Expected: both PASS, zero new lint errors in this file.

- [ ] **Step 4: Manual verification (or static trace)**

If a dev server + admin credentials are available: open `/admin/studio`, open a text field on one page (don't save), switch pages via the dropdown, confirm the previously-open field editor is fully closed and re-opening any field on the new page starts from a clean `fieldDraft`. If credentials are unavailable (expected, documented limitation), do a static trace: confirm the new `onChange` handler's three statements execute in the same event handler (synchronous, no race), and confirm no other code path re-populates `fieldDraft` from stale state after this reset.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/admin/studio/studio.tsx
git commit -m "fix(studio): reset open text-field editor on page switch; generalize walkthrough copy for all 12 pages"
```

---

### Task 3: 375px mobile pass on `/admin/studio`

**Files:**
- Modify: `src/app/(app)/admin/studio/studio.tsx` (only if real issues are found — do not make speculative changes)

**Interfaces:**
- Consumes: the existing layout structure (a `grid gap-8 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]` wrapper that stacks to a single column below the `xl` breakpoint — confirmed via reading the file that there is currently no `md:`/`sm:`-specific treatment beyond that one breakpoint).
- Produces: nothing new consumed downstream.

- [ ] **Step 1: Read the current layout in full**

Read `src/app/(app)/admin/studio/studio.tsx`'s full JSX return, noting: the left rail (page selector, theme picker, section list, text-field editor, AI helper strip), the preview pane (device/mode toggles, the `frameWidth = device === "mobile" ? 375 : 1280` iframe sizing, wrapped in an `overflow-x-auto` container per the existing code), and the Apply/Discard/Versions button row. This codebase already has some mobile hygiene in this file (e.g. `min-h-11` tap targets on the theme picker buttons, `w-full` on the page selector, `overflow-x-auto` on the preview container) — this task is a targeted audit for gaps, not a rewrite.

- [ ] **Step 2: Audit for real 375px issues**

If a dev server is reachable in this environment: run `npm run dev`, use the browser tools to resize to a 375px-wide viewport (mobile preset), and navigate to `/admin/studio` (sign in if credentials are available; if not, this is a known, expected limitation — proceed to the code-based audit below instead and document the gap). Check specifically for:
- Any element that causes horizontal page-level scroll (not the intentional `overflow-x-auto` preview container, which is expected to scroll internally when the "desktop" 1280px iframe is selected).
- Any button/link/input smaller than a 44px tap target (the codebase's own established minimum, per `min-h-11`/`h-11` used elsewhere in this same file).
- The AI helper strip's "recommendations"/"describe-it"/per-field-assist buttons (added in DS-3) — these were built without any specific mobile testing; confirm they wrap sensibly and don't overflow their containers at 375px.
- The Versions drawer and Stuck? panel (both pre-existing from DS-1) — confirm they still render sensibly stacked at this width.

If a dev server is NOT reachable (no DB/auth credentials in this sandbox, matching the limitation documented throughout DS-2/DS-3's tasks), do the audit by reading the JSX and CSS classes directly: for each interactive element, trace its className chain for `w-full`/fixed pixel widths/`flex-wrap` presence, and flag anything with a fixed width wider than ~343px (375px minus reasonable padding) or lacking `flex-wrap` in a horizontal button row that could overflow. Document this static-audit method explicitly in your report if used, per the established pattern from earlier DS-2/DS-3 tasks.

- [ ] **Step 3: Fix only what's actually found**

If the audit finds real issues (e.g., a button row that overflows because it lacks `flex-wrap`, or a fixed-width element wider than the viewport), fix them with the minimal Tailwind class change needed (e.g. adding `flex-wrap` to a `flex` row, or changing a fixed width to `w-full` / a responsive width). Do NOT restructure the layout speculatively if the audit finds no real problems — this codebase already has decent mobile hygiene in this file, and DS-4 is a polish phase, not a redesign. If the audit finds zero real issues, say so plainly in your report rather than inventing changes to justify the task.

- [ ] **Step 4: Run gates**

Run: `npx tsc --noEmit && npm run lint`
Expected: both PASS.

- [ ] **Step 5: Commit**

If changes were made:
```bash
git add src/app/\(app\)/admin/studio/studio.tsx
git commit -m "fix(studio): 375px mobile pass on /admin/studio"
```
If no changes were needed, skip this commit and say so clearly in your report (do not create an empty commit).

---

### Task 4: Docs stamp, full gate sweep, final review, ship

**Files:**
- Modify: `docs/superpowers/specs/2026-07-11-admin-design-studio-design.md`
- Modify: `CLAUDE.md`

**Interfaces:** none — this is the closing task for the whole Design Studio (DS-1 through DS-4) arc.

- [ ] **Step 1: Full automated gate sweep**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run check:contrast`
Expected: `vitest`/`tsc` PASS; `lint` shows no NEW errors beyond whatever pre-existing baseline this branch inherited from `main` at branch time; `check:contrast` PASS (unaffected by this phase, confirmatory only).

- [ ] **Step 2: Stamp the spec as complete**

In `docs/superpowers/specs/2026-07-11-admin-design-studio-design.md`, the top of the file already has three shipped-callouts (`> **DS-1 SHIPPED ...**`, `> **DS-2 SHIPPED ...**`, `> **DS-3 SHIPPED ...**`, each as its own blockquote paragraph separated by `>` blank lines). Add a fourth, final one immediately after the DS-3 callout:

```markdown
>
> **DS-4 SHIPPED 2026-07-11 — DESIGN STUDIO COMPLETE.** `discardDraft` now takes the same `pg_advisory_xact_lock(815552)` that `applyDraft`/`restoreVersion` already did, closing the last concurrency gap across all three draft-mutating Server Actions. Two disclosed UI Minors closed: the text-field editor now resets cleanly on page switch (no stale `openKey`/`fieldDraft`), and the first-run walkthrough's copy no longer assumes the homepage (it now speaks to "a section on this page," matching all 12 governed pages). A 375px mobile pass on `/admin/studio` [confirmed the layout already held up / fixed N specific overflow-adjacent issues — state which, based on Task 3's actual finding]. This closes the full DS-1 → DS-4 Build Order: the Design Studio now governs theme + layout + text across all 12 public pages, with preview/compare/apply/undo, a draft-only AI layer, and no known concurrency or mobile gaps.
```

(Fill in the bracketed clause based on what Task 3 actually found — do not leave the placeholder text in the committed file.)

Also update the "Build order" section's final bullet:
```markdown
- **DS-4 (polish + hardening, SHIPPED 2026-07-11):** guides final pass, studio 375px pass, live-fire drills (discardDraft advisory lock — the concurrency gap named in this bullet originally — now closed), docs.
```

- [ ] **Step 3: Update CLAUDE.md**

In `CLAUDE.md`'s Design Studio bullet, change `DS-1 + DS-2 + DS-3 shipped` to `DS-1 + DS-2 + DS-3 + DS-4 shipped — COMPLETE`, and change the closing sentence `DS-4 (polish/hardening) is the next phase.` to note there is no next phase: `The Design Studio arc (DS-1–DS-4) is complete; discardDraft now shares the same pg_advisory_xact_lock(815552) as applyDraft/restoreVersion.`

- [ ] **Step 4: Final whole-branch review**

Generate the review package (`scripts/review-package BASE HEAD` from the `subagent-driven-development` skill directory, `BASE` = the commit this branch started from) and dispatch a final code-reviewer subagent on the most capable available model, with this plan's Global Constraints verbatim. Ask it to specifically verify: (a) the lock fix is byte-consistent with the other two functions' lock acquisition, (b) the page-switch reset doesn't introduce any new race with the existing per-field save flow, (c) any 375px changes are minimal and don't regress desktop layout, (d) the spec/CLAUDE.md stamps accurately describe what actually shipped (not aspirational language). Apply any Critical/Important findings as one consolidated fix wave, re-run Step 1's gates after fixes.

- [ ] **Step 5: Ship**

Push the branch, open a PR (`gh pr create`), wait for CI/Vercel preview to pass, merge (via the GitHub API merge endpoint if `gh pr merge`'s local branch-delete step conflicts with another checkout having `main` checked out in its own worktree — the same workaround used for DS-1/DS-2/DS-3), then live-verify: curl `/admin/studio` on production to confirm it still 307s unauthenticated visitors, confirm a couple of public routes still 200, and confirm zero new runtime errors post-deploy. Update `.superpowers/sdd/progress.md` (original checkout) and persistent memory with a final "DESIGN STUDIO COMPLETE (DS-1→DS-4)" entry summarizing the whole arc's shipped state and its hardest-won lessons (the plan-authored-defect pattern, the draft-vs-published config-read gotcha, the stale-closure-tautology-fix gotcha) for future sessions.

## Self-Review

**Spec coverage:** All four Build-Order DS-4 items are covered: guides polish (Task 2's walkthrough copy fix), studio 375px pass (Task 3), live-fire/concurrency drills (Task 1's advisory lock), docs (Task 4). No spec requirement is left uncovered.

**Placeholder scan:** No TBD/TODO. Task 3's "fix only what's found" and Task 4's "fill in the bracketed clause" are explicit instructions to write real content based on real findings, not placeholders left in the deliverable — the plan is clear that nothing bracketed should survive into the committed file.

**Type consistency:** `STUDIO_LOCK`/`pg_advisory_xact_lock(815552)` referenced identically across Task 1 and Task 4. `openKey`/`setOpenKey`/`fieldDraft`/`setFieldDraft`/`selectedPage`/`setSelectedPage` names match the existing file's actual declarations (confirmed via source read before writing this plan, not assumed).
