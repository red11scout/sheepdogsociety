# Phase A — Public Mobile Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the mobile-first public experience: bottom tab bar, 5W1H homepage, resources wayfinding cleanup, and a touch/a11y pass.

**Architecture:** Pure front-end phase — no schema changes, no new API routes. One new client component (`MobileTabBar`), edits to the public layout, public nav, homepage server component, and the resources browser. The only new pure logic (resource type labels) is extracted to `src/lib/resources/type-label.ts` under Vitest.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4 (broadsheet `@utility` furniture — folio/section-mark/display-xl/etc.), custom `Icon` component (NOT lucide directly on public pages), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-09-phase4-mobile-simplification-design.md` (§Phase A). Read it before starting.

## Global Constraints

- Voice per `src/lib/ai/system-prompt.ts` and CLAUDE.md: short Anglo-Saxon sentences, imperative + invitation. NEVER: delve, leverage, navigate, robust, tapestry, journey (n.), rise, reclaim, real men, alpha, based, toxic masculinity. NEVER em-dashes where commas work. All copy in this plan is final — do not paraphrase it.
- Homepage sections: hard cap 40 words of prose per section.
- Icons: use `@/components/icons/Icon` with existing names only (no new SVGs this phase). Valid names used here: `shield`, `map-pin`, `mail`, `scroll`, `clipboard`, `arrow-right`, `chevron-right`.
- Touch targets ≥ 44px on anything tappable that this phase touches.
- No information or action reachable only via hover.
- Repo: `/Users/drewgodwin/Code/sheepdogsociety`. npm (NOT pnpm). Branch for this phase: `feat/phase-a-public-mobile` off fresh `main`.
- Gates before PR: `npx tsc --noEmit` · `npm test` · `npx eslint <changed files>` · `npm run check:contrast`.

---

### Task 1: Resource type-label logic (pure, TDD)

**Files:**
- Create: `src/lib/resources/type-label.ts`
- Test: `src/lib/resources/type-label.test.ts`

**Interfaces:**
- Produces: `export type ResourceTypeLabel = "Book" | "Video" | "Article" | "Guide" | "Download"` and `export function typeLabel(input: { provider: string | null; sourceMime: string | null; hasBody: boolean; fileKey: string }): ResourceTypeLabel`. Task 5 imports both.

Precedence (locked in spec §A.3, with one documented addition): **provider wins → readable body → mime → Download.** The `hasBody` check is not in the spec's table but is required: a mammoth-converted .docx renders as readable text on the detail page, and labeling the flagship readable type "Download" would lie. It slots after provider, before mime.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/resources/type-label.test.ts
import { describe, expect, it } from "vitest";
import { typeLabel } from "./type-label";

const base = { provider: null as string | null, sourceMime: null as string | null, hasBody: false, fileKey: "" };

describe("typeLabel", () => {
  it("provider wins over everything", () => {
    expect(typeLabel({ ...base, provider: "amazon", hasBody: true })).toBe("Book");
    expect(typeLabel({ ...base, provider: "youtube", sourceMime: "application/pdf" })).toBe("Video");
    expect(typeLabel({ ...base, provider: "web" })).toBe("Article");
  });
  it("readable body means Guide when no provider", () => {
    expect(typeLabel({ ...base, hasBody: true })).toBe("Guide");
    expect(typeLabel({ ...base, hasBody: true, sourceMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })).toBe("Guide");
  });
  it("mime drives file types", () => {
    expect(typeLabel({ ...base, sourceMime: "video/mp4", fileKey: "x" })).toBe("Video");
    expect(typeLabel({ ...base, sourceMime: "application/pdf", fileKey: "x" })).toBe("Guide");
    expect(typeLabel({ ...base, sourceMime: "application/zip", fileKey: "x" })).toBe("Download");
  });
  it("anything unclassifiable is Download", () => {
    expect(typeLabel(base)).toBe("Download");
    expect(typeLabel({ ...base, provider: "unknown-future-provider" })).toBe("Download");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/resources/type-label.test.ts`
Expected: FAIL — cannot find module `./type-label`.

- [ ] **Step 3: Implement**

