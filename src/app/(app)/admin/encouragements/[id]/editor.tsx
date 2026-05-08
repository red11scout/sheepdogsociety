"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Magnetic } from "@/components/motion/Magnetic";
import { ImageField } from "@/components/admin/ImageField";
import { HintTooltip } from "@/components/admin/HintTooltip";
import {
  updateEncouragement,
  setEncouragementStatus,
} from "@/server/encouragements";
import { THEOLOGIAN_VOICES } from "@/lib/ai/voices";
import { scrubAiText } from "@/lib/ai/scrub";
import { cn } from "@/lib/utils";

interface EncouragementEditorProps {
  id: string;
  initial: {
    title: string;
    issueNumber: number;
    slug: string;
    publishDate: string;
    status: string;
    intro: string;
    updates: string;
    scriptures: { ref: string; note?: string }[];
    guidance: string;
    notes: string;
    coverImageUrl: string;
    coverImageAlt: string;
    theme: string;
    voice: string;
    broadcastId: string | null;
    broadcastAt: string | null;
  };
}

type AiTarget =
  | "intro"
  | "updates"
  | "scripture"
  | "guidance"
  | "notes"
  | null;

export function EncouragementEditor({ id, initial }: EncouragementEditorProps) {
  const [title, setTitle] = useState(initial.title);
  const [publishDate, setPublishDate] = useState(initial.publishDate);
  const [intro, setIntro] = useState(initial.intro);
  const [updates, setUpdates] = useState(initial.updates);
  const [scriptures, setScriptures] = useState(initial.scriptures);
  const [guidance, setGuidance] = useState(initial.guidance);
  const [notes, setNotes] = useState(initial.notes);
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl);
  const [coverImageAlt, setCoverImageAlt] = useState(initial.coverImageAlt);
  const [theme, setTheme] = useState(initial.theme);
  const [status, setStatus] = useState(initial.status);
  const voiceLabel =
    THEOLOGIAN_VOICES.find((v) => v.id === initial.voice)?.name ??
    (initial.voice === "custom"
      ? "Custom"
      : initial.voice
      ? initial.voice
      : "");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [aiTarget, setAiTarget] = useState<AiTarget>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        await updateEncouragement({
          id,
          title,
          intro,
          updates,
          scriptures,
          guidance,
          notes,
          coverImageUrl,
          coverImageAlt,
          publishDate: publishDate || null,
          theme,
        });
        setSavedAt(new Date());
        setSaveState("idle");
      } catch (err) {
        console.error(err);
        setSaveState("error");
      }
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    intro,
    updates,
    scriptures,
    guidance,
    notes,
    coverImageUrl,
    coverImageAlt,
    publishDate,
    theme,
  ]);

  const [sendBroadcast, setSendBroadcast] = useState(true);
  const [broadcastInfo, setBroadcastInfo] = useState<{
    id: string | null;
    at: string | null;
  }>({ id: initial.broadcastId, at: initial.broadcastAt });
  const [broadcastError, setBroadcastError] = useState<string>("");

  async function publishNow() {
    setBroadcastError("");
    startTransition(async () => {
      const result = await setEncouragementStatus(id, "published", {
        sendBroadcast,
      });
      setStatus("published");
      const b = result?.broadcast;
      if (b?.sent && b.broadcastId) {
        setBroadcastInfo({ id: b.broadcastId, at: new Date().toISOString() });
      } else if (b?.broadcastId && b.reason === "already sent") {
        // Already sent earlier — just reflect it.
        setBroadcastInfo({ id: b.broadcastId, at: initial.broadcastAt });
      } else if (b?.reason && sendBroadcast) {
        setBroadcastError(b.reason);
      }
    });
  }

  async function unpublish() {
    startTransition(async () => {
      await setEncouragementStatus(id, "draft");
      setStatus("draft");
    });
  }

  async function generateAi(target: Exclude<AiTarget, null>) {
    setAiTarget(target);
    setAiBusy(true);
    try {
      const prompts: Record<Exclude<AiTarget, null>, string> = {
        intro: `Write a 60-80 word warm pastoral intro for this week's encouragement titled "${title}". Voice: tender and tough, plain Anglo-Saxon, never em-dashes when commas work. No Christianese. Lead with what a man can recognize in his own week.`,
        updates: `Write a "This Week" updates section for the encouragement titled "${title}". 3 to 5 short bulleted items: gathering reminders, prayer requests, a verse-of-the-week, a practice. Plain language. About 100-150 words total.`,
        scripture: `Suggest two scripture references that anchor an encouragement titled "${title}". Output as JSON array: [{"ref":"Romans 5:3-4","note":"why it fits"}]. Never invent verses. If unsure, return only the references you are confident exist.`,
        guidance: `Write the "Guidance" section for an encouragement titled "${title}". 200-260 words. Pastoral elder voice. Anchor in scripture by reference. One specific concrete pastoral move at the end. No em-dashes, no clichés.`,
        notes: `Write a 60-80 word "Notes from the Watch" closing section for the encouragement titled "${title}". Personal, brief, signed warmly. No em-dashes.`,
      };

      const res = await fetch("/api/admin/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompts[target],
          context: { path: `/admin/encouragements/${id}` },
        }),
      });
      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        // Stream the raw text into the textarea so the user sees progress.
        if (target === "intro") setIntro(acc);
        else if (target === "updates") setUpdates(acc);
        else if (target === "guidance") setGuidance(acc);
        else if (target === "notes") setNotes(acc);
        // scripture: handled at the end
      }
      // Scrub em-dashes and hashtags from the FINAL text — system prompt
      // forbids them but the model still slips them in.
      const cleaned = scrubAiText(acc);
      if (target === "intro") setIntro(cleaned);
      else if (target === "updates") setUpdates(cleaned);
      else if (target === "guidance") setGuidance(cleaned);
      else if (target === "notes") setNotes(cleaned);
      if (target === "scripture") {
        try {
          const match = acc.match(/\[[\s\S]*\]/);
          if (match) {
            const arr = JSON.parse(match[0]) as {
              ref: string;
              note?: string;
            }[];
            setScriptures((prev) => [...prev, ...arr]);
          }
        } catch {
          // Couldn't parse — append the raw response as a note on a new ref
          setScriptures((prev) => [...prev, { ref: "(see notes)", note: acc.trim() }]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiBusy(false);
      setAiTarget(null);
    }
  }

  function addScripture() {
    setScriptures([...scriptures, { ref: "", note: "" }]);
  }
  function removeScripture(i: number) {
    setScriptures(scriptures.filter((_, idx) => idx !== i));
  }
  function updateScripture(i: number, patch: Partial<{ ref: string; note: string }>) {
    setScriptures(
      scriptures.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-12 md:py-14">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 -mx-6 mb-10 flex flex-wrap items-center gap-3 border-b border-stone/15 bg-iron/85 px-6 py-3 backdrop-blur md:-mx-12 md:px-12">
        <Link
          href="/admin/encouragements"
          className="inline-flex items-center gap-1.5 text-xs text-stone/65 transition-colors hover:text-brass"
        >
          <Icon name="arrow-right" size={12} className="rotate-180" />
          All
        </Link>
        <span className="section-mark text-stone/45">
          No. {initial.issueNumber}
        </span>
        <StatusPill status={status} />
        {broadcastInfo.id && (
          <span
            title={`Resend broadcast ${broadcastInfo.id}${broadcastInfo.at ? ` · sent ${broadcastInfo.at}` : ""}`}
            className="inline-flex items-center gap-1.5 border border-olive/40 bg-olive/10 px-2 py-1 text-[0.625rem] uppercase tracking-wider text-olive"
          >
            <Icon name="mail" size={10} />
            Sent
          </span>
        )}
        <div className="flex-1" />
        <span className="text-xs text-stone/55">
          {saveState === "saving"
            ? "Saving..."
            : saveState === "error"
            ? "Save failed"
            : savedAt
            ? `Saved ${savedAt.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}`
            : "Auto-saving"}
        </span>
        {status !== "published" && !broadcastInfo.id && (
          <label
            className="inline-flex items-center gap-1.5 text-[0.6875rem] text-stone/75"
            title="Send the letter to subscribers via Resend when published"
          >
            <input
              type="checkbox"
              checked={sendBroadcast}
              onChange={(e) => setSendBroadcast(e.target.checked)}
              className="h-3 w-3 accent-brass"
            />
            Email subscribers
          </label>
        )}
        {status === "published" ? (
          <button
            type="button"
            onClick={unpublish}
            disabled={pending}
            className="inline-flex h-9 items-center gap-2 border border-stone/30 bg-transparent px-4 text-xs font-medium uppercase tracking-wider text-stone transition-colors hover:border-brass hover:text-brass disabled:opacity-60"
          >
            Unpublish
          </button>
        ) : (
          <Magnetic strength={0.18}>
            <button
              type="button"
              onClick={publishNow}
              disabled={pending}
              className="lift inline-flex h-9 items-center gap-2 bg-brass px-4 text-xs font-medium uppercase tracking-wider text-ink transition-colors hover:bg-gold disabled:opacity-60"
            >
              {pending ? "Publishing..." : "Publish now"}
              <Icon name="send" size={12} />
            </button>
          </Magnetic>
        )}
      </div>

      {broadcastError && (
        <div className="-mt-6 mb-6 border border-oxblood/40 bg-oxblood/15 px-4 py-2 text-xs text-bone">
          Letter is published, but the email broadcast failed: {broadcastError}
        </div>
      )}

      {/* Title */}
      <section>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A title men remember on Wednesday"
          className="block w-full bg-transparent text-4xl font-medium leading-tight tracking-[-0.03em] text-bone placeholder:text-stone/30 focus:outline-none md:text-6xl"
          style={{ fontFamily: "var(--font-fraunces)" }}
        />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-stone/65">
            <span className="section-mark text-stone/55">Theme</span>
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Endurance"
              className="border border-stone/20 bg-transparent px-2 py-1 text-xs text-bone placeholder:text-stone/35 focus:border-brass focus:outline-none"
            />
          </label>
          {voiceLabel && (
            <span className="inline-flex items-center gap-1.5 border border-brass/40 bg-brass/10 px-2 py-1 text-[0.625rem] uppercase tracking-wider text-brass">
              <Icon name="sparkles" size={10} />
              {voiceLabel}
            </span>
          )}
          <label className="flex items-center gap-2 text-xs text-stone/65">
            <span className="section-mark text-stone/55">Publish date</span>
            <input
              type="date"
              value={publishDate ? publishDate.slice(0, 10) : ""}
              onChange={(e) => setPublishDate(e.target.value)}
              className="border border-stone/20 bg-transparent px-2 py-1 text-xs text-bone focus:border-brass focus:outline-none"
            />
          </label>
          <span className="section-mark text-stone/35">
            /{initial.slug}
          </span>
        </div>
      </section>

      {/* Cover image */}
      <Section
        title="Cover image"
        hint="Uploaded or AI-generated. Used at the top of the public encouragement page and as the share image."
      >
        <ImageField
          value={coverImageUrl}
          alt={coverImageAlt}
          onChange={(url, alt) => {
            setCoverImageUrl(url);
            if (alt != null) setCoverImageAlt(alt);
          }}
          folder="encouragements"
          defaultPrompt={`Cover image for an encouragement titled "${title}". Reverent, dignified, men-of-faith aesthetic.`}
        />
        {coverImageUrl && (
          <input
            value={coverImageAlt}
            onChange={(e) => setCoverImageAlt(e.target.value)}
            placeholder="Alt text (describe the image for screen readers)"
            className="mt-3 block w-full border border-stone/15 bg-transparent px-3 py-2 text-xs text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
          />
        )}
      </Section>

      <Section
        title="Intro"
        hint="60-80 word warm opening. Sets the tone."
        onAi={() => generateAi("intro")}
        aiBusy={aiBusy && aiTarget === "intro"}
      >
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={5}
          placeholder="Brothers, this week..."
          className="block w-full resize-none border border-stone/15 bg-transparent px-4 py-3 text-base leading-relaxed text-bone placeholder:text-stone/35 focus:border-brass focus:outline-none"
        />
      </Section>

      <Section
        title="Updates"
        hint="What's happening this week. Bullet a few items: gathering, prayer, a practice."
        onAi={() => generateAi("updates")}
        aiBusy={aiBusy && aiTarget === "updates"}
      >
        <textarea
          value={updates}
          onChange={(e) => setUpdates(e.target.value)}
          rows={6}
          placeholder="- Tuesday morning at the diner on 5th. 0600..."
          className="block w-full resize-none border border-stone/15 bg-transparent px-4 py-3 text-base leading-relaxed text-bone placeholder:text-stone/35 focus:border-brass focus:outline-none"
        />
      </Section>

      <Section
        title="Scriptures"
        hint="Verse references that anchor this week. Cite by ref only. Verse text is fetched at render time."
        onAi={() => generateAi("scripture")}
        aiBusy={aiBusy && aiTarget === "scripture"}
      >
        <ul className="space-y-3">
          {scriptures.map((s, i) => (
            <li
              key={i}
              className="grid grid-cols-[200px_1fr_auto] gap-3 border border-stone/15 bg-iron/30 p-3"
            >
              <input
                value={s.ref}
                onChange={(e) => updateScripture(i, { ref: e.target.value })}
                placeholder="Romans 5:3-4"
                className="bg-transparent px-2 py-1 text-sm font-medium text-bone focus:outline-none"
                style={{ fontFamily: "var(--font-jetbrains-mono)" }}
              />
              <input
                value={s.note ?? ""}
                onChange={(e) => updateScripture(i, { note: e.target.value })}
                placeholder="Why this verse this week"
                className="bg-transparent px-2 py-1 text-sm text-stone/85 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeScripture(i)}
                className="rounded-none p-1 text-stone/45 transition-colors hover:text-oxblood"
                aria-label="Remove"
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addScripture}
          className="mt-3 inline-flex h-8 items-center gap-1.5 border border-stone/20 bg-transparent px-3 text-xs text-stone/70 transition-colors hover:border-brass hover:text-brass"
        >
          <Icon name="plus" size={12} />
          Add a verse
        </button>
      </Section>

      <Section
        title="Guidance"
        hint="The pastoral teaching. 200-260 words. Anchor in one of the scriptures above."
        onAi={() => generateAi("guidance")}
        aiBusy={aiBusy && aiTarget === "guidance"}
      >
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          rows={10}
          placeholder="The teaching this week..."
          className="block w-full resize-none border border-stone/15 bg-transparent px-4 py-3 text-base leading-relaxed text-bone placeholder:text-stone/35 focus:border-brass focus:outline-none"
        />
      </Section>

      <Section
        title="Notes from the Watch"
        hint="Closing word. Personal, brief, signed warmly."
        onAi={() => generateAi("notes")}
        aiBusy={aiBusy && aiTarget === "notes"}
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Stand watch, brothers..."
          className="block w-full resize-none border border-stone/15 bg-transparent px-4 py-3 text-base leading-relaxed text-bone placeholder:text-stone/35 focus:border-brass focus:outline-none"
        />
      </Section>

      {/* Footer hint */}
      <div className="mt-16 border-t border-stone/15 pt-6 text-xs text-stone/45">
        <p className="flex items-center gap-2">
          <Icon name="info" size={12} className="text-stone/40" />
          Auto-saves 700ms after you stop typing. Status changes are atomic.
          Publish broadcasts to <code className="text-brass">/encouragements/{initial.slug}</code>.
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  onAi,
  aiBusy,
  children,
}: {
  title: string;
  hint: string;
  onAi?: () => void;
  aiBusy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="flex items-center gap-3">
        <span className="section-mark text-brass">§ {title}</span>
        <HintTooltip hint={hint} />
        <div className="hairline flex-1" />
        {onAi && (
          <button
            type="button"
            onClick={onAi}
            disabled={aiBusy}
            className="inline-flex h-8 items-center gap-1.5 border border-brass/40 bg-brass/10 px-3 text-[0.625rem] font-medium uppercase tracking-wider text-brass transition-colors hover:bg-brass/20 disabled:opacity-60"
          >
            <Icon name="sparkles" size={12} />
            {aiBusy ? "Drafting..." : "Draft with AI"}
          </button>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "published"
      ? "border-olive/40 text-olive bg-olive/10"
      : status === "scheduled"
      ? "border-brass/40 text-brass bg-brass/10"
      : status === "archived"
      ? "border-stone/30 text-stone/60 bg-stone/5"
      : "border-stone/30 text-stone/70 bg-stone/5";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.18em] border",
        tone
      )}
    >
      {status}
    </span>
  );
}
