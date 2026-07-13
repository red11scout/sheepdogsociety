"use client";

/**
 * Three bulk-AI actions scoped to a single section:
 *   1. Re-tag all       — runs categorizeResource for every row with body
 *                         text. Populates summary/topics/themes/books, which
 *                         is what the public search filters on. Without this
 *                         a 56-row Bible Studies section is a black hole to
 *                         anyone typing in the search bar.
 *   2. Auto-cluster     — single Claude call buckets every row into 4-7
 *                         labelled clusters (e.g. "Marriage & Family"). The
 *                         public browser groups cards under those headings
 *                         instead of dumping them into one giant grid.
 *   3. Draft field notes — batch-drafts field notes (spec §A-FN) for up to
 *                         15 rows per run still missing them. Drafts land
 *                         as status "draft" — an admin still approves each
 *                         one before it renders publicly.
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
  kind: "retitle" | "retag" | "cluster" | "field-notes";
  message: string;
  detail?: string;
  // Explicit error flag — the banner used to sniff "failed" out of
  // `message`, which breaks the moment a message legitimately contains
  // the word "failed" as a count label (see the field-notes result line).
  isError?: boolean;
}

export function SectionAutomationBar({
  sectionId,
  sectionName,
  onComplete,
}: {
  sectionId: string;
  sectionName: string;
  onComplete: () => void;
}) {
  const [retagState, setRetagState] = useState<ActionState>("idle");
  const [clusterState, setClusterState] = useState<ActionState>("idle");
  const [fieldNotesState, setFieldNotesState] = useState<ActionState>("idle");
  const [retitleState, setRetitleState] = useState<ActionState>("idle");
  const [result, setResult] = useState<Result | null>(null);

  async function handleRetitle() {
    if (
      !confirm(
        `Re-title every file in "${sectionName}" from its filename, in one uniform pattern? Instant, no AI. Existing titles get overwritten and each study's public link (slug) is regenerated to match.`
      )
    )
      return;
    setRetitleState("running");
    setResult(null);
    try {
      const res = await fetch(
        `/api/admin/resources/sections/${sectionId}/retitle`,
        { method: "POST" }
      );
      const data = (await res.json()) as {
        retitled?: number;
        unchanged?: number;
        skippedNoFile?: number;
        total?: number;
        samples?: { from: string; to: string }[];
        error?: string;
        detail?: string;
      };
      if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`);
      setRetitleState("ok");
      const sample = (data.samples ?? [])
        .slice(0, 3)
        .map((s) => `“${s.to}”`)
        .join(", ");
      setResult({
        kind: "retitle",
        message: `Re-titled ${data.retitled ?? 0} of ${data.total ?? 0} · ${
          data.unchanged ?? 0
        } already matched · ${data.skippedNoFile ?? 0} had no file.`,
        detail: sample ? `e.g. ${sample}` : undefined,
      });
      onComplete();
    } catch (err) {
      setRetitleState("error");
      setResult({
        kind: "retitle",
        message: "Re-title failed.",
        detail: err instanceof Error ? err.message : "unknown",
        isError: true,
      });
    }
  }

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
        isError: true,
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
        isError: true,
      });
    }
  }

  async function handleDraftFieldNotes() {
    if (
      !confirm(
        `Draft field notes for up to 15 resources missing them in "${sectionName}"? Costs AI tokens.`
      )
    )
      return;
    setFieldNotesState("running");
    setResult(null);
    try {
      const res = await fetch(
        `/api/admin/resources/sections/${sectionId}/field-notes`,
        { method: "POST" }
      );
      const data = (await res.json()) as {
        processed?: number;
        drafted?: number;
        insufficient?: number;
        failed?: number;
        remaining?: number;
        error?: string;
        detail?: string;
      };
      if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`);
      setFieldNotesState("ok");
      const remaining = data.remaining ?? 0;
      setResult({
        kind: "field-notes",
        message: `Drafted ${data.drafted ?? 0} · insufficient ${
          data.insufficient ?? 0
        } · failed ${data.failed ?? 0} · remaining ${remaining}`,
        detail: remaining > 0 ? "Run again for the next batch." : undefined,
      });
      onComplete();
    } catch (err) {
      setFieldNotesState("error");
      setResult({
        kind: "field-notes",
        message: "Draft field notes failed.",
        detail: err instanceof Error ? err.message : "unknown",
        isError: true,
      });
    }
  }

  return (
    <div className="border border-brass/30 bg-iron/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="section-mark text-brass">§ Bulk actions</span>
        <HintTooltip hint="Section-wide passes. Re-title = uniform titles from filenames (instant, no AI). Re-tag = restore search/filter coverage. Auto-cluster = group cards under expandable sub-headings on the public page. Draft field notes = AI study-notes draft per resource, still needs admin approval before it's public." />
        <div className="flex-1" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ActionButton
          label="Re-title from filenames"
          icon="pen"
          onClick={handleRetitle}
          state={retitleState}
          tooltip="Instant, no AI. Rewrites every file's title from its filename in one uniform pattern (strip extension, tidy dashes, Title Case) and regenerates the public link to match."
        />
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
          label="Draft field notes"
          icon="pen"
          onClick={handleDraftFieldNotes}
          state={fieldNotesState}
          tooltip="Drafts field notes (Claude) for up to 15 rows per run that don't have any yet. Lands as a draft — approve each one on its row before it's public."
        />
      </div>
      {result && (
        <div
          className={cn(
            "mt-3 border px-3 py-2 text-xs",
            result.isError
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
  tooltip,
}: {
  label: string;
  icon: "sparkles" | "table" | "pen";
  onClick: () => void;
  state: ActionState;
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
      {running ? `${label}...` : label}
    </button>
  );
}
