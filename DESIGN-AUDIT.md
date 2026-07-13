# Design Audit — "The Night Watch" elevation

Branch: `design/night-watch` (forked from `main` @ 239bd03)
Date: 2026-07-13
Scope: visual elevation of the public site. Zero content/route/copy/meta changes.

---

## 0. Headline finding — reconcile the brief with reality

The brief assumes a site that is "earthly and dull," with anonymous type and
possibly no dark mode. **That premise is out of date.** A full broadsheet
elevation already shipped (the "Pasture & Iron" system, 2026-07-08). The
foundation the brief asks me to *build* mostly already **exists**:

| Brief asks for | Already present? | Where |
| --- | --- | --- |
| Fraunces display type + italic character | ✅ Yes (opsz/SOFT/WONK axes) | `globals.css:389-425`, loaded `layout.tsx:29-34` |
| Dark mode | ✅ Yes (`next-themes`, `.dark` class) | `theme-provider.tsx`, `globals.css:110-214` |
| Theme toggle in header | ✅ Yes (desktop topbar + mobile) | `public-nav.tsx:151,279`, `theme-toggle.tsx` |
| Deep-night dark canvas + warm gold accent | ✅ Yes — iron `#0E1624` blue-black + brass `#C8932A`/gold | `globals.css:97-122` |
| Monospace eyebrow "stamped brass plate" labels | ✅ Yes (`.section-mark`, `.folio`, JetBrains Mono) | `globals.css:369-436` |
| Scroll-reveal system | ✅ Yes (`Reveal`, `StaggerReveal`, anime.js v4) | `src/components/motion/` |
| Scripture ticker / marquee | ✅ Yes (`ScriptureMarquee`) | `public-footer.tsx:14`, `globals.css:301-322` |
| Ambient radial glow, spotlight, lift | ✅ Yes (`.aurora`, `.spotlight`, `.lift`) | `globals.css:260-620` |

**The existing dark mode already _is_ the Night Watch** — a blue-black iron
canvas lit by brass/gold, with a near-black "ember band" interlude behind the
Acts 20:28 verse. The thesis is sound; it's just not yet dramatized.

### What is genuinely missing (the real "wow" gap)

1. **A signature moment.** There is no living flame. Nothing on the page
   *moves like light*. This is the one bold thing to add.
