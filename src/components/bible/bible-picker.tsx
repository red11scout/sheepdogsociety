"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import {
  BOOKS,
  booksByGenre,
  getBookBySlug,
  parseReference,
  type BibleBook,
} from "@/lib/bible/books";

interface SearchResult {
  reference: string;
  content: string;
  url: string;
}

interface BiblePickerProps {
  /** Reader mode: the pill shows the current reference. */
  current?: { bookSlug: string; chapter: number };
  /** "hero" renders the larger landing-page pill. */
  variant?: "reader" | "hero";
}

const RECENT_KEY = "sheepdog-bible-recent-searches";
const RECENT_CAP = 8;

function loadRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, RECENT_CAP)
      : [];
  } catch {
    return [];
  }
}

function saveRecent(q: string): string[] {
  const next = [q, ...loadRecent().filter((x) => x !== q)].slice(0, RECENT_CAP);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Private mode: recents just do not persist.
  }
  return next;
}

/** Wraps the first case-insensitive occurrence of the query in a brass
 *  <mark> (spec §4: "match highlighting"). Decorative wash over the
 *  popover background — no new contrast pair. */
function highlightMatch(content: string, q: string) {
  const idx = q ? content.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (idx === -1) return content;
  return (
    <>
      {content.slice(0, idx)}
      <mark className="bg-brass/25 text-inherit">{content.slice(idx, idx + q.length)}</mark>
      {content.slice(idx + q.length)}
    </>
  );
}

/**
 * The reference pill that becomes a type-ahead input and opens the
 * genre-grouped picker panel (66 books -> chapter grid). The type-ahead
 * IS the reference search (BibleProject anatomy); keyword search gets its
 * own input in the same panel, hitting /api/public/bible/search. Recent
 * keyword searches live in localStorage (cap 8). Keyboard: Escape closes
 * (focus returns to the pill), ArrowUp/ArrowDown walk the options, Enter
 * activates. Square corners on purpose — broadsheet brand over benchmark
 * chrome.
 */