```ts
// src/lib/resources/type-label.ts
/**
 * Plain-English resource type label. Replaces the Phase-2 icon system the
 * users called confusing (Amazon books and generic files shared a scroll
 * icon). Precedence: provider wins, then a readable extracted body, then
 * mime, then Download. See spec §A.3.
 */
export type ResourceTypeLabel = "Book" | "Video" | "Article" | "Guide" | "Download";

export function typeLabel(input: {
  provider: string | null;
  sourceMime: string | null;
  hasBody: boolean;
  fileKey: string;
}): ResourceTypeLabel {
  if (input.provider === "amazon") return "Book";
  if (input.provider === "youtube") return "Video";
  if (input.provider === "web") return "Article";
  // Readable extracted body (mammoth .docx etc.) renders on the detail
  // page, so it is a Guide regardless of the file's mime.
  if (input.hasBody) return "Guide";
  if (input.sourceMime?.startsWith("video/")) return "Video";
  if (input.sourceMime === "application/pdf") return "Guide";
  return "Download";
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/lib/resources/type-label.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/resources/type-label.ts src/lib/resources/type-label.test.ts
git commit -m "feat(resources): plain-English type-label logic (provider > body > mime > Download)"
```

---

### Task 2: MobileTabBar component + layout wiring

**Files:**
- Create: `src/components/public/mobile-tab-bar.tsx`
- Modify: `src/app/(public)/layout.tsx` (17 lines, shown in full below)

**Interfaces:**
- Consumes: `Icon` from `@/components/icons/Icon` (names: `shield`, `map-pin`, `mail`, `scroll`, `clipboard`).
- Produces: `<MobileTabBar />` (no props). Task 3+4 pages must remain scrollable above it — the layout padding added here is what guarantees that; do not add per-page padding.

- [ ] **Step 1: Create the component**

```tsx
// src/components/public/mobile-tab-bar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";

const TABS: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: "/", label: "Home", icon: "shield", exact: true },
  { href: "/groups", label: "Groups", icon: "map-pin" },
  { href: "/letter", label: "Letter", icon: "mail" },
  { href: "/bible", label: "Bible", icon: "scroll" },
  { href: "/resources", label: "Resources", icon: "clipboard" },
];

/**
 * Mobile-only bottom tab bar (spec §A.1). 99% of users are on phones;
 * this puts the five primary destinations one thumb-tap away. Desktop
 * masthead is untouched. Active state = brass text + a 2px top bar
 * (shape, not color alone) + aria-current for assistive tech.
 */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/15 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 pt-1 ${
                  active ? "text-brass" : "text-foreground/60"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-0.5 bg-brass"
                  />
                )}
                <Icon name={tab.icon} size={20} />
                <span className="text-[0.625rem] font-medium uppercase tracking-wider">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Wire into the public layout with bottom padding**

Replace `src/app/(public)/layout.tsx` in full:

```tsx
import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";
import { MobileTabBar } from "@/components/public/mobile-tab-bar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // pb clears the fixed MobileTabBar (52px + safe area) on mobile only.
    <div className="flex min-h-screen flex-col pb-[calc(52px+env(safe-area-inset-bottom))] lg:pb-0">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <MobileTabBar />
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Start the dev server (launch.json config or `npm run dev` with `DATABASE_URL=$DATABASE_URL_UNPOOLED` from a pulled prod envfile). At 375px width:
- Bar visible on `/`, all 5 tabs render icon + label, none clipped.
- Tap Groups → `/groups`, Groups tab shows brass + top bar; navigate to a group detail — Groups stays active (prefix match).
- On `/` only Home is active (exact match).
- Footer's last line fully visible above the bar (padding works).
- At ≥1024px the bar is gone.

- [ ] **Step 4: Commit**

```bash
git add src/components/public/mobile-tab-bar.tsx "src/app/(public)/layout.tsx"
git commit -m "feat(nav): mobile bottom tab bar with 5 primary destinations"
```

---

### Task 3: Public nav — demote mobile panel to secondary links, close on navigation

**Files:**
- Modify: `src/components/public/public-nav.tsx` (desktop rows untouched; mobile panel at lines 258-298 replaced; imports + one effect added)

**Interfaces:**
- Consumes: nothing new besides `usePathname` from `next/navigation`.
- Produces: mobile panel listing ONLY secondary destinations (primary five live in the tab bar now). Join first. Gallery appears for admins.

- [ ] **Step 1: Add pathname-close effect**

