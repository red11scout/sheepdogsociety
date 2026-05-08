"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { ImageField } from "@/components/admin/ImageField";
import { HintTooltip } from "@/components/admin/HintTooltip";
import { applyDraft, createEncouragement } from "@/server/encouragements";
import { cn } from "@/lib/utils";

interface VoiceCard {
  id: string;
  name: string;
  shortBio: string;
  hallmarks: string;
}

interface ComposerProps {
  voices: VoiceCard[];
}

interface Draft {
  intro: string;
  scriptures: { ref: string; note: string }[];
  guidance: string;
  notes: string;
}

const STEPS = [
  { id: 1, label: "Theme & title" },
  { id: 2, label: "Cover image" },
  { id: 3, label: "Voice" },
  { id: 4, label: "Draft" },
] as const;

export function Composer({ voices }: ComposerProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [theme, setTheme] = useState("");
  const [title, setTitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImageAlt, setCoverImageAlt] = useState("");
  const [voiceId, setVoiceId] = useState<string>("");
  const [voiceFreeform, setVoiceFreeform] = useState("");

  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, startSave] = useTransition();

  const imagePrompt = useMemo(() => {
    const parts = [theme, title].filter(Boolean).join(" — ");
    return parts
      ? `Cover image for an Acts 2028 Sheepdog Society weekly encouragement on the theme "${parts}". Reverent, dignified, men-of-faith aesthetic. Editorial photography preferred.`
      : "";
  }, [theme, title]);

  const canStep2 = theme.trim().length > 0 && title.trim().length > 0;
  const canStep4 = voiceId !== "" || voiceFreeform.trim().length > 0;

  function gotoStep(n: 1 | 2 | 3 | 4) {
    if (n === 2 && !canStep2) return;
    if (n === 4 && !canStep4) return;
    setStep(n);
  }

  async function runDraft() {
    setDrafting(true);
    setDraftError("");
    setDraft(null);
    try {
      const res = await fetch("/api/admin/encouragements/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          title,
          voiceId: voiceId || "custom",
          voiceFreeform: voiceFreeform || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(j.detail || j.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { draft: Draft };
      setDraft(data.draft);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Draft failed.");
    } finally {
      setDrafting(false);
    }
  }

  function commit() {
    if (!draft) return;
    startSave(async () => {
      try {
        const row = await createEncouragement({
          title,
          theme,
          voice: voiceId || (voiceFreeform ? "custom" : ""),
          coverImageUrl,
          coverImageAlt,
        });
        await applyDraft({ id: row.id, draft });
        router.push(`/admin/encouragements/${row.id}`);
      } catch (err) {
        setDraftError(err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  function commitWithoutDraft() {
    startSave(async () => {
      try {
        const row = await createEncouragement({
          title,
          theme,
          voice: voiceId || (voiceFreeform ? "custom" : ""),
          coverImageUrl,
          coverImageAlt,
        });
        router.push(`/admin/encouragements/${row.id}`);
      } catch (err) {
        setDraftError(err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  const selectedVoice = voices.find((v) => v.id === voiceId);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-12 md:py-14">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-stone/15 pb-4">
        <Link
          href="/admin/encouragements"
          className="inline-flex items-center gap-1.5 text-xs text-stone/65 transition-colors hover:text-brass"
        >
          <Icon name="arrow-right" size={12} className="rotate-180" />
          All encouragements
        </Link>
        <span className="section-mark text-stone/45">§ Compose</span>
        <div className="flex-1" />
        <span className="text-xs text-stone/55">
          Step {step} of 4 · {STEPS[step - 1].label}
        </span>
      </div>

      {/* Header */}
      <header className="mt-8">
        <div className="flex items-center gap-4">
          <span className="section-mark text-brass">§ Compose this week&rsquo;s word</span>
          <div className="hairline flex-1" />
        </div>
        <h1 className="display-xl mt-6 text-3xl text-bone md:text-5xl">
          Theme. Image. Voice.
          <br />
          <span className="text-brass">Then a draft, ready to read.</span>
        </h1>
        <p className="mt-4 max-w-2xl font-pullquote text-base italic leading-relaxed text-stone/80">
          Four short steps. Claude drafts the intro, scripture anchors, guidance, and closing. You read, tweak, and publish.
        </p>
      </header>

      {/* Stepper */}
      <ol className="mt-10 grid grid-cols-4 gap-2 md:gap-4" aria-label="Composer steps">
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
          <Field
            label="Theme"
            hint="One word or short phrase. The anchor for the whole letter — Endurance, Integrity, When the watch is long."
          >
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Endurance"
              className="block w-full border border-stone/15 bg-transparent px-4 py-3 text-lg text-bone placeholder:text-stone/35 focus:border-brass focus:outline-none"
              autoFocus
            />
          </Field>

          <Field
            label="Title"
            hint="The line a man remembers on Wednesday. Concrete is better than clever."
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="When the watch is long"
              className="block w-full border border-stone/15 bg-transparent px-4 py-3 text-2xl text-bone placeholder:text-stone/35 focus:border-brass focus:outline-none"
              style={{ fontFamily: "var(--font-fraunces)" }}
            />
          </Field>

          <FooterNav
            backLabel="Cancel"
            backHref="/admin/encouragements"
            onNext={() => gotoStep(2)}
            nextDisabled={!canStep2}
            nextLabel="Pick a cover image"
          />
        </section>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <section className="mt-12 space-y-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="section-mark text-brass">§ Cover image</span>
              <HintTooltip hint="Upload one you have, paste a URL, or generate with AI. The prompt is pre-filled from your theme. Skip if you'd rather add it later." />
              <div className="hairline flex-1" />
              <button
                type="button"
                onClick={() => gotoStep(3)}
                className="text-xs text-stone/55 underline-offset-4 hover:text-brass hover:underline"
              >
                Skip for now
              </button>
            </div>
            <div className="mt-4">
              <ImageField
                value={coverImageUrl}
                alt={coverImageAlt}
                onChange={(url, alt) => {
                  setCoverImageUrl(url);
                  if (alt != null) setCoverImageAlt(alt);
                }}
                folder="encouragements"
                defaultPrompt={imagePrompt}
              />
              {coverImageUrl && (
                <input
                  value={coverImageAlt}
                  onChange={(e) => setCoverImageAlt(e.target.value)}
                  placeholder="Alt text (describe the image for screen readers)"
                  className="mt-3 block w-full border border-stone/15 bg-transparent px-3 py-2 text-xs text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
                />
              )}
            </div>
          </div>

          <FooterNav
            onBack={() => gotoStep(1)}
            onNext={() => gotoStep(3)}
            nextLabel="Pick a voice"
          />
        </section>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <section className="mt-12 space-y-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="section-mark text-brass">§ Voice</span>
              <HintTooltip hint="Pick whose preaching cadence Claude should write in. The output is original prose — never a fabricated quotation. The brand voice rules still apply on top." />
              <div className="hairline flex-1" />
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone/75">
              Ten reformed pastor-theologians. Pick the cadence that fits this week.
            </p>
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
                        <h3
                          className={cn(
                            "display-xl text-base md:text-lg",
                            active ? "text-bone" : "text-bone"
                          )}
                        >
                          {v.name}
                        </h3>
                        {active && (
                          <span className="section-mark text-brass">Picked</span>
                        )}
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
              <HintTooltip hint="Free-form voice description. Used only if no preset is picked. Brand voice and scripture rules still apply." />
            </div>
            <textarea
              value={voiceFreeform}
              onChange={(e) => {
                setVoiceFreeform(e.target.value);
                if (e.target.value.trim().length > 0) setVoiceId("");
              }}
              placeholder="e.g. The cadence of an old country pastor who loves Jonathan Edwards. Plain words, weighty pauses."
              rows={3}
              className="mt-3 block w-full border border-stone/15 bg-transparent px-3 py-2 text-sm text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
            />
          </div>

          <FooterNav
            onBack={() => gotoStep(2)}
            onNext={() => gotoStep(4)}
            nextDisabled={!canStep4}
            nextLabel="Draft this encouragement"
          />
        </section>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <section className="mt-12 space-y-8">
          <div className="border border-stone/15 bg-iron/40 p-6">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="section-mark text-stone/55">Theme</span>
              <span className="text-bone">{theme}</span>
              <span className="text-stone/35">·</span>
              <span className="section-mark text-stone/55">Voice</span>
              <span className="text-bone">
                {selectedVoice ? selectedVoice.name : voiceFreeform ? "Custom" : "—"}
              </span>
              <span className="text-stone/35">·</span>
              <span className="section-mark text-stone/55">Title</span>
              <span className="font-pullquote italic text-bone">{title}</span>
            </div>
          </div>

          {!draft && !drafting && !draftError && (
            <div className="border border-dashed border-stone/20 bg-iron/30 p-10 text-center">
              <Icon name="sparkles" size={36} className="mx-auto text-brass" />
              <h2 className="display-xl mt-6 text-xl text-bone md:text-2xl">
                Ready to draft.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone/75">
                Claude will write an intro, two or three scripture anchors with notes, the guidance, and a brief closing — all in the voice you chose. Should take about 20 seconds.
              </p>
              <button
                type="button"
                onClick={runDraft}
                className="lift mt-8 inline-flex h-11 items-center gap-2 bg-brass px-6 text-xs font-medium uppercase tracking-wider text-ink transition-colors hover:bg-gold"
              >
                <Icon name="sparkles" size={14} />
                Draft this encouragement
              </button>
            </div>
          )}

          {drafting && (
            <div className="border border-brass/30 bg-iron/40 p-10 text-center">
              <div className="inline-flex h-10 w-10 animate-spin items-center justify-center text-brass">
                <Icon name="sparkles" size={28} />
              </div>
              <p className="mt-4 text-sm text-stone/80">
                Claude is drafting. Hold the line.
              </p>
            </div>
          )}

          {draftError && (
            <div className="border border-oxblood/40 bg-oxblood/15 p-5">
              <p className="display-xl text-base text-bone">Draft failed.</p>
              <p className="mt-2 text-sm text-stone/85">{draftError}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={runDraft}
                  className="inline-flex h-9 items-center gap-2 border border-bone/40 bg-iron px-4 text-xs font-medium uppercase tracking-wider text-bone transition-colors hover:border-brass hover:text-brass"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={commitWithoutDraft}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 border border-stone/30 px-4 text-xs font-medium uppercase tracking-wider text-stone transition-colors hover:border-brass hover:text-brass"
                >
                  Skip draft, write by hand
                </button>
              </div>
            </div>
          )}

          {draft && !drafting && (
            <div className="space-y-6">
              <DraftBlock title="Intro" body={draft.intro} />
              <DraftBlock
                title="Scriptures"
                body={
                  <ul className="space-y-2">
                    {draft.scriptures.map((s, i) => (
                      <li key={i} className="border-l-2 border-brass/40 pl-3">
                        <p
                          className="text-sm font-medium text-bone"
                          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                        >
                          {s.ref}
                        </p>
                        <p className="mt-1 text-xs text-stone/75">{s.note}</p>
                      </li>
                    ))}
                  </ul>
                }
              />
              <DraftBlock title="Guidance" body={draft.guidance} />
              <DraftBlock title="Notes from the Watch" body={draft.notes} />

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone/15 pt-6">
                <button
                  type="button"
                  onClick={runDraft}
                  className="inline-flex h-10 items-center gap-2 border border-stone/30 bg-transparent px-4 text-xs font-medium uppercase tracking-wider text-stone transition-colors hover:border-brass hover:text-brass"
                >
                  <Icon name="sparkles" size={12} />
                  Try a different draft
                </button>
                <button
                  type="button"
                  onClick={commit}
                  disabled={saving}
                  className="lift inline-flex h-10 items-center gap-2 bg-brass px-5 text-xs font-medium uppercase tracking-wider text-ink transition-colors hover:bg-gold disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Use this draft"}
                  <Icon name="arrow-right" size={12} />
                </button>
              </div>
            </div>
          )}

          {step === 4 && !draft && (
            <FooterNav
              onBack={() => gotoStep(3)}
              backLabel="Back"
              hideNext
            />
          )}
        </section>
      )}

      {/* Footer hint */}
      <div className="mt-16 border-t border-stone/15 pt-6 text-xs text-stone/45">
        <p className="flex items-center gap-2">
          <Icon name="info" size={12} className="text-stone/40" />
          You can edit anything in the editor after this. Nothing publishes until you say so.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
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
          className="lift inline-flex h-10 items-center gap-2 bg-brass px-5 text-xs font-medium uppercase tracking-wider text-ink transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:bg-stone/30 disabled:text-stone/55"
        >
          {nextLabel}
          <Icon name="arrow-right" size={12} />
        </button>
      )}
    </div>
  );
}

function DraftBlock({
  title,
  body,
}: {
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="border border-stone/15 bg-iron/30 p-5">
      <div className="flex items-center gap-3">
        <span className="section-mark text-brass">§ {title}</span>
        <div className="hairline flex-1" />
      </div>
      <div className="mt-3 text-sm leading-relaxed text-bone">
        {typeof body === "string" ? <p className="whitespace-pre-line">{body}</p> : body}
      </div>
    </div>
  );
}
