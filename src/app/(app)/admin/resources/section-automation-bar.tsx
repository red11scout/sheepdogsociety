"use client";

/**
 * Three bulk-AI actions scoped to a single section:
 *   1. Re-tag all      — runs categorizeResource for every row with body
 *                        text. Populates summary/topics/themes/books, which
 *                        is what the public search filters on. Without this
 *                        a 56-row Bible Studies section is a black hole to
 *                        anyone typing in the search bar.
 *   2. Auto-cluster    — single Claude call buckets every row into 4-7
 *                        labelled clusters (e.g. "Marriage & Family"). The
 *                        public browser groups cards under those headings
 *                        instead of dumping them into one giant grid.
 *   3. Generate covers — gpt-image-1 cover per row, saved to Vercel Blob,
 *                        wired into thumbnail_url. Slow + costs money;
 *                        triggered only on demand.
 *
 * Each action is best-effort — partial failures are surfaced in the
 * status panel so the admin can re-run for the rows that didn't take.
 */

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { HintTooltip } from "@/components/admin/HintTooltip";
import { cn } from "@/lib/utils";

type ActionState = "idle" | "running" | "ok" | "error";

interface Result {
  kind: "retag" | "cluster" | "covers";
  message: string;
  detail?: string;
}

interface Resource {
  id: string;
  url?: string | null;
  fileKey?: string | null;
}

