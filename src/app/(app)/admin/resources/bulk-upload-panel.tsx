"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { HintTooltip } from "@/components/admin/HintTooltip";
import { cn } from "@/lib/utils";

interface FileResult {
  filename: string;
  ok: boolean;
  resourceId?: string;
  slug?: string;
  title?: string;
  error?: string;
  warnings?: string[];
}

type Status = "queued" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  status: Status;
  result?: FileResult;
}

interface BulkUploadPanelProps {
  sectionId: string;
  sectionName: string;
  onUploaded: () => void;
}

const ACCEPT = ".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const BATCH_SIZE = 4; // process 4 at a time so the model isn't overwhelmed

export function BulkUploadPanel({
  sectionId,
  sectionName,
  onUploaded,
}: BulkUploadPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [aiCategorize, setAiCategorize] = useState(true);
  const [busy, setBusy] = useState(false);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const next: QueueItem[] = arr.map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      status: "queued",
    }));
    setQueue((q) => [...q, ...next]);
  }

  function removeFromQueue(id: string) {
    setQueue((q) => q.filter((x) => x.id !== id));
  }

  function clearDone() {
    setQueue((q) => q.filter((x) => x.status !== "done"));
  }

  async function uploadOne(item: QueueItem): Promise<FileResult> {
    const fd = new FormData();
    fd.append("file", item.file);
    fd.append("sectionId", sectionId);
    if (!aiCategorize) fd.append("skipCategorize", "1");
    const res = await fetch("/api/admin/resources/bulk-upload", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as { results: FileResult[] };
    return data.results[0] ?? { filename: item.file.name, ok: false, error: "No result" };
  }

  async function processAll() {
    if (busy) return;
    setBusy(true);
    const queued = queue.filter((q) => q.status === "queued");
    for (let i = 0; i < queued.length; i += BATCH_SIZE) {
      const slice = queued.slice(i, i + BATCH_SIZE);
      // Mark slice as uploading
      setQueue((q) =>
        q.map((x) =>
          slice.find((s) => s.id === x.id) ? { ...x, status: "uploading" } : x
        )
      );
      const settled = await Promise.allSettled(slice.map(uploadOne));
      setQueue((q) =>
        q.map((x) => {
          const idx = slice.findIndex((s) => s.id === x.id);
          if (idx === -1) return x;
          const result = settled[idx];
          if (result.status === "fulfilled") {
            return {
              ...x,
              status: result.value.ok ? "done" : "error",
              result: result.value,
            };
          }
          return {
            ...x,
            status: "error",
            result: {
              filename: x.file.name,
              ok: false,
              error: result.reason instanceof Error ? result.reason.message : "Failed",
            },
          };
        })
      );
    }
    setBusy(false);
    onUploaded();
  }

  const queuedCount = queue.filter((q) => q.status === "queued").length;
  const doneCount = queue.filter((q) => q.status === "done").length;
  const errorCount = queue.filter((q) => q.status === "error").length;

  return (
    <div
      className={cn(
        "border bg-iron/30 transition-colors",
        dragOver ? "border-brass" : "border-stone/15"
      )}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-stone/15 px-5 py-3">
        <Icon name="download" size={14} className="rotate-180 text-brass" />
        <span className="section-mark text-bone">§ Bulk upload</span>
        <HintTooltip hint=".docx files convert to clean HTML you can read on the site, search, and print. PDFs upload as downloads. AI tags each file with topics, themes, and books of the Bible at upload time. Up to 25MB per file." />
        <span className="text-xs text-stone/55">
          Drop into <span className="text-bone">{sectionName}</span>
        </span>
        <div className="flex-1" />
        <label className="flex items-center gap-2 text-[0.6875rem] text-stone/75">
          <input
            type="checkbox"
            checked={aiCategorize}
            onChange={(e) => setAiCategorize(e.target.checked)}
            className="h-3 w-3 accent-brass"
          />
          AI tag at upload
        </label>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className="px-5 py-8"
      >
        {queue.length === 0 ? (
          <div className="text-center">
            <Icon name="image" size={32} className="mx-auto text-stone/40" />
            <p className="mt-3 text-sm text-stone/75">
              Drop <span className="text-bone">.docx</span> or <span className="text-bone">.pdf</span> files here, or pick them.
            </p>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="lift mt-4 inline-flex h-9 items-center gap-2 border border-bone bg-bone px-4 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-stone"
            >
              <Icon name="plus" size={12} />
              Pick files
            </button>
            <p className="mt-3 text-[0.6875rem] text-stone/45">
              Up to 25MB each. Processed 4 at a time.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {queue.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[20px_1fr_120px_24px] items-center gap-3 border border-stone/10 bg-iron/40 px-3 py-2"
              >
                <StatusDot status={item.status} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-bone">
                    {item.result?.title ?? item.file.name}
                  </p>
                  {item.result?.warnings && item.result.warnings.length > 0 && (
                    <p className="mt-0.5 line-clamp-1 text-[0.625rem] text-brass/80">
                      {item.result.warnings[0]}
                    </p>
                  )}
                  {item.status === "error" && item.result?.error && (
                    <p className="mt-0.5 line-clamp-1 text-[0.625rem] text-oxblood">
                      {item.result.error}
                    </p>
                  )}
                </div>
                <span className="text-[0.625rem] uppercase tracking-wider text-stone/55">
                  {(item.file.size / 1024).toFixed(0)} KB
                </span>
                {item.status === "queued" || item.status === "error" ? (
                  <button
                    type="button"
                    onClick={() => removeFromQueue(item.id)}
                    className="text-stone/40 hover:text-oxblood"
                    aria-label="Remove"
                  >
                    <Icon name="close" size={12} />
                  </button>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
        )}

        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {queue.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone/15 bg-iron/20 px-5 py-3">
          <div className="text-[0.6875rem] text-stone/65">
            {queuedCount > 0 && <span>{queuedCount} queued </span>}
            {doneCount > 0 && (
              <span className="text-olive">· {doneCount} done </span>
            )}
            {errorCount > 0 && (
              <span className="text-oxblood">· {errorCount} failed </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1.5 border border-stone/25 px-3 text-[0.6875rem] uppercase tracking-wider text-stone/75 transition-colors hover:border-brass hover:text-brass disabled:opacity-50"
            >
              + More
            </button>
            {doneCount > 0 && (
              <button
                type="button"
                onClick={clearDone}
                disabled={busy}
                className="inline-flex h-8 items-center gap-1.5 border border-stone/25 px-3 text-[0.6875rem] uppercase tracking-wider text-stone/75 transition-colors hover:border-brass hover:text-brass disabled:opacity-50"
              >
                Clear done
              </button>
            )}
            <button
              type="button"
              onClick={processAll}
              disabled={busy || queuedCount === 0}
              className="lift inline-flex h-8 items-center gap-2 bg-brass px-4 text-[0.6875rem] font-medium uppercase tracking-wider text-ink transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:bg-stone/30 disabled:text-stone/55"
            >
              {busy ? "Processing..." : `Upload ${queuedCount}`}
              {!busy && <Icon name="arrow-right" size={11} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  if (status === "done")
    return <Icon name="check" size={14} className="text-olive" />;
  if (status === "error")
    return <Icon name="close" size={14} className="text-oxblood" />;
  if (status === "uploading")
    return (
      <span className="inline-flex h-3 w-3 animate-spin items-center justify-center">
        <span className="h-3 w-3 border border-brass border-t-transparent" />
      </span>
    );
  return <span className="h-2 w-2 bg-stone/30" />;
}