In `public-nav.tsx`, add `usePathname` to the `next/navigation` import (the file currently imports nothing from it — add `import { usePathname } from "next/navigation";` after the `next/image` import). Inside `PublicNav()` after the `isAdmin` state, add:

```tsx
  const pathname = usePathname();

  // A tab-bar tap navigates without touching this component's state; close
  // the slide-down panel so it never covers the new page (spec §A.1).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
```

- [ ] **Step 2: Replace the mobile panel contents**

Above the component, after the `navLinks` array, add the secondary list (spec order — Join first):

```tsx
/** Mobile panel links (spec §A.1). The five primary destinations live in
 *  the bottom tab bar; the hamburger holds everything else, Join first. */
const mobileSecondaryLinks: { href: string; label: string }[] = [
  { href: "/join", label: "Join" },
  { href: "/events", label: "Events" },
  { href: "/stories", label: "Stories" },
  { href: "/about", label: "About us" },
  { href: "/what-to-expect", label: "What to expect" },
  { href: "/how-we-gather", label: "How we gather" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/giving", label: "Giving" },
  { href: "/acts-20-28", label: "Acts 20:28" },
  { href: "/sms-terms", label: "SMS terms" },
  { href: "/privacy", label: "Privacy" },
];
```

Replace the entire `{mobileOpen && ( ... )}` block (currently lines 258-298, iterating `links` with nested children) with:

```tsx
        {/* Mobile slide-down panel — secondary destinations only; the
            primary five are one thumb-tap away in the bottom tab bar. */}
        {mobileOpen && (
          <div className="border-t border-foreground/10 bg-background px-6 pb-6 pt-2 lg:hidden">
            {(isAdmin
              ? [...mobileSecondaryLinks, { href: "/gallery", label: "Gallery" }]
              : mobileSecondaryLinks
            ).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-3 text-sm font-medium text-foreground/80"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
```

