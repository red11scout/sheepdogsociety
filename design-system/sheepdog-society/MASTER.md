# Sheepdog Society — Design System MASTER (Phase 2 elevation)

**This file is the source of truth for all Phase 2 UI work.** The brand is LOCKED — palette and fonts below are non-negotiable. The ui-ux-pro-max generator's suggestions (pink accent, Newsreader/Roboto) were rejected: this site's value is its distinctive hand-built editorial identity. What Phase 2 changes is the CRAFT, not the identity.

> When building a specific page, first check `design-system/sheepdog-society/pages/[page-name].md`. If that file exists, its rules override this Master. If not, follow this file strictly.

## Identity (locked)

**Palette — "Pasture & Iron":**

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--c-iron` | `#0E1624` | `#0E1624` | Deep surface, dark bands, footer |
| `--c-bone` | `#F2EBDD` | (surface flips via semantic tokens) | Editorial light surface |
| `--c-cream` | `#F8F2E2` | — | Raised light surface |
| `--c-ink` | `#141414` | `#EDE7DA` (as text-on-dark) | Body text |
| `--c-brass` | `#C8932A` | `#D8A93E` (warmed) | Accent, marks, CTAs |
| `--c-gold` | `#DBAA48` | `#E3B85C` | Hover accent |
| `--c-oxblood` | `#7A1E1E` | `#9C3434` | Cancelled/destructive notes |
| `--c-olive` | (existing) | warmed variant | Secondary accent |
| `--c-stone` | (existing) | warmed variant | Muted text on dark |

**Rule: no raw hex in components.** Everything flows through the semantic tokens in `globals.css` (`--background`, `--foreground`, `--color-brass`, etc.). Phase 2's dual-theme pass gives every editorial surface a true dark variant — the current "cards pinned light in dark mode" behavior is retired on public pages.

