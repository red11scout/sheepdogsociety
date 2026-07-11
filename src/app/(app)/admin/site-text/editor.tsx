"use client";

import { useState, useTransition } from "react";
import { saveSiteText, resetSiteText } from "@/server/site-text-admin";
import { resolveSiteText } from "@/lib/site-text/resolve";

interface EditorEntry {
  key: string;
  label: string;
  group: string;
  defaultValue: string;
  multiline: boolean;
  stored: string | null;
}

export function SiteTextEditor({ entries }: { entries: EditorEntry[] }) {
  const [values, setValues] = useState<Record<string, string | null>>(
    Object.fromEntries(entries.map((e) => [e.key, e.stored]))
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<{ key: string; msg: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = [...new Set(entries.map((e) => e.group))];

  function open(e: EditorEntry) {
    setOpenKey(e.key);
    setDraft(resolveSiteText(values[e.key], e.defaultValue));
    setStatus(null);
  }

  function save(e: EditorEntry) {
    startTransition(async () => {
      const res = await saveSiteText(e.key, draft);
      if (res.ok) {
        setValues((v) => ({ ...v, [e.key]: draft }));
        setOpenKey(null);
        setStatus({ key: e.key, msg: "Saved. The site shows it now.", ok: true });
      } else {
        setStatus({ key: e.key, msg: res.error ?? "Could not save.", ok: false });
      }
    });
  }

  function reset(e: EditorEntry) {
    startTransition(async () => {
      const res = await resetSiteText(e.key);
      if (res.ok) {
        setValues((v) => ({ ...v, [e.key]: null }));
        setOpenKey(null);
        setStatus({ key: e.key, msg: "Back to the original words.", ok: true });
      } else {
        setStatus({ key: e.key, msg: res.error ?? "Could not reset.", ok: false });
      }
    });
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group}>
          <p className="section-mark text-brass">§ {group}</p>
          <ul className="mt-4 divide-y divide-stone/10 border-y border-stone/15">
            {entries.filter((e) => e.group === group).map((e) => {
              const current = resolveSiteText(values[e.key], e.defaultValue);
              const isDefault = resolveSiteText(values[e.key], "") === "";
              const isOpen = openKey === e.key;
              return (
                <li key={e.key} className="py-1">
                  {isOpen ? (
                    <div className="px-2 py-3">
                      <p className="text-sm font-medium">{e.label}</p>
                      {e.multiline ? (
                        <textarea
                          className="mt-2 w-full border border-stone/25 bg-transparent p-3 text-sm leading-relaxed"
                          rows={4}
                          value={draft}
                          maxLength={2000}
                          onChange={(ev) => setDraft(ev.target.value)}
                        />
                      ) : (
                        <input
                          className="mt-2 h-11 w-full border border-stone/25 bg-transparent px-3 text-sm"
                          value={draft}
                          maxLength={2000}
                          onChange={(ev) => setDraft(ev.target.value)}
                        />
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button type="button" disabled={pending} onClick={() => save(e)}
                          className="lift inline-flex h-11 items-center border border-bone bg-bone px-5 text-sm font-medium text-iron disabled:opacity-50">
                          Save
                        </button>
                        <button type="button" disabled={pending || isDefault} onClick={() => reset(e)}
                          className="inline-flex h-11 items-center border border-stone/30 px-4 text-sm disabled:opacity-40">
                          Reset to original
                        </button>
                        <button type="button" onClick={() => setOpenKey(null)}
                          className="inline-flex h-11 items-center px-3 text-sm text-stone/70">
                          Cancel
                        </button>
                      </div>
                      {status?.key === e.key && (
                        <p className={`mt-2 text-xs ${status.ok ? "text-olive" : "text-oxblood"}`}>{status.msg}</p>
                      )}
                    </div>
                  ) : (
                    <button type="button" onClick={() => open(e)}
                      className="flex min-h-11 w-full items-start justify-between gap-4 px-2 py-3 text-left transition-colors hover:bg-iron/40">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{e.label}</span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-stone/70">{current}</span>
                      </span>
                      <span className="section-mark shrink-0 pt-1 text-[10px] text-stone/50">
                        {isDefault ? "Original" : "Edited"}
                      </span>
                    </button>
                  )}
                  {!isOpen && status?.key === e.key && (
                    <p className={`px-2 pb-2 text-xs ${status.ok ? "text-olive" : "text-oxblood"}`}>{status.msg}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
