"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon, type IconName } from "@/components/icons/Icon";
import { ResourceCover } from "@/components/resources/ResourceCover";

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
  durationSeconds: number | null;
  category: string;
  sectionId: string;
  audience: "all" | "newcomer" | "leader";
  topics: string[];
  themes: string[];
  booksOfBible: string[];
  /** AI-assigned sub-group label within the section. Empty string =
   *  no cluster (renders as a single ungrouped grid). */
  cluster: string;
  estimatedMinutes: number | null;
  hasBody: boolean;
}

interface BrowserProps {
  sections: SectionLite[];
  items: ItemLite[];
}

function uniq(xs: string[]): string[] {
  return Array.from(new Set(xs.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function ResourcesBrowser({ sections, items }: BrowserProps) {
  const [query, setQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [activeTopic, setActiveTopic] = useState<string>("");
  const [activeBook, setActiveBook] = useState<string>("");
  const [activeAudience, setActiveAudience] = useState<string>("");

  const allTopics = useMemo(() => uniq(items.flatMap((i) => i.topics)), [items]);
  const allBooks = useMemo(() => uniq(items.flatMap((i) => i.booksOfBible)), [items]);
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
      {/* Hero */}
      <section className="relative overflow-hidden bg-bone text-ink">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-28">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Resources</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6rem)]">
            Take, read,
            <br />
            <span className="text-brass">use it Tuesday.</span>
          </h1>
          <p className="mt-10 max-w-2xl font-pullquote text-xl italic leading-relaxed text-iron/70 md:text-2xl">
            Studies, leader guides, devotionals, sermon notes. Search by topic, theme, or book of the Bible. Free. Bring it to your group.
          </p>
        </div>
      </section>

      {/* Search bar */}
      <section className="sticky top-16 z-20 border-b border-iron/10 bg-bone/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 md:px-12">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative flex flex-1 min-w-[220px] items-center">
              <Icon
                name="search"
                size={16}
                className="absolute left-3 text-iron/40"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, topic, theme, or book of the Bible"
                className="block h-11 w-full border border-iron/15 bg-white/60 pl-10 pr-3 text-sm text-iron placeholder:text-iron/40 focus:border-brass focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 text-iron/40 hover:text-iron"
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
                className="text-xs text-iron/55 underline-offset-4 hover:text-brass hover:underline"
              >
                Clear all
              </button>
            )}
            <span className="text-xs text-iron/55">
              {filtered.length} {filtered.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>
      </section>

      {/* Body: facets + grid */}
      <section className="bg-bone text-ink">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[260px_1fr] md:px-12 md:py-20">
          {/* Facets */}
          <aside className="space-y-8">
            <Facet
              title="Section"
              options={sections.map((s) => ({ value: s.id, label: s.name }))}
              value={activeSectionId}
              onChange={setActiveSectionId}
            />
            {allBooks.length > 0 && (
              <Facet
                title="Book of the Bible"
                options={allBooks.map((b) => ({ value: b, label: b }))}
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
              <div className="border border-dashed border-iron/15 p-16 text-center">
                <Icon name="search" size={36} className="mx-auto text-brass" />
                <h2 className="display-xl mt-6 text-2xl text-iron">
                  Nothing matches that yet.
                </h2>
                <p className="mx-auto mt-3 max-w-md font-pullquote text-base italic text-iron/60">
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
                      <div className="flex items-center gap-3">
                        <Icon
                          name={(section.icon as IconName) || "scroll"}
                          size={24}
                          className="text-brass"
                        />
                        <h2 className="display-xl text-2xl text-iron md:text-3xl">
                          {section.name}
                        </h2>
                      </div>
                      <span className="section-mark text-iron/45">
                        {sectionItems.length}{" "}
                        {sectionItems.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                    {section.description && (
                      <p className="mt-2 max-w-2xl text-sm text-iron/65">
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
                              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="border border-iron/10 bg-bone">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-iron/5 md:px-5 md:py-4"
        aria-expanded={isOpen}
      >
        <div className="flex items-baseline gap-3">
          <h3 className="display-xl text-base text-iron md:text-lg">{label}</h3>
          <span className="section-mark text-iron/40">{count}</span>
        </div>
        <Icon
          name={isOpen ? "chevron-down" : "chevron-right"}
          size={14}
          className="text-iron/45"
        />
      </button>
      {isOpen && <div className="border-t border-iron/10 px-4 pb-5 pt-2 md:px-5">{children}</div>}
    </div>
  );
}

function Facet({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="section-mark text-iron/55">{title}</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[0.625rem] uppercase tracking-wider text-iron/45 hover:text-brass"
          >
            Clear
          </button>
        )}
      </div>
      <ul className="mt-3 space-y-1">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => onChange(active ? "" : opt.value)}
                className={`block w-full px-2 py-1 text-left text-sm transition-colors ${
                  active
                    ? "bg-brass/15 text-iron"
                    : "text-iron/70 hover:bg-iron/5 hover:text-iron"
                }`}
              >
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
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

  // Provider label shown over the thumbnail; drives a small badge style.
  const providerBadge = (() => {
    if (item.provider === "youtube") return { label: "YouTube", icon: "play" as const };
    if (item.provider === "amazon") return { label: "Amazon", icon: "scroll" as const };
    if (item.provider === "web") return { label: "Link", icon: "arrow-up-right" as const };
    return null;
  })();

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

  const duration = formatDuration(item.durationSeconds);
  const hasThumbnail = !!item.thumbnailUrl;

  // For Amazon books we use a 2:3 aspect ratio (book covers); everything
  // else gets 16:9 (videos and link cards).
  const aspectClass = item.provider === "amazon" ? "aspect-[2/3]" : "aspect-video";

  return (
    <article className="lift group/card flex h-full flex-col overflow-hidden border border-iron/10 bg-bone transition-colors hover:border-brass">
      <Link href={href} className="flex flex-1 flex-col">
        {/* Thumbnail. Priority order:
         *   1. YouTube oEmbed or Amazon book cover (real cover art)
         *   2. AI-generated SVG cover for everything else (file uploads,
         *      mammoth-extracted .docx, etc.) — keyed by cluster theme
         *      with per-id pattern variation.
         */}
        <div className={`relative ${aspectClass} w-full overflow-hidden bg-iron/5`}>
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
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-iron/0 transition-colors group-hover/card:bg-iron/15">
              <div className="flex h-14 w-14 items-center justify-center bg-iron/85 text-bone shadow-lg backdrop-blur-sm transition-transform group-hover/card:scale-110">
                <Icon name="play" size={20} />
              </div>
            </div>
          )}
          {/* Provider + audience badges */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            {providerBadge ? (
              <span className="inline-flex h-6 items-center gap-1 border border-iron/20 bg-bone/95 px-2 text-[0.5625rem] font-medium uppercase tracking-wider text-iron backdrop-blur-sm">
                <Icon name={providerBadge.icon} size={10} />
                {providerBadge.label}
              </span>
            ) : (
              <span />
            )}
            {item.audience !== "all" && (
              <span className="inline-flex h-6 items-center border border-iron/20 bg-bone/95 px-2 text-[0.5625rem] uppercase tracking-wider text-iron/65 backdrop-blur-sm">
                {item.audience === "leader" ? "Leader" : "Newcomer"}
              </span>
            )}
          </div>
          {/* Duration / minutes */}
          {(duration || item.estimatedMinutes != null) && (
            <span className="pointer-events-none absolute bottom-3 right-3 inline-flex h-6 items-center bg-iron/85 px-2 text-[0.625rem] font-medium text-bone backdrop-blur-sm">
              {duration ?? `${item.estimatedMinutes} min read`}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-6">
          {item.author && (
            <p className="section-mark text-iron/55">{item.author}</p>
          )}
          <h3 className="display-xl mt-2 text-lg text-iron md:text-xl">
            {item.title}
          </h3>
          {(item.summary || item.description) && (
            <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-iron/70">
              {item.summary || item.description}
            </p>
          )}
          {(item.booksOfBible.length > 0 || item.topics.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-1">
              {item.booksOfBible.slice(0, 3).map((b) => (
                <span
                  key={`b-${b}`}
                  className="inline-flex h-5 items-center border border-brass/40 bg-brass/10 px-1.5 text-[0.5625rem] uppercase tracking-wider text-brass"
                >
                  {b}
                </span>
              ))}
              {item.topics.slice(0, 4).map((t) => (
                <span
                  key={`t-${t}`}
                  className="inline-flex h-5 items-center border border-iron/15 bg-bone px-1.5 text-[0.5625rem] text-iron/65"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="mt-6 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 section-mark text-brass">
              {ctaLabel}
              <Icon
                name="arrow-right"
                size={12}
                className="transition-transform group-hover/card:translate-x-1"
              />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
