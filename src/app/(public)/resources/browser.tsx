"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/icons/Icon";
import { ResourceCover } from "@/components/resources/ResourceCover";
import { BOOKS, parseReference } from "@/lib/bible/books";

interface SectionLite {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

interface ItemLite {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  url: string;
  fileKey: string;
  type: string;
  /** youtube / amazon / web / file (or null for legacy rows) */
  provider: "youtube" | "amazon" | "web" | "file" | null;
  thumbnailUrl: string | null;
  /** Channel name (YouTube), author (Amazon), site name (web), or null. */
  author: string | null;
  category: string;
  sectionId: string;
  audience: "all" | "newcomer" | "leader";
  topics: string[];
  themes: string[];
  booksOfBible: string[];
  /** AI-assigned sub-group label within the section. Empty string =
   *  no cluster (renders as a single ungrouped grid). */
  cluster: string;
  hasBody: boolean;
}

interface BrowserProps {
  sections: SectionLite[];
  items: ItemLite[];
}

function uniq(xs: string[]): string[] {
  return Array.from(new Set(xs.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

// Canonical Bible ordering for the "Book of the Bible" facet. BOOKS is in
// canon order; the first 39 are the Old Testament, the rest the New.
const OT_COUNT = 39;
const SLUG_INDEX = new Map(BOOKS.map((b, i) => [b.slug, i]));

/**
 * Rank a book tag by its canonical position. Resolves real-world tag
 * variants — "Psalm 112", "Deuteronomy 32", "1 Corinthians 16", "Song Of
 * Solomon" — to their base book via the tested reference parser, so
 * chapter-suffixed and singular/plural forms all sort beside their book.
 * Unrecognized tags fall to the end.
 */
function bookRank(tag: string): { idx: number; testament: "ot" | "nt" | "other" } {
  const parsed = parseReference(tag);
  const idx = parsed ? SLUG_INDEX.get(parsed.book.slug) : undefined;
  if (idx === undefined) return { idx: Number.MAX_SAFE_INTEGER, testament: "other" };
  return { idx, testament: idx < OT_COUNT ? "ot" : "nt" };
}

/** Dedupe + sort book tags into canonical (not alphabetical) order. */
function orderBooks(xs: string[]): string[] {
  const rankOf = (t: string) => bookRank(t);
  return Array.from(new Set(xs.filter(Boolean))).sort((a, b) => {
    const ra = rankOf(a);
    const rb = rankOf(b);
    const testOrder = { ot: 0, nt: 1, other: 2 } as const;
    if (testOrder[ra.testament] !== testOrder[rb.testament]) {
      return testOrder[ra.testament] - testOrder[rb.testament];
    }
    if (ra.idx !== rb.idx) return ra.idx - rb.idx;
    return a.localeCompare(b); // ties (base book vs chapter-suffixed)
  });
}

/**
 * Group ordered book tags into Testament sections with non-clickable
 * heading rows, for the desktop facet list.
 */
function bookFacetOptions(
  ordered: string[]
): { value: string; label: string; heading?: boolean }[] {
  const out: { value: string; label: string; heading?: boolean }[] = [];
  let lastTestament: "ot" | "nt" | "other" | null = null;
  for (const tag of ordered) {
    const t = bookRank(tag).testament;
    if (t !== lastTestament) {
      if (t === "ot") out.push({ value: "__ot", label: "Old Testament", heading: true });
      else if (t === "nt") out.push({ value: "__nt", label: "New Testament", heading: true });
      lastTestament = t;
    }
    out.push({ value: tag, label: tag });
  }
  return out;
}

export function ResourcesBrowser({ sections, items }: BrowserProps) {
  const [query, setQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [activeTopic, setActiveTopic] = useState<string>("");
  const [activeBook, setActiveBook] = useState<string>("");
  const [activeAudience, setActiveAudience] = useState<string>("");

  const allTopics = useMemo(() => uniq(items.flatMap((i) => i.topics)), [items]);
  const allBooks = useMemo(() => orderBooks(items.flatMap((i) => i.booksOfBible)), [items]);
  const bookOptions = useMemo(() => bookFacetOptions(allBooks), [allBooks]);
  const allAudiences = useMemo(() => uniq(items.map((i) => i.audience)), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (activeSectionId && it.sectionId !== activeSectionId) {
        // also accept legacy category-slug match if sectionId not set on the item
        const section = sections.find((s) => s.id === activeSectionId);
        if (!(section && it.category === section.slug)) return false;
      }
      if (activeTopic && !it.topics.includes(activeTopic)) return false;
      if (activeBook && !it.booksOfBible.includes(activeBook)) return false;
      if (activeAudience && it.audience !== activeAudience) return false;
      if (q) {
        const hay = (
          it.title +
          " " +
          it.summary +
          " " +
          it.description +
          " " +
          it.topics.join(" ") +
          " " +
          it.themes.join(" ") +
          " " +
          it.booksOfBible.join(" ")
        ).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, query, activeSectionId, activeTopic, activeBook, activeAudience, sections]);

  const grouped = useMemo(() => {
    const map: Record<string, ItemLite[]> = {};
    for (const it of filtered) {
      const key =
        sections.find(
          (s) => s.id === it.sectionId || s.slug === it.category
        )?.id ?? "_none";
      map[key] = map[key] ?? [];
      map[key].push(it);
    }
    return map;
  }, [filtered, sections]);

  const sectionsWithItems = sections.filter(
    (s) => (grouped[s.id]?.length ?? 0) > 0
  );

  const anyFilter =
    query || activeSectionId || activeTopic || activeBook || activeAudience;

  function clearFilters() {
    setQuery("");
    setActiveSectionId("");
    setActiveTopic("");
    setActiveBook("");
    setActiveAudience("");
  }

  return (
    <>
      {/* Hero — tighter padding on mobile so the search bar reaches the
       *  viewport quickly. The whole point of /resources is "find a thing
       *  fast"; a 60% viewport-height hero gets in the way. */}
      <section className="relative overflow-hidden bg-background text-foreground">
        {/* Decorative texture is desktop-only — mobile stays plain
            (Drew, 2026-07-09: streamline the mobile resources surface). */}
        <div className="aurora aurora--soft hidden md:block" aria-hidden />
        <div className="dotted-grid absolute inset-0 hidden opacity-50 md:block" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-10 md:px-12 md:py-28">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Resources</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-5 max-w-4xl text-[clamp(2rem,7vw,6rem)] md:mt-10">
            Take, read,
            <br />
            <span className="text-brass-deep">use it Tuesday.</span>
          </h1>
          <p className="mt-5 max-w-2xl font-pullquote text-base italic leading-relaxed text-muted-foreground md:mt-10 md:text-2xl">
            Studies, leader guides, devotionals, sermon notes. Search by topic, theme, or book of the Bible. Free. Bring it to your group.
          </p>
        </div>
      </section>

      {/* Search bar + mobile-only section pill rail.
       *
       *  Mobile nav strategy: the desktop sidebar with 4 stacked facets
       *  (Section + Book + Topic + Audience) used to render ABOVE the
       *  results on phones, pushing the actual cards 800+px down. On
       *  mobile we hide that sidebar entirely (see below: `hidden
       *  md:block`) and instead surface ONE horizontally-scrollable rail
       *  of section pills here — that's the primary navigation move 99%
       *  of mobile users make. The remaining facets are tucked behind
       *  the MobileFilterSheet disclosure below the search. */}
      <section className="sticky top-[61px] z-20 border-b border-foreground/10 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-3 md:px-12 md:py-4">
          <div className="flex items-center gap-3">
            <label className="relative flex flex-1 items-center">
              {/* Placeholder text carries the affordance; no magnifier
                  glyph (Drew, 2026-07-09: icons in resources distract). */}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search resources..."
                className="block h-11 w-full border border-foreground/15 bg-foreground/[0.04] pl-4 pr-9 text-sm text-foreground placeholder:text-foreground/50 focus:border-brass focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Clear"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </label>
            {anyFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="hidden text-xs text-muted-foreground underline-offset-4 hover:text-brass hover:underline sm:inline-flex"
              >
                Clear all
              </button>
            )}
            <span className="hidden text-xs text-muted-foreground sm:inline-flex">
              {filtered.length} {filtered.length === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Mobile-only section pills. Horizontal scroll if they overflow.
           *  Tapping a pill drives the same activeSectionId state as the
           *  desktop sidebar facet. */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
            <SectionPill
              label="All"
              active={!activeSectionId}
              onClick={() => setActiveSectionId("")}
            />
            {sections.map((s) => (
              <SectionPill
                key={s.id}
                label={s.name}
                active={activeSectionId === s.id}
                onClick={() => setActiveSectionId(s.id)}
              />
            ))}
          </div>

          {/* Mobile-only "More filters" disclosure for Book/Topic/Audience.
           *  Closed by default so it doesn't crowd the search row. */}
          {(allBooks.length > 0 || allTopics.length > 0 || allAudiences.length > 1) && (
            <MobileFilterSheet
              allBooks={allBooks}
              allTopics={allTopics}
              allAudiences={allAudiences}
              activeBook={activeBook}
              activeTopic={activeTopic}
              activeAudience={activeAudience}
              onBook={setActiveBook}
              onTopic={setActiveTopic}
              onAudience={setActiveAudience}
              count={filtered.length}
              onClearAll={anyFilter ? clearFilters : undefined}
            />
          )}
        </div>
      </section>

      {/* Body: facets + grid */}
      <section className="bg-background text-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-8 md:grid-cols-[260px_1fr] md:px-12 md:py-20">
          {/* Facets — desktop only. Mobile uses the pill rail + sheet above. */}
          <aside className="hidden space-y-8 md:block">
            <Facet
              title="Section"
              options={sections.map((s) => ({ value: s.id, label: s.name }))}
              value={activeSectionId}
              onChange={setActiveSectionId}
              defaultOpen
            />
            {allBooks.length > 0 && (
              <Facet
                title="Book of the Bible"
                options={bookOptions}
                value={activeBook}
                onChange={setActiveBook}
              />
            )}
            {allTopics.length > 0 && (
              <Facet
                title="Topic"
                options={allTopics.map((t) => ({ value: t, label: t }))}
                value={activeTopic}
                onChange={setActiveTopic}
              />
            )}
            {allAudiences.length > 1 && (
              <Facet
                title="For"
                options={allAudiences.map((a) => ({
                  value: a,
                  label:
                    a === "newcomer"
                      ? "Newcomers"
                      : a === "leader"
                      ? "Leaders"
                      : "Anyone",
                }))}
                value={activeAudience}
                onChange={setActiveAudience}
              />
            )}
          </aside>

          {/* Results */}
          <div className="min-w-0">
            {filtered.length === 0 ? (
              <div className="border border-dashed border-foreground/15 p-16 text-center">
                <h2 className="display-xl text-2xl text-foreground">
                  Nothing matches that yet.
                </h2>
                <p className="mx-auto mt-3 max-w-md font-pullquote text-base italic text-muted-foreground">
                  Adjust the filters or clear them. New material is added regularly.
                </p>
              </div>
            ) : (
              sectionsWithItems.map((section) => {
                const sectionItems = grouped[section.id] ?? [];

                // Sub-group by AI cluster within the section. If no row has
                // a cluster set, fall back to a single ungrouped grid (the
                // legacy render). Once any row has a cluster, we render
                // each cluster as its own labelled mini-section so a
                // 56-row section reads as a navigable mini-TOC.
                const clusters = new Map<string, ItemLite[]>();
                let anyClustered = false;
                for (const it of sectionItems) {
                  const key = it.cluster?.trim() || "";
                  if (key) anyClustered = true;
                  if (!clusters.has(key)) clusters.set(key, []);
                  clusters.get(key)!.push(it);
                }
                // Stable cluster order: by name; "" (unclustered) goes last.
                const clusterOrder = Array.from(clusters.keys()).sort((a, b) => {
                  if (a === "") return 1;
                  if (b === "") return -1;
                  return a.localeCompare(b);
                });

                return (
                  <div key={section.id} className="mb-16 last:mb-0">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <h2 className="display-xl text-2xl text-foreground md:text-3xl">
                        {section.name}
                      </h2>
                      <span className="section-mark text-muted-foreground">
                        {sectionItems.length}{" "}
                        {sectionItems.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                    {section.description && (
                      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        {section.description}
                      </p>
                    )}
                    <div className="hairline mt-6" />

                    {anyClustered ? (
                      <div className="mt-6 space-y-3">
                        {clusterOrder.map((clusterLabel) => {
                          const items = clusters.get(clusterLabel) ?? [];
                          if (items.length === 0) return null;
                          return (
                            <ClusterDisclosure
                              key={`${section.id}:${clusterLabel || "_unclustered"}`}
                              label={clusterLabel || "Other"}
                              count={items.length}
                              // When the user is searching/filtering, force
                              // every cluster open so matches aren't hidden.
                              // Otherwise default to closed — the whole point
                              // of clusters is a navigable mini-TOC, not a
                              // wall of cards.
                              forceOpen={!!anyFilter}
                            >
                              <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                                {items.map((item) => (
                                  <li key={item.id}>
                                    <ResourceCard item={item} />
                                  </li>
                                ))}
                              </ul>
                            </ClusterDisclosure>
                          );
                        })}
                      </div>
                    ) : (
                      <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                        {sectionItems.map((item) => (
                          <li key={item.id}>
                            <ResourceCard item={item} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Mobile-only horizontal pill in the section rail. Tappable, with an
 * active treatment that matches the brass brand accent.
 */
function SectionPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "shrink-0 whitespace-nowrap border min-h-[44px] px-4 text-xs uppercase tracking-wider transition-colors " +
        (active
          ? "border-brass bg-brass text-iron"
          : "border-foreground/15 bg-card text-muted-foreground hover:border-brass hover:text-brass")
      }
    >
      {label}
    </button>
  );
}

/**
 * Mobile-only collapsible filter sheet for Book/Topic/Audience. These
 * facets used to stack above the results on phones, pushing real
 * content hundreds of pixels down. Now they sit behind a single
 * "Filters" button below the search bar; tapping it reveals a compact
 * panel with chips for each option. Closed by default to keep the
 * top-of-page focused on the search input + section pills.
 */
function MobileFilterSheet({
  allBooks,
  allTopics,
  allAudiences,
  activeBook,
  activeTopic,
  activeAudience,
  onBook,
  onTopic,
  onAudience,
  count,
  onClearAll,
}: {
  allBooks: string[];
  allTopics: string[];
  allAudiences: string[];
  activeBook: string;
  activeTopic: string;
  activeAudience: string;
  onBook: (v: string) => void;
  onTopic: (v: string) => void;
  onAudience: (v: string) => void;
  count: number;
  onClearAll?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = [activeBook, activeTopic, activeAudience].filter(Boolean).length;
  return (
    <div className="mt-2 md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-[44px] items-center justify-between gap-3 border border-foreground/15 bg-foreground/[0.04] px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-brass hover:text-brass"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          More filters
          {activeCount > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center bg-brass px-1 text-[0.5625rem] font-semibold text-iron">
              {activeCount}
            </span>
          )}
        </span>
        {/* No glyphs here (Drew, 2026-07-09): the count + tap-to-toggle
            row reads cleaner without a magnifier or chevron. */}
        <span className="normal-case tracking-normal text-muted-foreground">
          {count} items
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-4 border border-foreground/15 bg-card p-3">
          {allBooks.length > 0 && (
            <ChipFacet title="Book of the Bible" options={allBooks} value={activeBook} onChange={onBook} />
          )}
          {allTopics.length > 0 && (
            <ChipFacet title="Topic" options={allTopics} value={activeTopic} onChange={onTopic} />
          )}
          {allAudiences.length > 1 && (
            <ChipFacet
              title="For"
              options={allAudiences}
              value={activeAudience}
              onChange={onAudience}
              labelFor={(a) =>
                a === "newcomer" ? "Newcomers" : a === "leader" ? "Leaders" : "Anyone"
              }
            />
          )}
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-brass hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Chip-style facet for the mobile filter sheet. Wraps if the option
 * count is large (40+ topics across Bible Studies, for example) and
 * stays tappable.
 */
function ChipFacet({
  title,
  options,
  value,
  onChange,
  labelFor,
}: {
  title: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  labelFor?: (v: string) => string;
}) {
  return (
    <div>
      <p className="mb-2 section-mark text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(active ? "" : opt)}
              className={
                "border min-h-[36px] px-3 text-[0.6875rem] uppercase tracking-wider transition-colors " +
                (active
                  ? "border-brass bg-brass text-iron"
                  : "border-foreground/15 bg-card text-muted-foreground hover:border-brass hover:text-brass")
              }
            >
              {labelFor ? labelFor(opt) : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Collapsible cluster heading with item count + chevron. Closed by
 * default so the section reads as a navigable mini-TOC instead of
 * a wall of cards (especially important on mobile, where 56 cards in
 * one scroll is brutal). When the user searches or filters, the
 * parent passes forceOpen so matches don't get hidden.
 */
function ClusterDisclosure({
  label,
  count,
  forceOpen,
  children,
}: {
  label: string;
  count: number;
  forceOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  return (
    <div className="border border-foreground/15 bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/5 md:px-5 md:py-4"
        aria-expanded={isOpen}
      >
        <div className="flex items-baseline gap-3">
          <h3 className="display-xl text-base text-foreground md:text-lg">{label}</h3>
          <span className="section-mark text-muted-foreground">{count}</span>
        </div>
        {/* Plain word instead of a chevron glyph (Drew, 2026-07-09). */}
        <span className="section-mark text-muted-foreground">
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>
      {isOpen && <div className="border-t border-foreground/10 px-4 pb-5 pt-2 md:px-5">{children}</div>}
    </div>
  );
}

/**
 * Collapsible filter group. The header toggles the option list open and
 * closed so a long sidebar (66 books, 90+ topics) reads as a tidy stack
 * of headers instead of an endless scroll. Opens automatically when it
 * carries an active filter; a Clear control sits outside the toggle so
 * it stays reachable while collapsed. Long open lists scroll internally.
 */
function Facet({
  title,
  options,
  value,
  onChange,
  defaultOpen = false,
}: {
  title: string;
  options: { value: string; label: string; heading?: boolean }[];
  value: string;
  onChange: (v: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || Boolean(value));
  const count = options.filter((o) => !o.heading).length;
  return (
    <div className="border-b border-foreground/10 pb-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 py-1 text-left"
        >
          <span className="section-mark text-muted-foreground">{title}</span>
          <span className="text-[0.625rem] tabular-nums text-muted-foreground/60">
            {count}
          </span>
          {value && !open && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
          )}
          {/* Plain word instead of a chevron glyph (Drew, 2026-07-09). */}
          <span className="ml-auto text-[0.625rem] uppercase tracking-wider text-muted-foreground/60">
            {open ? "Hide" : "Show"}
          </span>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 text-[0.625rem] uppercase tracking-wider text-muted-foreground hover:text-brass"
          >
            Clear
          </button>
        )}
      </div>
      {open && (
        <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto pr-1">
          {options.map((opt) => {
            if (opt.heading) {
              return (
                <li
                  key={opt.value}
                  className="px-2 pb-1 pt-3 text-[0.625rem] uppercase tracking-wider text-brass first:pt-0"
                >
                  {opt.label}
                </li>
              );
            }
            const active = value === opt.value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => onChange(active ? "" : opt.value)}
                  className={`block w-full px-2 py-1 text-left text-sm transition-colors ${
                    active
                      ? "bg-brass/15 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ResourceCard({ item }: { item: ItemLite }) {
  // Always navigate to the public detail page so we get the embed/book/link
  // card layout, then admin/companion section. The legacy "open file
  // directly" behavior happens on the detail page via the action bar.
  const href = `/resources/${item.slug}`;

  // For file-backed rows (uploaded studies/guides) we render a
  // deterministic SVG cover instead of a real thumbnail. AI photos
  // looked nearly identical across 56 rows; the SVG approach gives
  // each card real per-id variation while keeping a unified palette.
  // YouTube + Amazon thumbnails win when present (real cover art).
  const useGeneratedCover =
    !item.thumbnailUrl ||
    (item.provider !== "youtube" && item.provider !== "amazon");

  // Primary action label depends on what's behind the card.
  const ctaLabel =
    item.provider === "youtube"
      ? "Watch"
      : item.provider === "amazon"
      ? "View book"
      : item.provider === "web"
      ? "Open"
      : item.hasBody
      ? "Read"
      : item.fileKey
      ? "Download"
      : "Open";

  const hasThumbnail = !!item.thumbnailUrl;

  // For Amazon books we use a 2:3 aspect ratio (book covers); everything
  // else gets 16:9 (videos and link cards).
  const aspectClass = item.provider === "amazon" ? "aspect-[2/3]" : "aspect-video";

  return (
    <article className="lift group/card flex h-full flex-col overflow-hidden border border-foreground/15 bg-card transition-colors hover:border-brass">
      <Link href={href} className="flex flex-1 flex-col">
        {/* Thumbnail — DESKTOP ONLY (Drew, 2026-07-09: mobile users hate
         *  the image-heavy interface; phones get clean text rows).
         *  Desktop priority order:
         *   1. YouTube oEmbed or Amazon book cover (real cover art)
         *   2. AI-generated SVG cover for everything else — keyed by
         *      cluster theme with per-id pattern variation.
         */}
        <div className={`relative ${aspectClass} hidden w-full overflow-hidden bg-foreground/5 md:block`}>
          {!useGeneratedCover && hasThumbnail ? (
            <Image
              src={item.thumbnailUrl!}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover/card:scale-[1.03]"
              unoptimized
            />
          ) : (
            <ResourceCover
              id={item.id}
              title={item.title}
              cluster={item.cluster}
              className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover/card:scale-[1.03]"
            />
          )}
          {/* YouTube play overlay */}
          {item.provider === "youtube" && hasThumbnail && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors group-hover/card:bg-foreground/15">
              <div className="flex h-14 w-14 items-center justify-center bg-foreground/85 text-background shadow-lg backdrop-blur-sm transition-transform group-hover/card:scale-110">
                <Icon name="play" size={20} />
              </div>
            </div>
          )}
          {/* No badges over the artwork (Drew, 2026-07-09 live review):
              overlays read as clutter. The CTA verb below carries the
              type — Watch / Read / View book / Open / Download. */}
        </div>

        {/* Body — compact text row on mobile, full card body on desktop */}
        <div className="flex flex-1 flex-col p-4 md:p-6">
          {item.author && (
            <p className="section-mark text-muted-foreground">{item.author}</p>
          )}
          <h3 className="display-xl mt-1 text-base text-foreground md:mt-2 md:text-xl">
            {item.title}
          </h3>
          {(item.summary || item.description) && (
            <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground md:mt-3 md:line-clamp-3">
              {item.summary || item.description}
            </p>
          )}
          {(item.booksOfBible.length > 0 || item.topics.length > 0) && (
            <div className="mt-4 hidden flex-wrap gap-1 md:flex">
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
          <div className="mt-3 flex items-center justify-between md:mt-6">
            <span className="section-mark text-brass">{ctaLabel}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