(The old panel's bottom "Join" button block is deleted — Join is now the first row.)

- [ ] **Step 3: Verify in browser at 375px**

- Open hamburger: Join is first; Home/Groups/Letter/Bible/Resources absent; Events/Stories/About/…/Privacy present. Each row ≥44px tall (py-3 + text = ~44px; if measured under 44, bump to `py-3.5`).
- With the panel open, tap the Bible tab in the bottom bar → panel closes on the new page.
- Desktop ≥1024px: nav links, dropdowns, Join CTA all unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/components/public/public-nav.tsx
git commit -m "feat(nav): mobile panel holds secondary links only, closes on navigation"
```

---

### Task 4: Homepage restructure — 5W1H

**Files:**
- Modify: `src/app/(public)/page.tsx` — metadata (lines 19-32), hero (lines 181-246), new band replacing "How it works" (lines 263-279), gatherings chevron (line 315-317), photo strip removal (lines 98-125 query, 172-177 Promise.all, 413-466 section), Letter/story/join sections untouched.

**Interfaces:**
- Consumes: `locations` from `@/db/schema`, `and`, `eq`, `ne` from `drizzle-orm` (add `ne` and `locations` to existing imports).
- Produces: nothing downstream; Phase B will later migrate this copy to `site_text` — keep every new string a plain literal (no string-building) to make that migration mechanical.

All copy below is final. Hard cap 40 words of prose per section holds for every block.

- [ ] **Step 1: Update metadata**

Replace the `metadata` export (lines 19-32) with:

```tsx
export const metadata: Metadata = {
  title: "Sheepdog Society — Acts 20:28",
  description:
    "A brotherhood of Christian men anchored in Acts 20:28. Weekly tables around Scripture. Find your group, read the Letter, take a seat.",
  openGraph: {
    title: "Sheepdog Society — Find your brothers.",
    description:
      "A brotherhood of Christian men anchored in Acts 20:28. Weekly tables around Scripture.",
    images: [{ url: "/api/og/verse", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og/verse"],
  },
};
```

- [ ] **Step 2: Add the meeting-rhythms query**

Add `locations` to the schema import on line 5 and `ne` to the drizzle-orm import on line 6. After `getStory()` (line 145), add:

```tsx
/** When & where, live: distinct meeting day + city pairs from the public
 *  locator's exact visibility gate (spec §A.2 — the status enum has no
 *  "approved" value; /groups gates on displayedOnMap AND isActive). */
async function getMeetingRhythms() {
  try {
    const rows = await db
      .selectDistinct({ day: locations.meetingDay, city: locations.city })
      .from(locations)
      .where(
        and(
          eq(locations.displayedOnMap, true),
          eq(locations.isActive, true),
          ne(locations.meetingDay, "")
        )
      )
      .limit(4);
    return rows.filter((r) => r.day && r.city);
  } catch {
    return [];
  }
}
```

- [ ] **Step 3: Trim the hero to one paragraph**

In the hero (lines 195-223): replace the `dropcap` paragraph's text and delete the trailing paragraph, so the hero copy block reads:

```tsx
              <p className="dropcap mt-10 max-w-2xl font-scripture text-lg text-foreground/85">
                A brotherhood of Christian men, anchored in Acts 20:28. We
                meet weekly around Scripture, tell each other the truth, and
                stand watch over one another. You have walked alone long
                enough.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <Link
                  href="/groups"
                  className="lift group inline-flex h-12 items-center gap-3 bg-foreground px-7 text-base font-medium text-background"
                >
                  <Icon name="map-pin" size={18} />
                  Find your group
                  <Icon
                    name="arrow-right"
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
                <Link href="/letter" className="link-editorial text-base">
                  Read this week&rsquo;s Letter
                </Link>
              </div>
```

(Deletes the `mt-10 max-w-xl` "We do not meet to perform…" paragraph; changes the CTA label from "Find a group near you" to "Find your group". Headline and standing-orders rail stay.)

- [ ] **Step 4: Replace "How it works" with the "What this is" band**

Delete the `howItWorks` const (lines 153-169) and the whole "3 — How it works" section (lines 263-279). In `HomePage()`, change the `Promise.all` to include rhythms:

```tsx
  const [gatherings, letter, story, rhythms] = await Promise.all([
    getNextGatherings(),
    getLatestLetter(),
    getStory(),
    getMeetingRhythms(),
  ]);
```

Where the "How it works" section was (directly after the ember band), insert:

```tsx
      {/* 3 — What this is: the 5W1H band (spec §A.2) */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <Kicker left="What this is" right="Plain answers" />
          <StaggerReveal className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-5 lg:gap-8">
            <div>
              <p className="folio">Who it&rsquo;s for</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Men. Fathers, sons, new believers, worn-out saints. If you
                are a man, there is a seat.
              </p>
            </div>
            <div>
              <p className="folio">What happens</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                A weekly table. Scripture read plain. Straight talk. Prayer.
                One hour that orders the rest of the week.
              </p>
            </div>
            <div>
              <p className="folio">Why it exists</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                God did not build men to walk alone. Acts 20:28 says keep
                watch. We keep it together.
              </p>
            </div>
            <div>
              <p className="folio">When &amp; where</p>
              {rhythms.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm leading-relaxed text-muted-foreground">
                  {rhythms.map((r) => (
                    <li key={`${r.day}-${r.city}`}>
                      <span className="text-foreground">{r.day}s</span> · {r.city}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Tables gather weekly across Georgia. New ones are forming
                  now.
                </p>
              )}
            </div>
            <div>
              <p className="folio">How to start</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Pick a group. Show up once. Keep showing up. That is the
                whole program.
              </p>
              <Link
                href="/join"
                className="link-editorial mt-3 inline-block text-sm"
              >
                Start here
              </Link>
            </div>
          </StaggerReveal>
        </div>
      </section>
```

Note: `rhythms.map` renders `{r.day}s` — meetingDay values are stored as day names ("Thursday"); the trailing `s` makes "Thursdays". If a live value already ends in "s", drop the suffix logic to just `{r.day}` during verification.

- [ ] **Step 5: Kill the hover-only affordance on gatherings**

Replace the "Details →" span (lines 315-317) with an always-visible chevron:

```tsx
                      <span className="section-mark inline-flex items-center gap-1 text-muted-foreground transition-colors group-hover:text-brass">
                        Details
                        <Icon name="chevron-right" size={12} />
                      </span>
```

- [ ] **Step 6: Remove the photo strip**

Delete `getPhotoStrip()` (lines 98-125), the `type Photo` alias (line 34), the `photoEvents` entry already removed from `Promise.all` in Step 4, and the whole "6 — Past gatherings photo strip" section (lines 413-466). Remove now-unused imports if eslint flags them (`Image` stays — the Letter cover uses it; `isNull`, `lt`, `or`, `sql`, `desc` become unused only if nothing else uses them — check with eslint, remove exactly what it flags).

- [ ] **Step 7: Gates + visual verify**

Run: `npx tsc --noEmit && npm test && npx eslint "src/app/(public)/page.tsx"`
Expected: all clean.
Browser at 375px: hero = headline + one paragraph + two CTAs; band shows 5 entries with live day/city rows (prod DB has The Den/The Office/Men Build Men rows — expect real data); no photo strip; word counts within cap.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(public)/page.tsx"
git commit -m "feat(home): 5W1H restructure — one-paragraph hero, What-this-is band, live meeting rhythms"
```

---

### Task 5: Resources wayfinding — type labels, simplified cards, no section icons

**Files:**
- Modify: `src/app/(public)/resources/page.tsx` — add `sourceMime` to the item payload passed to the browser (find the `items` mapping; add `sourceMime: r.sourceMime ?? null`).
- Modify: `src/app/(public)/resources/browser.tsx` — `ItemLite`, `ResourceCard` (lines 758-908), section header (lines 379-388), pill/chip touch targets.

**Interfaces:**
- Consumes: `typeLabel`, `ResourceTypeLabel` from `@/lib/resources/type-label` (Task 1).
- Produces: card layout other tasks don't depend on.

- [ ] **Step 1: Thread `sourceMime` through**

In `browser.tsx` add to `ItemLite` (after the `provider` field, line 28):

```ts
  sourceMime: string | null;
```

`listSectionsAndResourcesForPublic()` already selects `sourceMime` (src/server/resources-admin.ts:329) — the page mapping just drops it. In `src/app/(public)/resources/page.tsx`, inside the `items.map((i) => { ... return { ... } })` object (lines 51-73), add one line after `provider,` (line 60):

```ts
        sourceMime: i.sourceMime ?? null,
```

- [ ] **Step 2: Replace provider badges with the type label in `ResourceCard`**

In `ResourceCard` (browser.tsx lines 758-908):

Add at the top of the function, after `href`:

```tsx
  const label = typeLabel({
    provider: item.provider,
    sourceMime: item.sourceMime,
    hasBody: item.hasBody,
    fileKey: item.fileKey,
  });
```

(Import at the top of the file: `import { typeLabel } from "@/lib/resources/type-label";`)

Delete the `providerBadge` IIFE (lines 774-779). Replace the "Provider + audience badges" overlay div (lines 837-852) with a single text-only type badge:

```tsx
          {/* Type label — plain English, no icons (spec §A.3) */}
          <div className="pointer-events-none absolute left-3 top-3">
            <span className="inline-flex h-6 items-center border border-foreground/15 bg-card/95 px-2 text-[0.5625rem] font-medium uppercase tracking-wider text-foreground backdrop-blur-sm">
              {label}
            </span>
          </div>
```

Delete the duration/minutes badge block (lines 853-858) and the `formatDuration` call (line 795) — duration lives on the detail page. (`formatDuration` itself, lines 747-756, becomes unused — delete it.)

Replace the pills block (lines 874-893) so a card carries at most 2 pills:

```tsx
          {(item.booksOfBible.length > 0 || item.topics.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-1">
              {item.booksOfBible.slice(0, 1).map((b) => (
                <span
                  key={`b-${b}`}
                  className="inline-flex h-5 items-center border border-brass/40 bg-brass/10 px-1.5 text-[0.5625rem] uppercase tracking-wider text-brass"
                >
                  {b}
                </span>
              ))}
              {item.topics.slice(0, 1).map((t) => (
                <span
                  key={`t-${t}`}
                  className="inline-flex h-5 items-center border border-foreground/15 bg-card px-1.5 text-[0.5625rem] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
```

Keep: thumbnail logic, YouTube play overlay (it is the universally understood "this is a video" affordance, not one of the confusing icons), author line, title, summary, `ctaLabel` row (verb CTAs stay).

- [ ] **Step 3: Kill section-header icons**

In the section header (lines 379-388), remove the `<Icon name={(section.icon as IconName) || "scroll"} …/>` element and its wrapping flex gap, leaving:

```tsx
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <h2 className="display-xl text-2xl text-foreground md:text-3xl">
                        {section.name}
                      </h2>
                      <span className="section-mark text-muted-foreground">
                        {sectionItems.length}{" "}
                        {sectionItems.length === 1 ? "item" : "items"}
                      </span>
                    </div>
```

If `IconName` is then unused in the file's imports, trim it (eslint will say).

- [ ] **Step 4: Touch targets on pills and chips**

`SectionPill` (line 463): change `px-3 py-1.5` to `min-h-[44px] px-4`. `ChipFacet` buttons (line 594): change `px-2 py-1` to `min-h-[36px] px-3` — chips sit in a wrapping cloud with gap spacing, where WCAG 2.5.8's 24px+spacing rule governs; 44px chips would double the sheet's height. The `MobileFilterSheet` trigger (line 515) and `ClusterDisclosure` buttons already exceed 44px — leave them.

- [ ] **Step 5: Gates + visual verify**

Run: `npx tsc --noEmit && npm test && npx eslint "src/app/(public)/resources/browser.tsx" "src/app/(public)/resources/page.tsx"`
Browser at 375px on `/resources`:
- Cards show one text type badge (Book on Amazon rows, Video on YouTube, Guide on body-backed studies); no scroll/play/arrow icon badges; ≤2 pills; no duration badge.
- Section headers show name + count, no icon.
- Search → pills → cards immediately; nothing pushes cards below the fold.
- Tap an Amazon-provider card: detail page still shows the book card with "Buy on Amazon" as the secondary-styled action.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/resources/browser.tsx" "src/app/(public)/resources/page.tsx"
git commit -m "feat(resources): plain type labels replace icon system; simpler cards; bigger touch targets"
```

---

### Task 6: Site-wide gates, live-fire, ship

**Files:** none new — verification and PR.

- [ ] **Step 1: Full static gates**

```bash
npx tsc --noEmit && npm test && npm run check:contrast
npx eslint src/components/public/mobile-tab-bar.tsx src/components/public/public-nav.tsx "src/app/(public)/layout.tsx" "src/app/(public)/page.tsx" "src/app/(public)/resources/browser.tsx" "src/app/(public)/resources/page.tsx" src/lib/resources/type-label.ts
```
Expected: all clean (contrast green on BOTH themes).

- [ ] **Step 2: 200% zoom check (WCAG 1.4.4, spec §A.4)**

In the browser at desktop width, set 200% text zoom on `/`, `/groups`, `/letter`, `/resources`: no clipped or overlapping content, tab bar labels intact at mobile width.

- [ ] **Step 3: Mobile walkthrough at 375px, both themes**

`/` hero → band (live rhythms render) → gatherings (chevron visible without hover) → letter signup → join CTA; tab bar on every public page; hamburger = secondary list with Join first; `/resources` cards + filters; `/bible` reader unobstructed above the bar.

- [ ] **Step 3b: Hover-only affordance sweep (spec §A.4, all public pages)**

```bash
grep -rn "opacity-0" "src/app/(public)" src/components/public src/components/letters src/components/resources | grep -i hover
```
Expected: no hits where an action or information is invisible until hover. Any hit that gates *presence* (not mere enhancement) gets the same fix as the homepage chevron: make the element always visible, keep hover as color/position enhancement only. Fix inline and include in this task's commit.

- [ ] **Step 4: PR + merge + live verify**

```bash
git push -u origin feat/phase-a-public-mobile
gh pr create --title "Phase A: mobile tab bar, 5W1H homepage, resources wayfinding" --body-file <scratchpad-file>
```
(Write the PR body to a scratchpad file first — inline `--body` with apostrophes trips the security hook.) Wait for the Vercel check to pass, `gh pr merge --squash --delete-branch`, then verify on `https://www.acts2028sheepdogsociety.com`: homepage renders the band with live data, `/resources` shows type labels, tab bar present at mobile viewport (curl for `aria-label="Primary"` in the HTML + browser screenshot), no runtime errors in Vercel logs for 10 minutes after deploy.

- [ ] **Step 5: Update docs**

Update `CLAUDE.md` Active Routes note if needed (no route changes this phase — likely nothing) and add one line to the spec's Phase A section: "Shipped in PR #NN on YYYY-MM-DD." Commit to main directly (docs-only).
