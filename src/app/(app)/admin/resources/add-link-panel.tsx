"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/icons/Icon";
import { HintTooltip } from "@/components/admin/HintTooltip";
import { createLinkResource } from "@/server/resources-link";
import type { EnrichedLink } from "@/lib/resources/enrich";
import { cn } from "@/lib/utils";

interface AddLinkPanelProps {
  sectionId: string;
  sectionSlug: string;
  sectionName: string;
  /** "sermon" → single-URL flow (YouTube/web link).
   *  "book"   → two URLs: the book's purchase page + a companion study (URL or upload). */
  mode: "sermon" | "book";
  onSaved: () => void;
}

interface BookCompanion {
  url: string;
  fileKey: string;
  label: string;
}

export function AddLinkPanel({
  sectionId,
  sectionSlug,
  sectionName,
  mode,
  onSaved,
}: AddLinkPanelProps) {
  const [primaryUrl, setPrimaryUrl] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState("");
  const [enriched, setEnriched] = useState<EnrichedLink | null>(null);

  // Editable post-enrich fields
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Book-mode companion
  const [companion, setCompanion] = useState<BookCompanion>({
    url: "",
    fileKey: "",
    label: "",
  });
  const [companionEnriching, setCompanionEnriching] = useState(false);
  const [companionEnriched, setCompanionEnriched] = useState<EnrichedLink | null>(null);
  const [companionUploading, setCompanionUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function fetchEnrich(url: string): Promise<EnrichedLink | null> {
    const res = await fetch("/api/admin/resources/enrich-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
      throw new Error(j.detail ?? j.error ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as { enriched: EnrichedLink };
    return data.enriched;
  }

  async function handleEnrichPrimary() {
    if (!primaryUrl.trim()) return;
    setEnriching(true);
    setEnrichError("");
    try {
      const e = await fetchEnrich(primaryUrl.trim());
      if (e) {
        setEnriched(e);
        setTitle(e.title);
        setSummary(e.description);
      }
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : "Enrich failed");
    } finally {
      setEnriching(false);
    }
  }

  async function handleEnrichCompanion() {
    if (!companion.url.trim()) return;
    setCompanionEnriching(true);
    try {
      const e = await fetchEnrich(companion.url.trim());
      if (e) {
        setCompanionEnriched(e);
        if (!companion.label) {
          setCompanion((c) => ({ ...c, label: e.title }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCompanionEnriching(false);
    }
  }

  async function handleCompanionUpload(file: File) {
    setCompanionUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", `resources/${sectionSlug}/companions`);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Upload failed");
      }
      const data = (await res.json()) as { url: string };
      setCompanion((c) => ({ ...c, fileKey: data.url, label: c.label || file.name }));
    } catch (err) {
      console.error(err);
    } finally {
      setCompanionUploading(false);
    }
  }

  function reset() {
    setPrimaryUrl("");
    setEnriched(null);
    setEnrichError("");
    setTitle("");
    setSummary("");
    setAdminNotes("");
    setCompanion({ url: "", fileKey: "", label: "" });
    setCompanionEnriched(null);
    setSaveError("");
  }

  async function handleSave() {
    if (!enriched || !title.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      await createLinkResource({
        sectionId,
        url: enriched.url,
        provider: enriched.provider,
        title: title.trim(),
        summary: summary.trim() || undefined,
        thumbnailUrl: enriched.thumbnailUrl,
        author: enriched.author,
        embedHtml: enriched.embedHtml,
        durationSeconds: enriched.durationSeconds,
        adminNotes: adminNotes.trim() || undefined,
        companionUrl: mode === "book" && companion.url ? companion.url : undefined,
        companionFileKey:
          mode === "book" && companion.fileKey ? companion.fileKey : undefined,
        companionLabel:
          mode === "book" && companion.label ? companion.label : undefined,
      });
      reset();
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const primaryLabel = mode === "book" ? "Book purchase URL (Amazon, etc.)" : "Sermon URL (YouTube, etc.)";
  const primaryPlaceholder =
    mode === "book"
      ? "https://www.amazon.com/dp/..."
      : "https://www.youtube.com/watch?v=...";

  return (
    <div className="border border-stone/15 bg-iron/30">
      <div className="flex flex-wrap items-center gap-3 border-b border-stone/15 px-5 py-3">
        <Icon name={mode === "book" ? "scroll" : "lamp"} size={14} className="text-brass" />
        <span className="section-mark text-bone">
          § {mode === "book" ? "Add a book + study" : "Add from link"}
        </span>
        <HintTooltip
          hint={
            mode === "book"
              ? "Paste the book's Amazon URL, then add a companion study (link, file, or both). Claude pulls the title, author, cover, and writes a summary plus topical tags."
              : "Paste a YouTube or web URL. Claude pulls the title, channel/site, thumbnail, and writes a summary plus topical tags. Embeds the player on the public page."
          }
        />
        <span className="ml-auto text-xs text-stone/55">{sectionName}</span>
      </div>

      <div className="space-y-4 p-5">
        {/* STEP 1 — paste primary URL */}
        {!enriched && (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
                {primaryLabel}
              </span>
              <div className="flex items-center gap-2">
                <input
                  value={primaryUrl}
                  onChange={(e) => setPrimaryUrl(e.target.value)}
                  placeholder={primaryPlaceholder}
                  className="block h-10 flex-1 border border-stone/20 bg-transparent px-3 text-sm text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleEnrichPrimary}
                  disabled={!primaryUrl.trim() || enriching}
                  className="lift inline-flex h-10 items-center gap-2 bg-brass px-4 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-gold disabled:opacity-60"
                >
                  {enriching ? "Reading..." : "Fetch"}
                  {!enriching && <Icon name="sparkles" size={12} />}
                </button>
              </div>
            </label>
            {enrichError && (
              <p className="border border-oxblood/40 bg-oxblood/15 px-3 py-2 text-xs text-bone">
                Couldn&rsquo;t enrich the URL: {enrichError}. You can still paste manually below.
              </p>
            )}
          </div>
        )}

        {/* STEP 2 — review + edit + (book mode) add companion */}
        {enriched && (
          <div className="space-y-5">
            {/* Preview card */}
            <div className="grid gap-3 border border-stone/15 bg-iron/40 p-4 md:grid-cols-[140px_1fr]">
              <div className="relative aspect-video w-full overflow-hidden bg-iron/60 md:aspect-[3/4]">
                {enriched.thumbnailUrl ? (
                  <Image
                    src={enriched.thumbnailUrl}
                    alt=""
                    fill
                    sizes="140px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-stone/35">
                    <Icon name="image" size={28} />
                  </div>
                )}
              </div>
              <div className="text-xs">
                <p className="section-mark text-stone/55">{enriched.provider}</p>
                <p className="mt-1 truncate text-sm text-bone">
                  <a
                    href={enriched.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-brass"
                  >
                    {enriched.url}
                  </a>
                </p>
                {enriched.author && (
                  <p className="mt-1 text-stone/65">
                    {mode === "book" ? "Author" : "Channel / Site"}: {enriched.author}
                  </p>
                )}
                {enriched.embedHtml && (
                  <p className="mt-1 text-olive">✓ Embed available</p>
                )}
              </div>
            </div>

            {/* Editable fields */}
            <label className="block">
              <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
                Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block h-9 w-full border border-stone/20 bg-transparent px-3 text-sm text-bone focus:border-brass focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
                Summary{" "}
                <span className="text-stone/40">
                  (Claude will rewrite if blank — keep what you like)
                </span>
              </span>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder="A few sentences on what this is about, who it's for."
                className="block w-full resize-none border border-stone/20 bg-transparent px-3 py-2 text-sm text-bone focus:border-brass focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
                Admin notes{" "}
                <span className="text-stone/40">(never shown publicly)</span>
              </span>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Recommended by Pastor Jim. Pair with the Romans series."
                className="block w-full resize-none border border-stone/20 bg-transparent px-3 py-2 text-sm text-bone focus:border-brass focus:outline-none"
              />
            </label>

            {/* Book-mode: companion study */}
            {mode === "book" && (
              <div className="border-t border-stone/15 pt-4">
                <div className="flex items-center gap-3">
                  <span className="section-mark text-brass">§ Companion study</span>
                  <HintTooltip hint="The study guide that goes with this book. Can be another Amazon book, a website, an uploaded PDF/.docx, or all three." />
                  <div className="hairline flex-1" />
                </div>
                <p className="mt-2 text-[0.6875rem] text-stone/55">
                  Add a link, upload a file, or both. Whichever the admin clicks on the public page wins.
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
                      Companion URL
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        value={companion.url}
                        onChange={(e) =>
                          setCompanion((c) => ({ ...c, url: e.target.value }))
                        }
                        placeholder="https://..."
                        className="block h-9 flex-1 border border-stone/20 bg-transparent px-3 text-sm text-bone focus:border-brass focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleEnrichCompanion}
                        disabled={!companion.url.trim() || companionEnriching}
                        className="inline-flex h-9 items-center gap-1.5 border border-brass/40 bg-brass/10 px-3 text-[0.6875rem] uppercase tracking-wider text-brass transition-colors hover:bg-brass/20 disabled:opacity-60"
                      >
                        {companionEnriching ? "..." : "Fetch"}
                      </button>
                    </div>
                    {companionEnriched && (
                      <p className="mt-1 text-[0.625rem] text-olive">
                        ✓ {companionEnriched.title}
                      </p>
                    )}
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
                      Or upload a file
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleCompanionUpload(f);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={companionUploading}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 border border-dashed border-stone/30 bg-iron/40 px-3 text-xs text-stone/75 transition-colors hover:border-brass hover:text-brass disabled:opacity-60"
                      >
                        <Icon name="download" size={12} className="rotate-180" />
                        {companionUploading
                          ? "Uploading..."
                          : companion.fileKey
                          ? "Replace file"
                          : "Upload .pdf or .docx"}
                      </button>
                    </div>
                    {companion.fileKey && (
                      <p className="mt-1 truncate text-[0.625rem] text-olive">
                        ✓ Uploaded
                      </p>
                    )}
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
                    Companion label{" "}
                    <span className="text-stone/40">(what to call it on the page)</span>
                  </span>
                  <input
                    value={companion.label}
                    onChange={(e) =>
                      setCompanion((c) => ({ ...c, label: e.target.value }))
                    }
                    placeholder="e.g. Study Guide, Discussion Questions, Workbook"
                    className="block h-9 w-full border border-stone/20 bg-transparent px-3 text-sm text-bone focus:border-brass focus:outline-none"
                  />
                </label>
              </div>
            )}

            {saveError && (
              <p className="border border-oxblood/40 bg-oxblood/15 px-3 py-2 text-xs text-bone">
                {saveError}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone/15 pt-4">
              <button
                type="button"
                onClick={reset}
                className="text-xs text-stone/65 underline-offset-4 hover:text-brass hover:underline"
              >
                Start over
              </button>
              <div className="flex items-center gap-3">
                <span className="text-[0.6875rem] text-stone/55">
                  {mode === "book"
                    ? "Saves the book, the companion, and the AI tags."
                    : "Saves the link, the embed (if any), and the AI tags."}
                </span>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!title.trim() || saving}
                  className="lift inline-flex h-9 items-center gap-2 bg-brass px-5 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-gold disabled:opacity-60"
                >
                  {saving ? "Saving..." : mode === "book" ? "Save book + study" : "Save sermon"}
                  {!saving && <Icon name="check" size={12} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Force the cn import to register if unused-import lint is strict
void cn;
