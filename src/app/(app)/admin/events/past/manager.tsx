"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Icon } from "@/components/icons/Icon";
import { HintTooltip } from "@/components/admin/HintTooltip";
import { cn } from "@/lib/utils";

interface Photo {
  url: string;
  alt?: string;
  caption?: string;
}

interface PastEvent {
  id: string;
  title: string;
  location: string;
  startTime: string;
  endTime: string | null;
  eventType: string;
  isPast: boolean;
  recap: string;
  photos: Photo[];
}

export function PastEventsManager({ initial }: { initial: PastEvent[] }) {
  const [events, setEvents] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-12 md:py-14">
      <header className="mb-10">
        <div className="flex items-center gap-4">
          <span className="section-mark text-brass">§ Past Events</span>
          <div className="hairline flex-1" />
          <Link
            href="/admin/events"
            className="text-xs text-stone/60 hover:text-brass"
          >
            ← Upcoming events
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="display-xl text-3xl text-bone md:text-5xl">
              The retreat archive.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone/80">
              Every event that&apos;s already happened. Click one to write the recap and upload photos. Auto-saves. Once an event has a recap or photos, it shows up on the public Past Events section.
            </p>
          </div>
          <span className="section-mark text-stone/40">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
        </div>
      </header>

      {events.length === 0 ? (
        <div className="border border-dashed border-stone/20 bg-iron/30 p-16 text-center">
          <Icon name="calendar" size={36} className="mx-auto text-brass" />
          <p className="mt-4 font-pullquote text-base italic text-stone/65">
            No past events yet. They&apos;ll show up here automatically once their end time passes, or you can flip the &quot;Mark as past&quot; toggle on any event.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => {
            const open = openId === ev.id;
            return (
              <li
                key={ev.id}
                className={cn(
                  "border bg-iron/30 transition-colors",
                  open ? "border-brass/50" : "border-stone/15 hover:border-stone/30"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : ev.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <Icon
                    name="calendar"
                    size={16}
                    className={cn(
                      "shrink-0",
                      open ? "text-brass" : "text-stone/55"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate display-xl text-base text-bone md:text-lg">
                      {ev.title}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.6875rem] text-stone/55">
                      <span>{format(new Date(ev.startTime), "MMM d, yyyy")}</span>
                      {ev.location && (
                        <>
                          <span>·</span>
                          <span className="truncate">{ev.location}</span>
                        </>
                      )}
                      {ev.eventType && (
                        <>
                          <span>·</span>
                          <span className="uppercase tracking-wider">{ev.eventType}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[0.625rem] uppercase tracking-wider text-stone/55">
                    {ev.recap && ev.recap.length > 0 && (
                      <span className="border border-olive/40 bg-olive/10 px-2 py-1 text-olive">
                        recap
                      </span>
                    )}
                    {ev.photos.length > 0 && (
                      <span className="border border-brass/40 bg-brass/10 px-2 py-1 text-brass">
                        {ev.photos.length} photo{ev.photos.length === 1 ? "" : "s"}
                      </span>
                    )}
                    {!ev.isPast && (
                      <span className="border border-stone/30 px-2 py-1 text-stone/60">
                        time-past
                      </span>
                    )}
                  </div>
                  <Icon
                    name={open ? "chevron-down" : "chevron-right"}
                    size={14}
                    className="text-stone/55"
                  />
                </button>
                {open && (
                  <RecapEditor
                    event={ev}
                    onChange={(patch) =>
                      setEvents((es) =>
                        es.map((e) => (e.id === ev.id ? { ...e, ...patch } : e))
                      )
                    }
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RecapEditor({
  event,
  onChange,
}: {
  event: PastEvent;
  onChange: (patch: Partial<PastEvent>) => void;
}) {
  const [recap, setRecap] = useState(event.recap);
  const [photos, setPhotos] = useState<Photo[]>(event.photos);
  const [isPast, setIsPast] = useState(event.isPast);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save when recap or photos or isPast changes.
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/admin/events/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recap, photos, isPast }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSaveState("saved");
        onChange({ recap, photos, isPast });
        setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500);
      } catch {
        setSaveState("error");
      }
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recap, photos, isPast]);

  async function uploadFiles(files: FileList) {
    setUploading(true);
    setUploadError("");
    const next = [...photos];
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", `events/${event.id}/photos`);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { url: string };
        next.push({ url: data.url, alt: file.name });
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      }
    }
    setPhotos(next);
    setUploading(false);
  }

  function removePhoto(idx: number) {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  }

  function updateCaption(idx: number, caption: string) {
    setPhotos((p) => p.map((ph, i) => (i === idx ? { ...ph, caption } : ph)));
  }

  return (
    <div className="border-t border-stone/15 px-5 py-5 space-y-6">
      {/* Save state */}
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-stone/75">
          <input
            type="checkbox"
            checked={isPast}
            onChange={(e) => setIsPast(e.target.checked)}
            className="h-3.5 w-3.5 accent-brass"
          />
          Mark as past (overrides time-based)
          <HintTooltip hint="Manually flagging skips the end-time check, useful for multi-day retreats that shouldn't flip mid-event." />
        </label>
        <span className="text-[0.6875rem] text-stone/55">
          {saveState === "saving"
            ? "Saving..."
            : saveState === "saved"
            ? "✓ Saved"
            : saveState === "error"
            ? "Save failed"
            : "Auto-saves 700ms after you stop typing"}
        </span>
      </div>

      {/* Recap textarea */}
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="section-mark text-brass">§ Recap</span>
          <HintTooltip hint="Plain prose. Paragraphs separated by blank lines. Renders on the public past-event page above the photo gallery." />
        </div>
        <textarea
          value={recap}
          onChange={(e) => setRecap(e.target.value)}
          rows={6}
          placeholder="Brothers came in from across the county. Three of us drove together from Tyler. The fire was hot. The coffee was bad. The conversation was honest..."
          className="block w-full resize-none border border-stone/15 bg-iron/40 px-3 py-3 text-sm leading-relaxed text-bone placeholder:text-stone/35 focus:border-brass focus:outline-none"
        />
      </div>

      {/* Photo gallery */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="section-mark text-brass">§ Photos ({photos.length})</span>
          <HintTooltip hint="Drag-drop or click to upload. JPG/PNG. Each photo can have an optional caption rendered below it on the public page." />
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-8 items-center gap-1.5 border border-brass/40 bg-brass/10 px-3 text-[0.6875rem] uppercase tracking-wider text-brass transition-colors hover:bg-brass/20 disabled:opacity-60"
          >
            <Icon name="plus" size={11} />
            {uploading ? "Uploading..." : "Add photos"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {uploadError && (
          <p className="mb-2 border border-oxblood/40 bg-oxblood/15 px-2 py-1 text-[0.6875rem] text-bone">
            {uploadError}
          </p>
        )}
        {photos.length === 0 ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
            }}
            className="border border-dashed border-stone/20 bg-iron/30 p-8 text-center text-xs text-stone/60"
          >
            Drop photos here, or click <span className="text-bone">Add photos</span>.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {photos.map((p, i) => (
              <div key={p.url} className="group/photo relative border border-stone/15 bg-iron/40">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-iron/60">
                  <Image
                    src={p.url}
                    alt={p.alt ?? ""}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center bg-iron/85 text-bone opacity-0 backdrop-blur-sm transition-opacity hover:bg-oxblood group-hover/photo:opacity-100"
                    aria-label="Remove photo"
                    title="Remove photo"
                  >
                    <Icon name="trash" size={11} />
                  </button>
                </div>
                <input
                  value={p.caption ?? ""}
                  onChange={(e) => updateCaption(i, e.target.value)}
                  placeholder="Optional caption"
                  className="block w-full border-0 border-t border-stone/15 bg-transparent px-2 py-1.5 text-[0.6875rem] text-bone placeholder:text-stone/35 focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
