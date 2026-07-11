"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { setAutopilotEnabled } from "@/server/letters/autopilot-admin";
import { cn } from "@/lib/utils";

interface ScheduledLetterLite {
  id: string;
  title: string;
  scheduledFor: string | null;
}

interface AutopilotCardProps {
  enabled: boolean;
  lastRunAt: string | null;
  lastBlockTheme: string;
  lastBlockVoice: string;
  lastBlockLetterIds: string[];
  scheduledLetters: ScheduledLetterLite[];
}

export function AutopilotCard({
  enabled: initialEnabled,
  lastRunAt,
  lastBlockTheme,
  lastBlockVoice,
  lastBlockLetterIds,
  scheduledLetters,
}: AutopilotCardProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [revertedMessage, setRevertedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (enabled) {
      const confirmed = window.confirm(
        "Turn autopilot off? Unpublished autopilot letters go back to drafts and will not send."
      );
      if (!confirmed) return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await setAutopilotEnabled(!enabled);
        setEnabled(result.enabled);
        setRevertedMessage(
          !result.enabled
            ? `${result.reverted} ${result.reverted === 1 ? "letter" : "letters"} returned to drafts.`
            : null
        );
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not update autopilot."
        );
      }
    });
  }

  return (
    <section className="mt-10 border border-stone/15 px-6 py-6">
      <div className="flex items-center gap-4">
        <span className="section-mark text-brass">§ Autopilot</span>
        <div className="hairline flex-1" />
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          role="switch"
          aria-checked={enabled}
          className={cn(
            "inline-flex h-8 items-center gap-2 border px-3 text-[0.6875rem] font-medium uppercase tracking-wider transition-colors disabled:opacity-60",
            enabled
              ? "border-olive/50 bg-olive/15 text-olive hover:bg-olive/25"
              : "border-stone/30 bg-stone/5 text-stone/70 hover:border-brass hover:text-brass"
          )}
        >
          {pending ? "Updating..." : enabled ? "On" : "Off"}
        </button>
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone/80">
        {enabled
          ? "Writing four weeks at a time. Next run checks Monday morning."
          : "Off. The Letter waits for your hand."}
      </p>

      {revertedMessage && (
        <p className="mt-2 text-xs text-brass">{revertedMessage}</p>
      )}
      {error && <p className="mt-2 text-xs text-oxblood">{error}</p>}

      <div className="mt-6 grid gap-6 border-t border-stone/10 pt-6 md:grid-cols-2">
        <div>
          <p className="section-mark text-stone/45">Last run</p>
          <p className="mt-1 text-sm text-stone/80">
            {lastRunAt
              ? format(new Date(lastRunAt), "MMM d, yyyy 'at' h:mm a")
              : "Never run yet."}
          </p>
        </div>
        <div>
          <p className="section-mark text-stone/45">Last block</p>
          {lastBlockTheme ? (
            <p className="mt-1 text-sm text-stone/80">
              {lastBlockTheme}
              {lastBlockVoice ? ` · ${lastBlockVoice}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-stone/55">No block written yet.</p>
          )}
          {lastBlockLetterIds.length > 0 && (
            <ul className="mt-2 space-y-1">
              {lastBlockLetterIds.map((id) => {
                const letter = scheduledLetters.find((l) => l.id === id);
                return (
                  <li key={id}>
                    <Link
                      href={`/admin/encouragements/${id}`}
                      className="link-editorial text-xs text-stone/70"
                    >
                      {/* "View letter" fallback is expected right after a disable: titles come from
                          scheduledLetters (the scheduled list), which just reverted to draft. */}
                      {letter?.title ?? "View letter"}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
