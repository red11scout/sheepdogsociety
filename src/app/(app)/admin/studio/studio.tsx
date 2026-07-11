"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons/Icon";
import { HintTooltip } from "@/components/admin/HintTooltip";
import { renderMerge, type StudioConfig } from "@/lib/studio/config";
import { SECTION_REGISTRY } from "@/lib/studio/sections";
import { THEMES } from "@/lib/studio/themes";
import {
  applyDraft,
  discardDraft,
  listVersions,
  restoreVersion,
  saveDraftConfig,
  saveDraftText,
} from "@/server/studio";
import { cn } from "@/lib/utils";

/** pasture-iron's record in themes-data is empty by contract (identity theme,
 *  emits no override block), so its picker swatches are a small hardcoded
 *  copy of today's globals.css base values. */
const PASTURE_IRON_SWATCH: Record<string, string> = {
  "--background": "oklch(0.96 0.012 80)",
  "--c-brass": "#C8932A",
  "--foreground": "oklch(0.18 0.022 260)",
  "--c-oxblood": "#7A1E1E",
};

const SWATCH_KEYS = ["--background", "--c-brass", "--foreground", "--c-oxblood"] as const;

type TextEntry = {
  key: string;
  label: string;
  multiline: boolean;
  defaultValue: string;
  stored: string | null;
  draftValue: string | null;
};

type Version = { id: number; summary: string; createdAt: string };

type StatusMsg = { msg: string; ok: boolean };

const STUCK_CARDS: { title: string; body: string }[] = [
  {
    title: "I made a change and the site does not show it",
    body: "Changes live in your draft until you hit Apply. Check the preview here, then Apply when it looks right.",
  },
  {
    title: "I do not like where my draft ended up",
    body: "Hit Discard. It throws away the draft and leaves the live site alone.",
  },
  {
    title: "I applied something and regret it",
    body: "Open Versions, find the one from before the change, and Restore it. Then Apply to put it back live.",
  },
  {
    title: "The preview looks broken",
    body: "Stop the preview, then start it again. That resets the preview cookie in this browser.",
  },
  {
    title: "What do the themes look like?",
    body: "Tap one. The preview recolors right away. Nothing goes live until Apply.",
  },
  {
    title: "Why can't I move or hide some things?",
    body: "Scripture, the hero, and anything fed by live content stay put. Fonts and the ember bands are fixed too. That is by design, not a fault.",
  },
  {
    title: "The site shows a Draft ribbon",
    body: "You are in preview on this browser. Stop preview returns it to the live site. Everyone else always sees the live site.",
  },
];

const WALKTHROUGH_STEPS = [
  "Pick a theme. The preview recolors right away.",
  "Show, hide, or move a homepage section.",
  "Tap a line of text and change the words.",
  "Happy with the preview? Hit Apply. A snapshot is saved so you can undo.",
];