2. **Text illumination.** The italic `<em>` words ("brothers.", "Sit in
   it.") are static oxblood. No gold-leaf shimmer.
3. **Hero entrance choreography** on first paint.
4. **Verse illumination on scroll** (the ember band is static).
5. **Material atmosphere** (optional film grain).
6. **Micro-polish** — warm glow on button hover, flame-styled toggle.

### The one open brand decision (see §7)

The brief specifies a **cool "First Light"** light mode and exact new hexes,
explicitly rejecting warm cream. The current light mode is **warm parchment**
(`oklch(0.96 0.012 80)`) with brass accents. Whether to re-pitch the light
palette cooler — or keep the existing brand and layer additively — is a
brand-level call with real coupling to the contrast gate + Design Studio, so
it is flagged for the user rather than decided unilaterally.

---

## 1. Framework & styling

- **Next.js 16** (App Router, Turbopack) + TypeScript strict. React 19.
- **Tailwind v4**, single stylesheet `src/app/globals.css` (807 lines). No
  `tailwind.config.*`. PostCSS at `postcss.config.mjs`.
- Tokens are two-layered:
  - `@theme inline {}` (`globals.css:7-84`) maps Tailwind utilities to vars.
  - Brand `--c-*` **hex constants** in plain `:root` (`globals.css:97-109`),
    flipped in `.dark` (`globals.css:110-122`).
  - shadcn semantic tokens are `oklch()` — light `:root` (`142-177`), dark
    `.dark` (`180-214`).
- "Furniture" is Tailwind v4 `@utility` (cascade-safe): `section-mark`,
  `display-xl`, `display-soft`, `brand-wordmark`, `folio`, `dropcap`,
  `paper-card`, `ember-band`, `link-editorial`, `scripture-body`, verse-*.

## 2. Dark mode

- `next-themes` `attribute="class"`, `defaultTheme="system"`, `enableSystem`,
  `disableTransitionOnChange` (`layout.tsx:96-101`, `theme-provider.tsx`).
- Dark tokens live under `.dark {}` (class strategy, not media query).
- `.admin-shell` overrides are out of scope (dashboard only).

## 3. Fonts (all `next/font/google`, `layout.tsx:2-47`)

Inter → `--font-sans`; Merriweather → `--font-scripture`; **Fraunces
(variable)** → `--font-display`; Cormorant → `--font-pullquote`; JetBrains
Mono → `--font-mono`/`--font-mark`. Vars applied on `<body>` (`layout.tsx:94`).
No new fonts needed.

## 4. Homepage section inventory (`src/app/(public)/page.tsx`)

Rendered in Studio-config order via `renderMerge("home", config)`
(`page.tsx:466-474`) — order is NOT hardcoded. Sections:

- `hero` (161-218): `display-xl` H1 = `home.hero.headline1` + `<em>{headline2}</em>`
  ("Find your brothers."), dropcap lede, "Find your group" button + Letter
  link, right rail **Standing orders** I/II/III (`standingOrders` const 144-148).
- `verse` (219-233): `.ember-band`, `§ Acts 20:28`, `font-pullquote` blockquote.
- `what-this-is` (234-288): `StaggerReveal` 5-col grid (Who/What/Why/When&where/How).
- `gatherings` (289-345): live DB feed list.
- `letter` (346-418): `Reveal` + `paper-card lift`, `LetterCover` fallback.
- `story` (419-442): conditional pull-quote.
- `join-cta` (443-463): `display-xl` headline `home.join.headline1/2`
  ("There is a chair. Sit in it."), CTA button.

**Copy is 100% site-text or DB driven — no hardcoded copy to touch.**

## 5. Shared chrome

- Header: `src/components/public/public-nav.tsx` (3-row broadsheet masthead;
  sticky nav row already `bg-background/85 backdrop-blur`, line 183).
- Footer: `src/components/public/public-footer.tsx` (hosts `ScriptureMarquee`).
- Mobile bottom tab bar: `src/components/public/mobile-tab-bar.tsx` (`lg:hidden`).

## 6. Motion infra

- `Reveal.tsx`, `StaggerReveal.tsx` — **anime.js v4** (already a dependency;
  the brief's "no new animation libraries" is honored — I add none, and the
  new flame/shimmer/grain are pure CSS with no JS loop).
- `ScriptureMarquee.tsx` (CSS `.marquee`), `Spotlight.tsx`, `Magnetic.tsx`,
  `CountUp.tsx`. All CSS primitives have `prefers-reduced-motion` guards.

## 7. Contrast gate + Design Studio coupling (the two hard constraints)

- **`scripts/check-contrast.mjs`** parses top-level `:root`/`.dark` from
  globals.css AND overlays the 4 non-identity Studio themes from
  `src/lib/studio/themes-data.mjs`, re-checking ~10 token pairs in **both
  modes × 5 themes**. Any change to a *checked* token must pass everywhere.
- **Design Studio** injects `--c-*` + shadcn vars via a `<style>` block in
  `src/app/(public)/layout.tsx` (only place; never root layout), anchored on
  `body:has([data-site-theme])`. Non-identity themes override the same var
  names at higher specificity. `--c-iron` is theme-constant by contract.

**Consequence for this work → additive tokens only.** I will ADD `--flame`,
`--flame-bright`, `--glow` (mapped onto the existing brass/gold family) and
touch **no existing `--c-*` or oklch value**. New tokens aren't in the gate's
checked pairs, so the gate stays green and all 5 Studio themes stay intact.

## 8. Fragility

- 95 hardcoded hex in `src/{components,app}` — but 80 are in generative-cover
  SVG art (`LetterCover.tsx` 44, `ResourceCover.tsx` 36) and OG renderers;
  intentional, not token bypass. **Not touching them.**
- Inline `style=`: exactly one (`mobile-tab-bar.tsx:30`, safe-area inset).
  Homepage/nav/footer have zero inline styles.
- Literal hex in `.ember-band` (`#1c1610/#efe7d5/#c9834a`) is checked by the
  gate — leave as-is.

## 9. Files I WILL touch (additive)

- `src/app/globals.css` — new tokens + new utility classes (flame glow,
  shimmer, grain, entrance keyframes). Append-only; no edits to existing rules.
- `src/components/motion/LampFlame.tsx` — **new** signature component.
- `src/app/(public)/page.tsx` — mount `<LampFlame>` in hero + 7-flame echo on
  Letter card; wrap `<em>` words for shimmer. No copy/logic/data changes.
- Possibly `src/components/public/public-nav.tsx` / `theme-toggle.tsx` — flame
  glow micro-polish only (preserve all props/behavior).

## Files I will NOT touch

Root `layout.tsx` (theme provider + fonts), `(public)/layout.tsx` (Studio
injection), `themes-data.mjs`, `check-contrast.mjs`, every existing `--c-*`
and oklch value, all generative-cover components, all copy/site-text/routes/meta.

---

## After (screenshots)

_Filled in during Phase QA — hero in light/desktop, dark/desktop, light/mobile,
dark/mobile._