**Type (REVISED per Drew's prototype, 2026-07-08 — broadsheet-editorial system):**
- Display: **Fraunces variable** (`opsz`/`SOFT`/`WONK` axes). `.display-xl` = high optical size (`"opsz" 144, "SOFT" 30, "WONK" 1`), weight ~560, lh 1.0, tracking -0.018em. `.display-soft` (detail-page H1s) = `"opsz" 100, "SOFT" 60, "WONK" 0`, weight 500, lh 1.06. Emphasized word = `<em>` italic Fraunces in **oxblood**. (Barlow Condensed is retired from public pages.)
- Wordmark: `.brand-wordmark` = Fraunces 600, `"opsz" 40, "SOFT" 20`, tracking 0.005em.
- Drop caps: `.dropcap::first-letter` = Fraunces `"opsz" 144 "WONK" 1`, float left, oxblood, 3.4em, weight 600, lh 0.82.
- Folio/apparatus: **Inter** `.folio` = 11px / 500 / tracking 0.16em / uppercase / stone. Body = Inter 16px+, lh 1.6, measure 65–75ch.
- Scripture/pull-quotes: Cormorant Garamond italic (ember-band verse ~36px). Bible READER body (Phase 3): Merriweather ~18px / lh 1.85 / light — one serif for the Word, sans for apparatus.
- `.section-mark` (JetBrains Mono) stays for small editorial marks.

**Editorial furniture (from the prototype):**
- **Masthead**: folio topbar → masthead row (hairline — crest — Fraunces wordmark — mirrored crest (`-scale-x-100`) — hairline) → slim sticky nav (`bg-background/95 backdrop-blur`). Topbar + masthead scroll away; nav pins. Mobile: single crest + wordmark row. Crest bookends the footer (single, centered, ~40px, opacity-80).
- **Kicker rows**: folio-left — hairline(flex-1) — folio-right, opening every major section.
- **Ruled ledger** for agenda lists: `divide-y divide-foreground/10 border-y border-foreground/15`, whole-row links, `md:grid-cols-[140px_1fr_auto]`, big month/day block, hover `bg-foreground/[0.03]`.
- **`.paper-card`** for photo content: `background var(--card); border 1px solid stone; radius 0`; hover → brass border + `box-shadow: 0 1px 0 ink, 0 10px 30px -18px ink` + `.lift`; cover images `aspect-[4/3]` with `duration-500 scale-[1.03]` hover zoom; photo-count badge overlay bottom-right (`bg-foreground/85 text-background`, camera icon, uppercase).
- **`.ember-band`**: one dark interlude per long page — `#1c1610` with a warm radial ember glow from the bottom edge, folio mark in copper, Cormorant italic verse. Must have a dark-theme-consistent treatment.
- **`.link-editorial`**: underlined text links, `text-underline-offset 3px`, hover → brass.
- **`.lift`**: hover `translateY(-2px)` over `0.18s cubic-bezier(0.16,1,0.3,1)`.

**Fluid scale (Tailwind v4 `@theme` additions):**
```
--text-display-xl: clamp(2.5rem, 1.2rem + 6vw, 6rem);      /* hero */
--text-display-lg: clamp(2rem, 1.1rem + 4vw, 4rem);        /* section titles */
--text-display-md: clamp(1.5rem, 1.15rem + 1.8vw, 2.5rem); /* card titles */
--text-lede:       clamp(1.125rem, 1rem + 0.6vw, 1.375rem);/* ledes/pull-quotes */
```
Line-height 0.92–1.05 for display, tracking -0.015em (existing `.display-xl` values stay).

**Icons:** the custom ~60-glyph `Icon.tsx` set ONLY on public pages (consistency pass: stroke width 1.75, optical 16/20/24 sizes). Lucide stays admin-only. Never emoji as icons.

## Structural pattern (from ui-ux-pro-max Community/Forum Landing, adapted)

Homepage narrative (spec §1): hero (one promise, ONE CTA) → Acts 20:28 (why) → how it works (3 steps) → next gatherings strip (live series data, never empty) → latest Letter → recent-gatherings photo strip (from past events with photos; gallery itself is admin-only) → one story → final Join CTA. Community proof = real photos + real gathering cadence, not member counts.

**One primary CTA per screen: "Join" → `/join`.** Everything else is subordinate.

## Effects & motion

- Section rhythm: generous (`py-24 md:py-32` stays); hairlines + section-marks are the brand's editorial skeleton — refine, don't remove.
- Existing utilities (`.aurora`, `.dotted-grid`, `.glass-card`, `.lift`, `.spotlight`) are kept and tuned; no new effect languages.
- Motion: anime.js v4 ONLY (v3 syntax silently no-ops). 150–300ms micro, ≤450ms section reveals, ease-out enter/ease-in exit, stagger 40–60ms, transform/opacity only, every scroll-reveal wrapped in `prefers-reduced-motion` guard. 1–2 animated elements per viewport max.
- Photo treatment: uniform aspect ratios (4/3 cards, 21/9 strips), iron-tinted duotone overlay on hover, consistent radius (sharp corners are the brand — keep 0 radius on editorial cards).

## Dual-theme rules

- `next-themes` default becomes `system` (`enableSystem`, no forced default).
- EVERY public surface has a dark variant: bands that are `bg-bone` in light become deep-iron band variants in dark via semantic tokens, not per-component overrides.
- AA verified in BOTH themes: body 4.5:1, large display 3:1, brass-on-iron and brass-on-bone pairs re-checked (brass `#C8932A` on bone `#F2EBDD` fails for small text — use `--c-ink` for small text, brass only ≥18px semibold or as marks).
- Focus states: 2px brass ring, visible in both themes.

## Non-negotiable UX checks (every page task)

- 375px clean, no horizontal scroll; tap targets ≥44px; `min-h-dvh` not `100vh`
- Visible focus ring; skip-link preserved; heading hierarchy sequential
- Images: explicit dimensions or aspect-ratio (CLS < 0.1), lazy below fold
- `cursor-pointer` on clickables; hover states 150–300ms
- Jeremy voice for all copy; banned words list applies; no em-dashes where commas work