export function Studio({
  initialDraft,
  published,
  initialVersions,
  pages,
  entriesByGroup,
  draftEnabled,
}: {
  initialDraft: StudioConfig;
  published: StudioConfig;
  initialVersions: Version[];
  pages: { id: string; label: string; path: string }[];
  entriesByGroup: Record<string, TextEntry[]>;
  draftEnabled: boolean;
}) {
  const [config, setConfig] = useState<StudioConfig>(initialDraft);
  const [selectedPage, setSelectedPage] = useState(pages[0].id);
  const pageMeta = pages.find((p) => p.id === selectedPage) ?? pages[0];
  const pageEntries = entriesByGroup[selectedPage] ?? [];
  const allEntries = Object.values(entriesByGroup).flat();
  const [texts, setTexts] = useState<Record<string, { stored: string | null; draftValue: string | null }>>(
    Object.fromEntries(allEntries.map((e) => [e.key, { stored: e.stored, draftValue: e.draftValue }]))
  );
  const [versions, setVersions] = useState<Version[]>(initialVersions);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState("");
  const [status, setStatus] = useState<StatusMsg | null>(null);
  const [pending, startTransition] = useTransition();

  // Preview controls
  const [device, setDevice] = useState<"mobile" | "desktop">("desktop");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [compare, setCompare] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showVersions, setShowVersions] = useState(false);
  const draftFrame = useRef<HTMLIFrameElement>(null);
  const liveFrame = useRef<HTMLIFrameElement>(null);
  const syncing = useRef(false);

  const refreshPreview = () => setIframeKey((k) => k + 1);

  function fail(msg?: string) {
    setStatus({ msg: msg ?? "Could not save. Try again.", ok: false });
  }

  // ---------- Theme ----------
  function pickTheme(themeId: string) {
    const next = { ...config, themeId };
    setConfig(next);
    startTransition(async () => {
      const res = await saveDraftConfig(next);
      if (res.ok) {
        setStatus({ msg: "Theme saved to your draft.", ok: true });
        refreshPreview();
      } else fail(res.error);
    });
  }

  // ---------- Sections ----------
  const merged = renderMerge(selectedPage, config);
  const registry = SECTION_REGISTRY[selectedPage];
  const defOf = (id: string) => registry.sections.find((s) => s.id === id);

  /** Persist a new unlocked-order/visibility array for the selected page. */
  function saveSections(sections: { id: string; visible: boolean }[]) {
    const next: StudioConfig = { ...config, pages: { ...config.pages, [selectedPage]: { sections } } };
    setConfig(next);
    startTransition(async () => {
      const res = await saveDraftConfig(next);
      if (res.ok) {
        setStatus({ msg: "Layout saved to your draft.", ok: true });
        refreshPreview();
      } else fail(res.error);
    });
  }

  /** The config array names unlocked ids in draft order. */
  const unlockedRows = merged.filter((r) => !r.locked);

  function toggleSection(id: string) {
    saveSections(unlockedRows.map((r) => (r.id === id ? { id: r.id, visible: !r.visible } : { id: r.id, visible: r.visible })));
  }

  function moveSection(id: string, dir: -1 | 1) {
    const arr = unlockedRows.map((r) => ({ id: r.id, visible: r.visible }));
    const i = arr.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    saveSections(arr);
  }

  // ---------- Text ----------
  function currentText(e: TextEntry) {
    const t = texts[e.key];
    if (t?.draftValue != null) return t.draftValue.trim() === "" ? e.defaultValue : t.draftValue;
    if (t?.stored && t.stored.trim() !== "") return t.stored;
    return e.defaultValue;
  }

  function chipFor(e: TextEntry): "Original" | "Edited" | "Draft" {
    const t = texts[e.key];
    if (t?.draftValue != null) return "Draft";
    if (t?.stored && t.stored.trim() !== "") return "Edited";
    return "Original";
  }

  function openField(e: TextEntry) {
    setOpenKey(e.key);
    setFieldDraft(currentText(e));
    setStatus(null);
  }

  function saveField(e: TextEntry) {
    startTransition(async () => {
      const res = await saveDraftText(e.key, fieldDraft);
      if (res.ok) {
        setTexts((t) => ({ ...t, [e.key]: { ...t[e.key], draftValue: fieldDraft } }));
        setOpenKey(null);
        setStatus({ msg: "Words saved to your draft.", ok: true });
        refreshPreview();
      } else fail(res.error);
    });
  }

  // ---------- Apply / Discard / Restore ----------
  function onApply() {
    if (!window.confirm("This puts your draft on the live site. A snapshot is saved so you can undo.")) return;
    startTransition(async () => {
      const res = await applyDraft();
      if (res.ok) {
        setTexts((t) =>
          Object.fromEntries(
            Object.entries(t).map(([k, v]) => [
              k,
              v.draftValue != null
                ? { stored: v.draftValue.trim() === "" ? null : v.draftValue, draftValue: null }
                : v,
            ])
          )
        );
        setStatus({ msg: res.summary ? `Live. ${res.summary}` : "Live.", ok: true });
        setVersions(await listVersions());
        refreshPreview();
      } else fail(res.error);
    });
  }

  function onDiscard() {
    if (!window.confirm("This throws away your draft. The live site is not touched.")) return;
    startTransition(async () => {
      const res = await discardDraft();
      if (res.ok) {
        setConfig(published);
        // Re-derive from the restored (published) config, not the frozen
        // mount-time value — otherwise a dismissed walkthrough can silently
        // reappear (or a shown one silently vanish) after Discard.
        setWalkthroughGone(!!published.walkthroughDismissed);
        setTexts((t) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, { ...v, draftValue: null }])));
        setOpenKey(null);
        setStatus({ msg: "Draft discarded. You are back to what is live.", ok: true });
        refreshPreview();
      } else fail(res.error);
    });
  }

  function onRestore(id: number) {
    if (!window.confirm("This loads the old version into your draft. Your unsaved draft changes go away.")) return;
    startTransition(async () => {
      const res = await restoreVersion(id);
      if (res.ok) {
        if (res.note) window.alert(res.note);
        // The restore rewrote the draft server-side; reload to pick it up clean.
        window.location.reload();
      } else fail(res.error);
    });
  }

  // ---------- Walkthrough ----------
  const [walkthroughGone, setWalkthroughGone] = useState(!!config.walkthroughDismissed);
  function dismissWalkthrough() {
    setWalkthroughGone(true);
    const next = { ...config, walkthroughDismissed: true };
    setConfig(next);
    startTransition(async () => {
      await saveDraftConfig(next);
    });
  }

  // ---------- Compare scroll sync ----------
  useEffect(() => {
    if (!compare || !draftEnabled) return;
    const frames = [draftFrame.current, liveFrame.current];
    const cleanups: (() => void)[] = [];
    frames.forEach((frame, idx) => {
      const other = frames[1 - idx];
      if (!frame || !other) return;
      const attach = () => {
        try {
          const win = frame.contentWindow;
          const otherWin = other.contentWindow;
          if (!win || !otherWin) return;
          const onScroll = () => {
            if (syncing.current) {
              syncing.current = false;
              return;
            }
            const doc = win.document.documentElement;
            const otherDoc = otherWin.document.documentElement;
            const max = doc.scrollHeight - doc.clientHeight;
            const otherMax = otherDoc.scrollHeight - otherDoc.clientHeight;
            if (max <= 0 || otherMax <= 0) return;
            syncing.current = true;
            otherWin.scrollTo(0, (win.scrollY / max) * otherMax);
          };
          win.addEventListener("scroll", onScroll, { passive: true });
          cleanups.push(() => {
            try {
              win.removeEventListener("scroll", onScroll);
            } catch {
              /* frame gone */
            }
          });
        } catch {
          /* not same-origin-ready yet; skip */
        }
      };
      frame.addEventListener("load", attach);
      attach();
      cleanups.push(() => frame.removeEventListener("load", attach));
    });
    return () => cleanups.forEach((fn) => fn());
  }, [compare, draftEnabled, iframeKey, device, mode]);

  const frameWidth = device === "mobile" ? 375 : 1280;
  const draftSrc = `${pageMeta.path}?studio-mode=${mode}`;
  const liveSrc = `${pageMeta.path}?studio=published&studio-mode=${mode}`;

  const toolbarBtn = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center px-3 text-xs transition-colors",
      active ? "bg-brass/20 text-bone" : "text-stone/70 hover:text-bone"
    );

  return (
    <div className="space-y-8">
      {/* First-run walkthrough */}
      {!walkthroughGone && (
        <div className="border border-brass/30 bg-brass/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <p className="section-mark text-brass">First time here? Four steps.</p>
            <button
              type="button"
              onClick={dismissWalkthrough}
              className="inline-flex min-h-11 items-center px-2 text-xs text-stone/70 hover:text-bone"
            >
              Got it, hide this
            </button>
          </div>
          <ol className="mt-2 grid gap-2 text-sm leading-relaxed text-stone/85 md:grid-cols-4">
            {WALKTHROUGH_STEPS.map((s, i) => (
              <li key={s} className="flex gap-2">
                <span className="font-medium text-brass">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {status && (
        <p className={cn("text-sm", status.ok ? "text-olive" : "text-oxblood")}>{status.msg}</p>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* ---------- Left rail: controls ---------- */}
        <div className="min-w-0 space-y-10">
          {/* Page selector */}
          <div>
            <label className="folio" htmlFor="studio-page-select">Page</label>
            <select
              id="studio-page-select"
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="mt-3 h-11 w-full border border-foreground/20 bg-transparent px-4 text-sm text-foreground focus:border-brass focus:outline-none"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id} className="bg-background text-foreground">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Theme picker */}
          <section>
            <div className="flex items-center gap-2">
              <p className="section-mark text-brass">§ Theme</p>
              <HintTooltip hint="One tap recolors the whole public site in your draft. The ember bands and cover art keep their fixed colors, and every theme is designed to sit well beside them." />
            </div>
            <div className="mt-4 grid gap-2">
              {THEMES.map((t) => {
                const swatchSource = t.id === "pasture-iron" ? PASTURE_IRON_SWATCH : t.light;
                const active = config.themeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={pending}
                    onClick={() => pickTheme(t.id)}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-4 border px-4 py-3 text-left transition-colors",
                      active ? "border-brass bg-brass/10" : "border-stone/20 hover:border-stone/40"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-bone">{t.name}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-stone/70">{t.blurb}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {SWATCH_KEYS.map((k) => (
                        <span
                          key={k}
                          className="h-4 w-4 rounded-full border border-stone/30"
                          style={{ backgroundColor: swatchSource[k] ?? swatchSource["--primary"] }}
                          aria-hidden
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Sections */}
          <section>
            <div className="flex items-center gap-2">
              <p className="section-mark text-brass">§ {pageMeta.label} sections</p>
              <HintTooltip hint="Show, hide, or reorder the pieces of this page. Greyed rows are fixed: Scripture, the hero, and anything fed by live content stays where it is." />
            </div>
            <ul className="mt-4 divide-y divide-stone/10 border-y border-stone/15">
              {merged.map((row) => {
                const def = defOf(row.id);
                const unlockedIdx = unlockedRows.findIndex((r) => r.id === row.id);
                return (
                  <li
                    key={row.id}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-3 px-2 py-2",
                      row.locked && "opacity-50"
                    )}
                  >
                    <span className="min-w-0">
                      <span className={cn("block text-sm", row.visible ? "text-bone" : "text-stone/60 line-through")}>
                        {def?.label ?? row.id}
                      </span>
                      <span className="block text-xs text-stone/60">
                        {row.locked ? def?.hint ?? "Fixed in place." : def?.hint}
                      </span>
                    </span>
                    {!row.locked && (
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={pending || unlockedIdx <= 0}
                          onClick={() => moveSection(row.id, -1)}
                          aria-label={`Move ${def?.label ?? row.id} up`}
                          className="inline-flex h-11 w-11 items-center justify-center text-stone/70 transition-colors hover:text-bone disabled:opacity-30"
                        >
                          <Icon name="chevron-down" size={16} className="rotate-180" />
                        </button>
                        <button
                          type="button"
                          disabled={pending || unlockedIdx === unlockedRows.length - 1}
                          onClick={() => moveSection(row.id, 1)}
                          aria-label={`Move ${def?.label ?? row.id} down`}
                          className="inline-flex h-11 w-11 items-center justify-center text-stone/70 transition-colors hover:text-bone disabled:opacity-30"
                        >
                          <Icon name="chevron-down" size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => toggleSection(row.id)}
                          className="inline-flex h-11 min-w-14 items-center justify-center border border-stone/25 px-2 text-xs transition-colors hover:border-stone/50"
                        >
                          {row.visible ? "Hide" : "Show"}
                        </button>
                      </span>
                    )}
                    {row.locked && <span className="section-mark shrink-0 text-[10px] text-stone/40">Fixed</span>}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Text fields */}
          <section>
            <div className="flex items-center gap-2">
              <p className="section-mark text-brass">§ {pageMeta.label} words</p>
              <HintTooltip hint="Tap a line, change the words, save. It lands in your draft and shows in the preview. Apply puts it live." />
            </div>
            <ul className="mt-4 divide-y divide-stone/10 border-y border-stone/15">
              {pageEntries.map((e) => {
                const isOpen = openKey === e.key;
                const chip = chipFor(e);
                return (
                  <li key={e.key} className="py-1">
                    {isOpen ? (
                      <div className="px-2 py-3">
                        <p className="text-sm font-medium text-bone">{e.label}</p>
                        {e.multiline ? (
                          <textarea
                            className="mt-2 w-full border border-stone/25 bg-transparent p-3 text-sm leading-relaxed"
                            rows={4}
                            value={fieldDraft}
                            maxLength={2000}
                            onChange={(ev) => setFieldDraft(ev.target.value)}
                          />
                        ) : (
                          <input
                            className="mt-2 h-11 w-full border border-stone/25 bg-transparent px-3 text-sm"
                            value={fieldDraft}
                            maxLength={2000}
                            onChange={(ev) => setFieldDraft(ev.target.value)}
                          />
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => saveField(e)}
                            className="lift inline-flex h-11 items-center border border-bone bg-bone px-5 text-sm font-medium text-iron disabled:opacity-50"
                          >
                            Save to draft
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenKey(null)}
                            className="inline-flex h-11 items-center px-3 text-sm text-stone/70"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openField(e)}
                        className="flex min-h-11 w-full items-start justify-between gap-4 px-2 py-3 text-left transition-colors hover:bg-iron/40"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-bone">{e.label}</span>
                          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-stone/70">
                            {currentText(e)}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "section-mark shrink-0 pt-1 text-[10px]",
                            chip === "Draft" ? "text-brass" : "text-stone/50"
                          )}
                        >
                          {chip}
                        </span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Apply / Discard / Versions */}
          <section className="space-y-3 border-t border-stone/15 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={onApply}
                className="lift inline-flex h-11 items-center gap-2 border border-bone bg-bone px-6 text-sm font-medium text-iron disabled:opacity-50"
              >
                <Icon name="check" size={14} />
                Apply
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onDiscard}
                className="inline-flex h-11 items-center border border-stone/30 px-4 text-sm text-stone/85 disabled:opacity-40"
              >
                Discard draft
              </button>
              <button
                type="button"
                onClick={() => setShowVersions((v) => !v)}
                className="inline-flex h-11 items-center gap-2 px-3 text-sm text-stone/70 hover:text-bone"
              >
                <Icon name="clipboard" size={14} />
                Versions {showVersions ? "▴" : "▾"}
              </button>
            </div>
            {showVersions && (
              <div className="border border-stone/20">
                {versions.length === 0 ? (
                  <p className="p-4 text-sm text-stone/70">
                    No versions yet. Your first Apply saves one, plus a snapshot of the site as it stood before.
                  </p>
                ) : (
                  <ul className="divide-y divide-stone/10">
                    {versions.map((v, i) => (
                      <li key={v.id} className="flex min-h-11 items-center justify-between gap-4 px-4 py-3">
                        <span className="min-w-0">
                          <span className="block text-sm text-bone">
                            {v.summary}
                            {i === 0 && <span className="section-mark ml-2 text-[10px] text-brass">Current</span>}
                          </span>
                          <span className="block text-xs text-stone/60">
                            {new Date(v.createdAt).toLocaleString()}
                          </span>
                        </span>
                        {i !== 0 && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onRestore(v.id)}
                            className="inline-flex h-11 shrink-0 items-center border border-stone/30 px-4 text-sm disabled:opacity-40"
                          >
                            Restore
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Stuck? panel */}
          <section>
            <p className="section-mark text-brass">§ Stuck?</p>
            <div className="mt-4 grid gap-2">
              {STUCK_CARDS.map((c) => (
                <details key={c.title} className="border border-stone/20 px-4 py-2">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-bone">
                    {c.title}
                  </summary>
                  <p className="pb-3 text-sm leading-relaxed text-stone/80">{c.body}</p>
                </details>
              ))}
              <p className="mt-1 text-xs leading-relaxed text-stone/50">
                One more thing worth knowing: there is one shared draft. If two admins work here at once, the last
                save wins. Same goes for the Site text page, which writes to the same words.
              </p>
            </div>
          </section>
        </div>

        {/* ---------- Preview pane ---------- */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border border-b-0 border-stone/20 bg-iron/40 px-3 py-1">
            <span className="section-mark text-[10px] text-stone/50">Preview</span>
            <span className="flex items-center">
              <button type="button" className={toolbarBtn(device === "mobile")} onClick={() => setDevice("mobile")}>
                Phone
              </button>
              <button type="button" className={toolbarBtn(device === "desktop")} onClick={() => setDevice("desktop")}>
                Desktop
              </button>
            </span>
            <span className="flex items-center">
              <button type="button" className={toolbarBtn(mode === "light")} onClick={() => setMode("light")}>
                Light
              </button>
              <button type="button" className={toolbarBtn(mode === "dark")} onClick={() => setMode("dark")}>
                Dark
              </button>
            </span>
            <button type="button" className={toolbarBtn(compare)} onClick={() => setCompare((c) => !c)}>
              Compare
            </button>
            <button type="button" className={toolbarBtn(false)} onClick={refreshPreview}>
              Refresh
            </button>
            <a href={draftSrc} target="_blank" rel="noreferrer" className={toolbarBtn(false)}>
              Open in tab
            </a>
            {draftEnabled ? (
              <a href="/api/admin/studio/preview?off=1" className={cn(toolbarBtn(false), "text-oxblood/90")}>
                Stop preview
              </a>
            ) : (
              <a href="/api/admin/studio/preview" className={toolbarBtn(false)}>
                Start preview
              </a>
            )}
          </div>

          {draftEnabled ? (
            <div className="overflow-x-auto border border-stone/20 bg-stone/5 p-4">
              <div className={cn("flex gap-4", compare ? "items-start" : "justify-center")}>
                <div className="shrink-0" style={{ width: compare ? undefined : frameWidth, maxWidth: "100%" }}>
                  <p className="section-mark pb-1 text-[10px] text-brass">Draft</p>
                  <iframe
                    key={`draft-${iframeKey}-${device}-${mode}`}
                    ref={draftFrame}
                    src={draftSrc}
                    title="Draft preview"
                    style={{ width: frameWidth }}
                    className="h-[70vh] max-w-full border border-stone/25 bg-white"
                  />
                </div>
                {compare && (
                  <div className="shrink-0">
                    <p className="section-mark pb-1 text-[10px] text-stone/60">Live</p>
                    <iframe
                      key={`live-${iframeKey}-${device}-${mode}`}
                      ref={liveFrame}
                      src={liveSrc}
                      title="Live site"
                      style={{ width: frameWidth }}
                      className="h-[70vh] max-w-full border border-stone/25 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 border border-stone/20 bg-stone/5 p-12 text-center">
              <p className="max-w-md text-sm leading-relaxed text-stone/80">
                The preview shows your draft on the real site, in this browser only. Start it to see your changes
                before anyone else does.
              </p>
              <a
                href="/api/admin/studio/preview"
                className="lift inline-flex h-11 items-center gap-2 border border-bone bg-bone px-6 text-sm font-medium text-iron"
              >
                <Icon name="eye" size={14} />
                Start preview
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