export function BiblePicker({ current, variant = "reader" }: BiblePickerProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeBook, setActiveBook] = useState<BibleBook | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchState, setSearchState] = useState<
    "idle" | "loading" | "done" | "unavailable"
  >("idle");
  const [recent, setRecent] = useState<string[]>([]);

  const currentBook = current ? getBookBySlug(current.bookSlug) : undefined;
  const pillLabel =
    currentBook && current ? `${currentBook.name} ${current.chapter}` : "Find a passage";

  const parsed = useMemo(() => (query.trim() ? parseReference(query) : null), [query]);
  const bookMatches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
    if (!q) return null;
    const hits = BOOKS.filter((b) => b.name.toLowerCase().startsWith(q));
    return hits.length > 0 ? hits : null;
  }, [query]);
  const groups = useMemo(() => booksByGenre(), []);

  // localStorage is browser-only — load recents when the panel opens.
  useEffect(() => {
    if (open) setRecent(loadRecent());
  }, [open]);

  // The pill became an input — focus it.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Outside click closes.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closePanel();
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // closePanel is stable per render; the listener re-binds on open only.
  }, [open]);

  // Debounced keyword search (300ms), aborted on retype/unmount.
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setResults(null);
      setSearchState("idle");
      return;
    }
    setSearchState("loading");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/public/bible/search?q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        if (res.status === 503) {
          setResults(null);
          setSearchState("unavailable");
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
        setSearchState("done");
        setRecent(saveRecent(q));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults(null);
          setSearchState("unavailable");
        }
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  function closePanel() {
    setOpen(false);
    setQuery("");
    setActiveBook(null);
    setSearchQuery("");
    setResults(null);
    setSearchState("idle");
  }

  function go(url: string) {
    closePanel();
    router.push(url);
  }

  function onRootKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      closePanel();
      // The pill re-renders after close — focus it on the next tick.
      setTimeout(() => pillRef.current?.focus(), 0);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const options = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>("[data-picker-option]") ?? []
    );
    if (options.length === 0) return;
    e.preventDefault();
    const idx = options.indexOf(document.activeElement as HTMLElement);
    const nextIdx =
      e.key === "ArrowDown" ? Math.min(idx + 1, options.length - 1) : idx <= 0 ? -1 : idx - 1;
    if (nextIdx === -1) inputRef.current?.focus();
    else options[nextIdx]?.focus();
  }

  function bookButton(b: BibleBook) {
    return (
      <button
        key={b.slug}
        type="button"
        data-picker-option
        onClick={() => {
          setActiveBook(b);
          setQuery("");
        }}
        className="flex h-11 cursor-pointer items-center justify-between px-3 text-left text-sm transition-colors hover:bg-foreground/5 hover:text-brass"
      >
        <span>{b.name}</span>
        <span className="text-xs text-muted-foreground">{b.chapters}</span>
      </button>
    );
  }

  return (
    <div
      ref={rootRef}
      onKeyDown={onRootKeyDown}
      className="relative w-full min-w-0 max-w-xl"
    >
      {!open ? (
        <button
          ref={pillRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={false}
          className={
            variant === "hero"
              ? "flex h-12 w-full cursor-pointer items-center justify-between gap-3 border border-foreground/25 bg-card px-5 text-base text-muted-foreground transition-colors hover:border-brass"
              : "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 border border-foreground/25 bg-card px-6 text-sm font-medium transition-colors hover:border-brass"
          }
        >
          <span>{variant === "hero" ? "Type a book and a chapter" : pillLabel}</span>
          <Icon
            name={variant === "hero" ? "search" : "chevron-down"}
            size={14}
            className="shrink-0 text-foreground/50"
          />
        </button>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveBook(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && parsed) {
              e.preventDefault();
              go(
                `/bible/${parsed.book.slug}/${parsed.chapter}${parsed.verse ? `#v${parsed.verse}` : ""}`
              );
            }
          }}
          placeholder="Type a book and a chapter"
          aria-label="Go to a book and chapter"
          className={`w-full border border-brass bg-background px-4 placeholder:text-muted-foreground focus:border-brass focus-visible:outline-none ${
            variant === "hero" ? "h-12 text-base" : "h-11 text-sm"
          }`}
        />
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Find a passage"
          className="absolute left-1/2 top-full z-40 mt-2 max-h-[70vh] w-[min(92vw,40rem)] -translate-x-1/2 overflow-y-auto border border-foreground/15 bg-popover p-4 text-popover-foreground shadow-xl"
        >
          {/* Go-to row — the type-ahead IS the reference search. */}
          {parsed && (
            <button
              type="button"
              data-picker-option
              onClick={() =>
                go(
                  `/bible/${parsed.book.slug}/${parsed.chapter}${parsed.verse ? `#v${parsed.verse}` : ""}`
                )
              }
              className="mb-4 flex w-full cursor-pointer items-center justify-between border border-brass/50 bg-brass/10 px-4 py-3 text-left text-sm transition-colors hover:bg-brass/20"
            >
              <span>
                Go to{" "}
                <strong>
                  {parsed.book.name} {parsed.chapter}
                  {parsed.verse ? `:${parsed.verse}` : ""}
                </strong>
              </span>
              <Icon name="arrow-right" size={14} />
            </button>
          )}

          {activeBook ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  data-picker-option
                  onClick={() => setActiveBook(null)}
                  className="folio cursor-pointer py-2 transition-colors hover:text-brass"
                >
                  ← All books
                </button>
                <span className="text-sm font-medium">{activeBook.name}</span>
              </div>
              <div className="mt-3 grid grid-cols-6 gap-1 sm:grid-cols-8">
                {Array.from({ length: activeBook.chapters }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    data-picker-option
                    onClick={() => go(`/bible/${activeBook.slug}/${n}`)}
                    className="flex h-11 cursor-pointer items-center justify-center text-sm transition-colors hover:bg-foreground/5 hover:text-brass"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {bookMatches ? (
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {bookMatches.map((b) => bookButton(b))}
                </div>
              ) : (
                groups.map(({ genre, books }) => (
                  <div key={genre} className="mt-4 first:mt-0">
                    <p className="folio">{genre}</p>
                    <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
                      {books.map((b) => bookButton(b))}
                    </div>
                  </div>
                ))
              )}

              {/* Keyword search — its own input in the same panel. */}
              <div className="mt-6 border-t border-foreground/10 pt-4">
                <label htmlFor="bible-keyword-search" className="folio">
                  Search the Scriptures
                </label>
                <input
                  id="bible-keyword-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="A word or phrase, e.g. shepherd"
                  className="mt-2 h-11 w-full border border-foreground/25 bg-background px-4 text-sm placeholder:text-muted-foreground focus:border-brass focus-visible:outline-none"
                />

                {searchState === "loading" && (
                  <p className="mt-3 text-sm text-muted-foreground">Searching…</p>
                )}
                {searchState === "unavailable" && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Search is down right now. You can still open any book and
                    chapter above.
                  </p>
                )}
                {searchState === "done" && results && results.length === 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No verses matched. Try another word.
                  </p>
                )}
                {results && results.length > 0 && (
                  <ul className="mt-3 divide-y divide-foreground/10 border-y border-foreground/15">
                    {results.map((r) => (
                      <li key={`${r.url}-${r.reference}`}>
                        <button
                          type="button"
                          data-picker-option
                          onClick={() => go(r.url)}
                          className="block w-full cursor-pointer px-2 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
                        >
                          <span className="folio">{r.reference}</span>
                          <span className="mt-1 block text-sm leading-relaxed">
                            {highlightMatch(r.content, searchQuery.trim())}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {searchState === "idle" && recent.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">Recent</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recent.map((q) => (
                        <button
                          key={q}
                          type="button"
                          data-picker-option
                          onClick={() => setSearchQuery(q)}
                          className="cursor-pointer border border-foreground/15 px-3 py-1.5 text-xs transition-colors hover:border-brass hover:text-brass"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
