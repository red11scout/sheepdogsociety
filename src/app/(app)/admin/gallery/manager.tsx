"use client";

/**
 * Admin gallery manager.
 *
 * One screen, every event. Left rail is a sortable list of events
 * (newest first) with a thumbnail-style card per event showing photo
 * count + date + location. Click a row to expand the editor: optional
 * description, drag-drop upload zone, photo grid with caption inputs
 * and inline delete.
 *
 * All writes go through PATCH /api/admin/events/[id] (the same
 * endpoint the Past Events manager uses) so the gallery edit and the
 * past-event recap edit stay in sync — touching photos here also
 * updates the past-event recap surface and vice versa.
 *
 * Auto-saves 700ms after the admin stops typing. No "Save" button.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Icon } from "@/components/icons/Icon";
import { HintTooltip } from "@/components/admin/HintTooltip";
import { cn } from "@/lib/utils";

interface Photo {
  url: string;
  alt?: string;
  caption?: string;
}

interface EventRow {
  id: string;
  title: string;
  startTime: string;
  location: string;
  eventType: string;
  description: string;
  photoCount: number;
}

interface ManagerProps {
  initial: EventRow[];
}

export function GalleryManager({ initial }: ManagerProps) {
  const [events, setEvents] = useState<EventRow[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const totalPhotos = events.reduce((n, e) => n + e.photoCount, 0);
  const eventsWithPhotos = events.filter((e) => e.photoCount > 0).length;

  const filtered = events.filter((e) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.location ?? "").toLowerCase().includes(q) ||
      (e.eventType ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-12 md:py-14">
      <header className="mb-10">
        <div className="flex items-center gap-4">
          <span className="section-mark text-brass">§ Gallery</span>
          <div className="hairline flex-1" />
        </div>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="display-xl text-3xl text-bone md:text-5xl">
              Every photo. Every gathering.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone/80">
              Pick an event, drag in photos, write a caption. Public site
              renders the magical lightbox version at{" "}
              <a
                href="/gallery"
                target="_blank"
                rel="noreferrer"
                className="text-brass hover:underline"
              >
                /gallery
              </a>
              .
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-right">
            <Stat label="Events with photos" value={eventsWithPhotos} />
            <Stat label="Total photos" value={totalPhotos} />
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="mb-6 flex items-center gap-3">
        <label className="relative flex flex-1 items-center">
          <Icon
            name="search"
            size={14}
            className="absolute left-3 text-stone/55"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by event title, location, or type..."
            className="block h-10 w-full border border-stone/15 bg-iron/30 pl-9 pr-3 text-sm text-bone placeholder:text-stone/45 focus:border-brass focus:outline-none"
          />
        </label>
        <span className="text-xs text-stone/55">
          {filtered.length} of {events.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-stone/20 bg-iron/30 p-16 text-center">
          <Icon name="calendar" size={36} className="mx-auto text-brass" />
          <p className="mt-4 font-pullquote text-base italic text-stone/65">
            {events.length === 0
              ? "No events yet. Create one in /admin/events, then come back to add photos."
              : "No events match that search."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((ev) => {
            const open = openId === ev.id;
            return (
              <li
                key={ev.id}
                className={cn(
                  "border bg-iron/30 transition-colors",
                  open
                    ? "border-brass/50"
                    : "border-stone/15 hover:border-stone/30"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : ev.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <span
                    className={cn(
                      "inline-flex h-10 w-10 shrink-0 items-center justify-center border",
                      ev.photoCount > 0
                        ? "border-brass/40 bg-brass/10 text-brass"
                        : "border-stone/20 bg-stone/5 text-stone/55"
                    )}
                  >
                    <Icon name="image" size={16} />
                  </span>
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
                          <span className="uppercase tracking-wider">
                            {ev.eventType}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "border px-2.5 py-1 text-[0.6875rem] uppercase tracking-wider",
                      ev.photoCount > 0
                        ? "border-brass/40 bg-brass/10 text-brass"
                        : "border-stone/30 text-stone/55"
                    )}
                  >
                    {ev.photoCount} photo{ev.photoCount === 1 ? "" : "s"}
                  </span>
                  <Icon
                    name={open ? "chevron-down" : "chevron-right"}
                    size={14}
                    className="text-stone/55"
                  />
                </button>
                {open && (
                  <EventEditor
                    event={ev}
                    onChange={(patch) =>
                      setEvents((es) =>
                        es.map((e) =>
                          e.id === ev.id ? { ...e, ...patch } : e
                        )
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="display-xl text-3xl text-brass md:text-4xl">{value}</p>
      <p className="section-mark text-stone/55">{label}</p>
    </div>
  );
}

/**
 * Per-event editor. Lazily fetches the full photo list when opened
 * (the row only carries a photo count to keep the outer list fast),
 * then offers drag-drop upload, caption inputs, reorder via drag,
 * delete, and a description textarea — all auto-saved.
 */