export function SectionAutomationBar({
  sectionId,
  sectionName,
  resources,
  onComplete,
}: {
  sectionId: string;
  sectionName: string;
  resources: Resource[];
  onComplete: () => void;
}) {
  const [retagState, setRetagState] = useState<ActionState>("idle");
  const [clusterState, setClusterState] = useState<ActionState>("idle");
  const [coversState, setCoversState] = useState<ActionState>("idle");
  const [coversProgress, setCoversProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleRetag() {
    if (
      !confirm(
        `Re-tag every resource in "${sectionName}"? This calls Claude once per row and will take 1-3 minutes for a large section. Existing tags get overwritten.`
      )
    )
      return;
    setRetagState("running");
    setResult(null);
    try {
      const res = await fetch(
        `/api/admin/resources/sections/${sectionId}/retag`,
        { method: "POST" }
      );
      const data = (await res.json()) as {
        tagged?: number;
        failed?: number;
        processed?: number;
        error?: string;
        detail?: string;
      };
      if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`);
      setRetagState("ok");
      setResult({
        kind: "retag",
        message: `Tagged ${data.tagged ?? 0} of ${data.processed ?? 0} rows.`,
        detail: data.failed ? `${data.failed} failed.` : undefined,
      });
      onComplete();
    } catch (err) {
      setRetagState("error");
      setResult({
        kind: "retag",
        message: "Re-tag failed.",
        detail: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  async function handleCluster() {
    if (
      !confirm(
        `Auto-cluster every resource in "${sectionName}" into 4-7 labelled groups? Existing cluster assignments get overwritten.`
      )
    )
      return;
    setClusterState("running");
    setResult(null);
    try {
      const res = await fetch(
        `/api/admin/resources/sections/${sectionId}/cluster`,
        { method: "POST" }
      );
      const data = (await res.json()) as {
        labels?: string[];
        assignments?: number;
        bucketCounts?: Record<string, number>;
        error?: string;
        detail?: string;
      };
      if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`);
      setClusterState("ok");
      const buckets = data.bucketCounts
        ? Object.entries(data.bucketCounts)
            .map(([k, v]) => `${k} (${v})`)
            .join(", ")
        : "";
      setResult({
        kind: "cluster",
        message: `Assigned ${data.assignments ?? 0} rows to ${(data.labels ?? []).length} clusters.`,
        detail: buckets,
      });
      onComplete();
    } catch (err) {
      setClusterState("error");
      setResult({
        kind: "cluster",
        message: "Cluster failed.",
        detail: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  async function handleGenerateCovers() {
    const targets = resources.filter((r) => true); // every row in the active section
    if (targets.length === 0) {
      setResult({ kind: "covers", message: "No resources in this section." });
      return;
    }
    if (
      !confirm(
        `Generate AI cover images for ${targets.length} resources in "${sectionName}"?\n\nThis calls OpenAI gpt-image-1 once per row (≈$0.011 per image at low quality). Total ≈ $${(
          targets.length * 0.011
        ).toFixed(2)}. Slow — runs ~6-15s per image, so the whole batch can take several minutes. Existing thumbnails get overwritten.`
      )
    )
      return;
    setCoversState("running");
    setCoversProgress({ done: 0, total: targets.length });
    setResult(null);
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      try {
        const res = await fetch(
          `/api/admin/resources/${t.id}/generate-cover`,
          { method: "POST" }
        );
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
          throw new Error(j.detail || j.error || `HTTP ${res.status}`);
        }
        ok++;
      } catch {
        failed++;
      }
      setCoversProgress({ done: i + 1, total: targets.length });
    }
    setCoversState(failed === 0 ? "ok" : "error");
    setResult({
      kind: "covers",
      message: `Generated ${ok} of ${targets.length} covers.`,
      detail: failed ? `${failed} failed — try the per-row image button to retry.` : undefined,
    });
    onComplete();
  }

  return (
    <div className="border border-brass/30 bg-iron/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="section-mark text-brass">§ Bulk AI actions</span>
        <HintTooltip hint="Section-wide AI passes. Re-tag = restore search/filter coverage. Auto-cluster = group cards under sub-headings on the public page. Generate covers = AI cover image per resource (uses OpenAI, costs money)." />
        <div className="flex-1" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ActionButton
          label="Re-tag all"
          icon="sparkles"
          onClick={handleRetag}
          state={retagState}
          tooltip="Re-runs Claude categorization on every row. Restores summary/topics/themes/books that the public search depends on."
        />
        <ActionButton
          label="Auto-cluster"
          icon="table"
          onClick={handleCluster}
          state={clusterState}
          tooltip="One Claude call sorts every row into 4-7 labelled buckets. Public page groups cards under those labels."
        />
        <ActionButton
          label="Generate covers"
          icon="image"
          onClick={handleGenerateCovers}
          state={coversState}
          progress={coversProgress}
          tooltip="OpenAI gpt-image-1, one image per row. Saves to Vercel Blob, wires into thumbnail_url. Slow + costs ~$0.011/image."
        />
      </div>
      {result && (
        <div
          className={cn(
            "mt-3 border px-3 py-2 text-xs",
            result.message.toLowerCase().includes("failed")
              ? "border-oxblood/40 bg-oxblood/10 text-bone"
              : "border-olive/40 bg-olive/10 text-bone"
          )}
        >
          <p>
            <span className="uppercase tracking-wider text-[0.6875rem] mr-2 text-stone/60">
              {result.kind}
            </span>
            {result.message}
          </p>
          {result.detail && (
            <p className="mt-1 text-[0.6875rem] text-stone/65">{result.detail}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  state,
  progress,
  tooltip,
}: {
  label: string;
  icon: "sparkles" | "table" | "image";
  onClick: () => void;
  state: ActionState;
  progress?: { done: number; total: number } | null;
  tooltip: string;
}) {
  const running = state === "running";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={running}
      title={tooltip}
      className={cn(
        "inline-flex h-9 items-center gap-2 border px-3 text-[0.6875rem] uppercase tracking-wider transition-colors disabled:opacity-60",
        state === "ok"
          ? "border-olive/50 bg-olive/15 text-olive"
          : state === "error"
          ? "border-oxblood/50 bg-oxblood/15 text-bone"
          : "border-brass/40 bg-brass/10 text-brass hover:bg-brass/20"
      )}
    >
      <Icon name={icon} size={12} />
      {running && progress
        ? `${label} · ${progress.done}/${progress.total}`
        : running
        ? `${label}...`
        : label}
    </button>
  );
}
