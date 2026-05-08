"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { HintTooltip } from "@/components/admin/HintTooltip";
import { createSeriesWithLetters } from "@/server/letter-series";
import { cn } from "@/lib/utils";

interface VoiceCard {
  id: string;
  name: string;
  shortBio: string;
  hallmarks: string;
}

interface DraftLetter {
  position: number;
  title: string;
  intro: string;
  scriptures: { ref: string; note: string }[];
  guidance: string;
  notes: string;
}

interface ComposerProps {
  voices: VoiceCard[];
}

const STEPS = [
  { id: 1, label: "Theme & shape" },
  { id: 2, label: "Voice" },
  { id: 3, label: "Schedule" },
  { id: 4, label: "Generate & review" },
] as const;

const CADENCE_OPTIONS: { value: "weekly" | "biweekly" | "monthly"; label: string; days: string }[] = [
  { value: "weekly", label: "Weekly", days: "every 7 days" },
  { value: "biweekly", label: "Biweekly", days: "every 14 days" },
  { value: "monthly", label: "Monthly", days: "every 28 days" },
];

function defaultStartDate(): string {
  // Default to next Monday at the project's preferred publish day.
  const d = new Date();
  const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().slice(0, 10);
}

export function SeriesComposer({ voices }: ComposerProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [totalCount, setTotalCount] = useState<number>(4);

  const [voiceId, setVoiceId] = useState<string>("");
  const [voiceFreeform, setVoiceFreeform] = useState("");

  const [cadence, setCadence] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [startDate, setStartDate] = useState<string>(defaultStartDate());
  const [publishHour, setPublishHour] = useState<number>(6);

  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState("");
  const [letters, setLetters] = useState<DraftLetter[] | null>(null);
  const [saving, startSave] = useTransition();
  const [saveError, setSaveError] = useState("");

  const canStep2 = title.trim() && theme.trim() && totalCount >= 2 && totalCount <= 12;
  const canStep3 = voiceId !== "" || voiceFreeform.trim().length > 0;
  const canStep4 = !!startDate;

  const selectedVoice = useMemo(
    () => voices.find((v) => v.id === voiceId),
    [voiceId, voices]
  );

  function gotoStep(n: 1 | 2 | 3 | 4) {
    if (n === 2 && !canStep2) return;
    if (n === 3 && !canStep3) return;
    if (n === 4 && !canStep4) return;
    setStep(n);
  }

  async function runPlan() {
    setPlanning(true);
    setPlanError("");
    setLetters(null);
    try {
      const res = await fetch("/api/admin/encouragements/series-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          theme,
          voiceId: voiceId || "custom",
          voiceFreeform: voiceFreeform || undefined,
          totalCount,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(j.detail || j.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { plan: { letters: DraftLetter[] } };
      // Sort by position just in case.
      const sorted = [...data.plan.letters].sort((a, b) => a.position - b.position);
      setLetters(sorted);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Plan failed");
    } finally {
      setPlanning(false);
    }
  }

  function commit() {
    if (!letters) return;
    setSaveError("");
    startSave(async () => {
      try {
        const result = await createSeriesWithLetters({
          title,
          theme,
          voice: voiceId || (voiceFreeform ? "custom" : ""),
          totalCount,
          cadence,
          startDate,
          publishHour,
          letters,
        });
        router.push(`/admin/encouragements?series=${result.series.id}`);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-12 md:py-14">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-stone/15 pb-4">
        <Link
          href="/admin/encouragements"
          className="inline-flex items-center gap-1.5 text-xs text-stone/65 transition-colors hover:text-brass"
        >
          <Icon name="arrow-right" size={12} className="rotate-180" />
          The Letter
        </Link>
        <span className="section-mark text-stone/45">§ New series</span>
        <div className="flex-1" />
        <span className="text-xs text-stone/55">
          Step {step} of 4 · {STEPS[step - 1].label}
        </span>
      </div>

      {/* Header */}
      <header className="mt-8">
        <div className="flex items-center gap-4">
          <span className="section-mark text-brass">§ Schedule a series</span>
          <div className="hairline flex-1" />
        </div>
        <h1 className="display-xl mt-6 text-3xl text-bone md:text-5xl">
          One theme.
          <br />
          <span className="text-brass">Many letters.</span>
        </h1>
        <p className="mt-4 max-w-2xl font-pullquote text-base italic leading-relaxed text-stone/80">
          Pick a theme, a voice, a cadence. Claude drafts every letter in the arc. You review them all together, then they publish on schedule.
        </p>
      </header>

      {/* Stepper */}
      <ol className="mt-10 grid grid-cols-4 gap-2 md:gap-4" aria-label="Series steps">
        {STEPS.map((s) => {
          const done = s.id < step;
          const active = s.id === step;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => gotoStep(s.id as 1 | 2 | 3 | 4)}
                className={cn(
                  "flex w-full flex-col items-start gap-1 border-l-2 pl-3 py-2 text-left transition-colors",
                  active
                    ? "border-brass text-bone"
                    : done
                    ? "border-olive/60 text-stone hover:text-bone"
                    : "border-stone/20 text-stone/55"
                )}
              >
                <span className="section-mark">
                  {done ? "✓" : `0${s.id}`}
                </span>
                <span className="text-sm">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Step 1 */}
      {step === 1 && (
        <section className="mt-12 space-y-8">
          <Field label="Series title" hint="The umbrella line for the whole arc. e.g. 'Steady men in shaky times.'">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Steady men in shaky times"
              className="block w-full border border-stone/15 bg-transparent px-4 py-3 text-2xl text-bone placeholder:text-stone/35 focus:border-brass focus:outline-none"
              style={{ fontFamily: "var(--font-fraunces)" }}
              autoFocus
            />
          </Field>

          <Field label="Theme" hint="One word or short phrase. The connective tissue across every letter.">
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Endurance"
              className="block w-full border border-stone/15 bg-transparent px-4 py-3 text-lg text-bone placeholder:text-stone/35 focus:border-brass focus:outline-none"
            />
          </Field>

          <Field label="How many letters?" hint="2 to 12. Most series are 4 to 6.">
            <div className="flex flex-wrap items-center gap-2">
              {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTotalCount(n)}
                  className={cn(
                    "h-10 w-12 border text-sm transition-colors",
                    totalCount === n
                      ? "border-brass bg-brass/15 text-bone"
                      : "border-stone/20 text-stone/70 hover:border-brass/50"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <FooterNav
            backLabel="Cancel"
            backHref="/admin/encouragements"
            onNext={() => gotoStep(2)}
            nextDisabled={!canStep2}
            nextLabel="Pick a voice"
          />
        </section>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <section className="mt-12 space-y-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="section-mark text-brass">§ Voice</span>
              <HintTooltip hint="Pick whose preaching cadence Claude should write in. Output is original prose, never a fabricated quotation. Brand voice rules still apply on top." />
              <div className="hairline flex-1" />
            </div>
            <ul className="mt-6 grid gap-3 md:grid-cols-2">
              {voices.map((v) => {
                const active = voiceId === v.id;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceId(v.id);
                        setVoiceFreeform("");
                      }}
                      className={cn(
                        "lift block w-full border p-5 text-left transition-colors",
                        active
                          ? "border-brass bg-brass/10"
                          : "border-stone/15 bg-iron/30 hover:border-brass/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="display-xl text-base text-bone md:text-lg">
                          {v.name}
                        </h3>
                        {active && <span className="section-mark text-brass">Picked</span>}
                      </div>
                      <p className="mt-2 text-xs text-stone/65">{v.shortBio}</p>
                      <p className="mt-2 text-xs leading-relaxed text-stone/85">
                        {v.hallmarks}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="border-t border-stone/15 pt-6">
            <div className="flex items-center gap-3">
              <span className="section-mark text-stone/55">§ Or describe your own</span>
              <HintTooltip hint="Free-form voice description. Used only if no preset is picked." />
            </div>
            <textarea
              value={voiceFreeform}
              onChange={(e) => {
                setVoiceFreeform(e.target.value);
                if (e.target.value.trim().length > 0) setVoiceId("");
              }}
              placeholder="e.g. The cadence of an old country pastor who loves Edwards. Plain words, weighty pauses."
              rows={3}
              className="mt-3 block w-full border border-stone/15 bg-transparent px-3 py-2 text-sm text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
            />
          </div>

          <FooterNav
            onBack={() => gotoStep(1)}
            onNext={() => gotoStep(3)}
            nextDisabled={!canStep3}
            nextLabel="Set the schedule"
          />
        </section>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <section className="mt-12 space-y-8">
          <Field label="Cadence" hint="How often a letter ships once the series starts.">
            <div className="flex flex-wrap gap-2">
              {CADENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCadence(opt.value)}
                  className={cn(
                    "border px-4 py-2 text-left text-sm transition-colors",
                    cadence === opt.value
                      ? "border-brass bg-brass/15 text-bone"
                      : "border-stone/20 text-stone/70 hover:border-brass/50"
                  )}
                >
                  <p className="text-bone">{opt.label}</p>
                  <p className="text-[0.625rem] text-stone/55">{opt.days}</p>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Start date" hint="The first letter publishes on this date.">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full border border-stone/15 bg-transparent px-3 py-2 text-sm text-bone focus:border-brass focus:outline-none"
              />
            </Field>
            <Field label="Publish hour (Central time)" hint="0–23. 6 = 6am Central.">
              <input
                type="number"
                min={0}
                max={23}
                value={publishHour}
                onChange={(e) => setPublishHour(Math.max(0, Math.min(23, Number(e.target.value) || 0)))}
                className="block w-24 border border-stone/15 bg-transparent px-3 py-2 text-sm text-bone focus:border-brass focus:outline-none"
              />
            </Field>
          </div>

          <FooterNav
            onBack={() => gotoStep(2)}
            onNext={() => gotoStep(4)}
            nextDisabled={!canStep4}
            nextLabel="Generate the series"
          />
        </section>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <section className="mt-12 space-y-8">
          <div className="border border-stone/15 bg-iron/40 p-5 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="section-mark text-stone/55">Title</span>
              <span className="font-pullquote italic text-bone">{title}</span>
              <span className="text-stone/35">·</span>
              <span className="section-mark text-stone/55">Theme</span>
              <span className="text-bone">{theme}</span>
              <span className="text-stone/35">·</span>
              <span className="section-mark text-stone/55">Count</span>
              <span className="text-bone">{totalCount}</span>
              <span className="text-stone/35">·</span>
              <span className="section-mark text-stone/55">Voice</span>
              <span className="text-bone">
                {selectedVoice ? selectedVoice.name : voiceFreeform ? "Custom" : "—"}
              </span>
              <span className="text-stone/35">·</span>
              <span className="section-mark text-stone/55">Cadence</span>
              <span className="text-bone">{cadence}, starting {startDate} at {publishHour}:00 CT</span>
            </div>
          </div>

          {!letters && !planning && !planError && (
            <div className="border border-dashed border-stone/20 bg-iron/30 p-10 text-center">
              <Icon name="sparkles" size={36} className="mx-auto text-brass" />
              <h2 className="display-xl mt-6 text-xl text-bone md:text-2xl">
                Ready to draft {totalCount} letters.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone/75">
                Claude will plan the arc and draft every letter at once. Takes about 45 seconds.
              </p>
              <button
                type="button"
                onClick={runPlan}
                className="lift mt-8 inline-flex h-11 items-center gap-2 bg-brass px-6 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-gold"
              >
                <Icon name="sparkles" size={14} />
                Draft the series
              </button>
            </div>
          )}

          {planning && (
            <div className="border border-brass/30 bg-iron/40 p-10 text-center">
              <div className="inline-flex h-10 w-10 animate-spin items-center justify-center text-brass">
                <Icon name="sparkles" size={28} />
              </div>
              <p className="mt-4 text-sm text-stone/80">
                Drafting {totalCount} letters. Hold the line — this takes 30 to 60 seconds.
              </p>
            </div>
          )}

          {planError && (
            <div className="border border-oxblood/40 bg-oxblood/15 p-5">
              <p className="display-xl text-base text-bone">Series draft failed.</p>
              <p className="mt-2 text-sm text-stone/85">{planError}</p>
              <button
                type="button"
                onClick={runPlan}
                className="mt-4 inline-flex h-9 items-center gap-2 border border-bone/40 bg-iron px-4 text-xs font-medium uppercase tracking-wider text-bone transition-colors hover:border-brass hover:text-brass"
              >
                Try again
              </button>
            </div>
          )}

          {letters && !planning && (
            <div className="space-y-5">
              {letters.map((l) => (
                <article key={l.position} className="border border-stone/15 bg-iron/30 p-5">
                  <div className="flex items-center gap-3">
                    <span className="section-mark text-brass">No. {l.position}</span>
                    <div className="hairline flex-1" />
                    <span className="text-[0.625rem] uppercase tracking-wider text-stone/55">
                      Scheduled
                    </span>
                  </div>
                  <h3 className="display-xl mt-3 text-xl text-bone md:text-2xl">
                    {l.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-bone/85 whitespace-pre-line">
                    {l.intro}
                  </p>
                  {l.scriptures.length > 0 && (
                    <ul className="mt-4 space-y-1">
                      {l.scriptures.map((s, i) => (
                        <li key={i} className="border-l-2 border-brass/40 pl-3">
                          <p className="text-xs font-medium text-bone" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                            {s.ref}
                          </p>
                          <p className="text-[0.6875rem] text-stone/65">{s.note}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}

              {saveError && (
                <p className="border border-oxblood/40 bg-oxblood/15 px-3 py-2 text-xs text-bone">
                  {saveError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone/15 pt-6">
                <button
                  type="button"
                  onClick={runPlan}
                  className="inline-flex h-10 items-center gap-2 border border-stone/30 bg-transparent px-4 text-xs font-medium uppercase tracking-wider text-stone transition-colors hover:border-brass hover:text-brass"
                >
                  <Icon name="sparkles" size={12} />
                  Try a different draft
                </button>
                <button
                  type="button"
                  onClick={commit}
                  disabled={saving}
                  className="lift inline-flex h-10 items-center gap-2 bg-brass px-5 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-gold disabled:opacity-60"
                >
                  {saving ? "Scheduling..." : `Schedule all ${letters.length}`}
                  <Icon name="arrow-right" size={12} />
                </button>
              </div>
            </div>
          )}

          {!letters && (
            <FooterNav onBack={() => gotoStep(3)} backLabel="Back" hideNext />
          )}
        </section>
      )}

      <div className="mt-16 border-t border-stone/15 pt-6 text-xs text-stone/45">
        <p className="flex items-center gap-2">
          <Icon name="info" size={12} className="text-stone/40" />
          Each letter saves as a scheduled draft. You can edit any of them before they publish. The cron at <code className="text-brass">/api/cron/publish-scheduled-letters</code> flips them to published when their time arrives.
        </p>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="section-mark text-brass">§ {label}</span>
        <HintTooltip hint={hint} />
        <div className="hairline flex-1" />
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function FooterNav({
  onBack,
  backLabel = "Back",
  backHref,
  onNext,
  nextLabel = "Next",
  nextDisabled = false,
  hideNext = false,
}: {
  onBack?: () => void;
  backLabel?: string;
  backHref?: string;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideNext?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone/15 pt-6">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex h-10 items-center gap-2 border border-stone/25 px-4 text-xs font-medium uppercase tracking-wider text-stone transition-colors hover:border-brass hover:text-brass"
        >
          {backLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 border border-stone/25 px-4 text-xs font-medium uppercase tracking-wider text-stone transition-colors hover:border-brass hover:text-brass"
        >
          <Icon name="arrow-right" size={12} className="rotate-180" />
          {backLabel}
        </button>
      )}
      {!hideNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="lift inline-flex h-10 items-center gap-2 bg-brass px-5 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:bg-stone/30 disabled:text-stone/55"
        >
          {nextLabel}
          <Icon name="arrow-right" size={12} />
        </button>
      )}
    </div>
  );
}