function EventEditor({
  event,
  onChange,
}: {
  event: EventRow;
  onChange: (patch: Partial<EventRow>) => void;
}) {
  const [description, setDescription] = useState(event.description);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializing = useRef(true);

  // Fetch photos once when the editor opens. Keeps the outer list
  // lightweight on first paint.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/events/${event.id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          event?: { photos?: Photo[]; description?: string };
        };
        if (!alive) return;
        const fetched = data.event?.photos ?? [];
        setPhotos(fetched);
        if (typeof data.event?.description === "string") {
          setDescription(data.event.description);
        }
      } catch {
        if (alive) setPhotos([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [event.id]);

  // Debounced auto-save when description or photos change. Skip the
  // first run so opening the editor doesn't trigger a phantom write.
  useEffect(() => {
    if (initializing.current) {
      if (photos !== null) initializing.current = false;
      return;
    }
    if (photos === null) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/admin/events/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, photos }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSaveState("saved");
        onChange({ description, photoCount: photos.length });
        setTimeout(() => {
          setSaveState((s) => (s === "saved" ? "idle" : s));
        }, 1500);
      } catch {
        setSaveState("error");
      }
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, photos]);

  async function uploadFiles(files: FileList) {
    if (!photos) return;
    setUploading(true);
    setUploadError("");
    const next = [...photos];
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", `events/${event.id}/photos`);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: fd,
        });
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
    if (!photos) return;
    setPhotos(photos.filter((_, i) => i !== idx));
  }

  function updateCaption(idx: number, caption: string) {
    if (!photos) return;
    setPhotos(photos.map((ph, i) => (i === idx ? { ...ph, caption } : ph)));
  }

  function movePhoto(idx: number, direction: -1 | 1) {
    if (!photos) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= photos.length) return;
    const next = [...photos];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setPhotos(next);
  }

  return (
    <div className="space-y-6 border-t border-stone/15 px-5 py-5">
      {/* Save indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href={`/gallery/${event.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-wider text-stone/65 hover:text-brass"
        >
          <Icon name="arrow-up-right" size={11} />
          View public gallery
        </a>
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

      {/* Description */}
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="section-mark text-brass">§ Description</span>
          <HintTooltip hint="Optional intro paragraph shown above the photo grid on the public /gallery/[event] page. Plain prose, paragraph breaks supported." />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Optional. Set the scene before the photos roll. Eg: 'Thirty brothers around three pits. Cold morning, hot coffee.'"
          className="block w-full resize-none border border-stone/15 bg-iron/40 px-3 py-3 text-sm leading-relaxed text-bone placeholder:text-stone/35 focus:border-brass focus:outline-none"
        />
      </div>

      {/* Photos */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="section-mark text-brass">
            § Photos ({photos?.length ?? 0})
          </span>
          <HintTooltip hint="Drop multiple at once. Each gets an optional caption that appears on hover in the grid and below the photo in the lightbox." />
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || loading}
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

        {loading ? (
          <div className="border border-dashed border-stone/20 bg-iron/30 p-8 text-center text-xs text-stone/60">
            Loading photos...
          </div>
        ) : photos && photos.length === 0 ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
            }}
            className="border border-dashed border-stone/20 bg-iron/30 p-10 text-center text-xs text-stone/60"
          >
            <Icon name="image" size={28} className="mx-auto text-stone/35" />
            <p className="mt-3">
              Drop photos here, or click{" "}
              <span className="text-bone">Add photos</span>.
            </p>
            <p className="mt-1 text-[0.625rem] text-stone/45">
              The public grid crops every photo to a square — portraits,
              landscapes, panoramas all read uniform.
            </p>
          </div>
        ) : photos ? (
          <div
            className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
            }}
          >
            {photos.map((p, i) => (
              <div
                key={p.url}
                className="group/photo relative border border-stone/15 bg-iron/40"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-iron/60">
                  <Image
                    src={p.url}
                    alt={p.alt ?? ""}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                    unoptimized
                  />
                  {/* Position chip + reorder buttons */}
                  <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2">
                    <span className="inline-flex h-5 items-center bg-iron/85 px-1.5 text-[0.5625rem] font-mono text-bone backdrop-blur-sm">
                      {i + 1}
                    </span>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover/photo:opacity-100">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => movePhoto(i, -1)}
                          className="inline-flex h-5 w-5 items-center justify-center bg-iron/85 text-bone backdrop-blur-sm hover:bg-brass hover:text-iron"
                          aria-label="Move left"
                          title="Move earlier"
                        >
                          <Icon name="chevron-left" size={11} />
                        </button>
                      )}
                      {i < photos.length - 1 && (
                        <button
                          type="button"
                          onClick={() => movePhoto(i, 1)}
                          className="inline-flex h-5 w-5 items-center justify-center bg-iron/85 text-bone backdrop-blur-sm hover:bg-brass hover:text-iron"
                          aria-label="Move right"
                          title="Move later"
                        >
                          <Icon name="chevron-right" size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Delete button bottom-right */}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center bg-iron/85 text-bone opacity-0 backdrop-blur-sm transition-opacity hover:bg-oxblood group-hover/photo:opacity-100"
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
        ) : null}
      </div>
    </div>
  );
}
