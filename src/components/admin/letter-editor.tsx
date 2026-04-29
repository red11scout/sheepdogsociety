"use client";

import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { autosaveLetter, publishLetter } from "@/server/letters";

interface LetterEditorProps {
  letterId: string;
  initial: {
    title: string;
    subtitle: string;
    themeWord: string;
    body: object;
    bodyHtml: string;
    status: string;
    slug: string;
    issueNumber: number;
  };
}

export function LetterEditor({ letterId, initial }: LetterEditorProps) {
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [themeWord, setThemeWord] = useState(initial.themeWord);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "error">("idle");
  const [aiBusy, setAiBusy] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      LinkExtension.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      Placeholder.configure({
        placeholder: "Start with the passage. Then say the one thing.",
      }),
    ],
    content: initial.body,
    editorProps: {
      attributes: {
        class:
          "prose prose-stone dark:prose-invert max-w-[65ch] mx-auto min-h-[60vh] focus:outline-none font-body text-[19px] leading-[1.65]",
      },
    },
  });

  // Debounced autosave (500ms after last change)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!editor) return;
      setSavingState("saving");
      try {
        const html = editor.getHTML();
        const json = editor.getJSON();
        await autosaveLetter({
          id: letterId,
          title,
          subtitle: subtitle || undefined,
          themeWord: themeWord || undefined,
          body: json,
          bodyHtml: html,
          excerpt:
            (editor.getText().slice(0, 200).replace(/\s+/g, " ").trim() ||
              undefined),
        });
        setSavedAt(new Date());
        setSavingState("idle");
      } catch (err) {
        console.error(err);
        setSavingState("error");
      }
    }, 500);
  }, [editor, letterId, title, subtitle, themeWord]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => triggerSave();
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, triggerSave]);

  // Save on title/meta change too
  useEffect(() => {
    triggerSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle, themeWord]);

  // AI: Draft with Claude
  async function draftWithClaude() {
    if (!editor) return;
    const seed = window.prompt(
      "What's on your heart this week?",
      "Romans 5:3-4 — suffering produces endurance, but it's grace that fuels the grit."
    );
    if (!seed?.trim()) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed, tone: "Pastoral", length: "Medium" }),
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // Insert a paragraph at the cursor and stream into it.
      editor.commands.focus("end");
      editor.commands.insertContent("<p></p>");
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        // Replace last paragraph with running text
        editor.commands.setContent(initial.body); // reset body
        const parts = acc.split(/\n\n+/);
        const html = parts
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join("");
        editor.commands.insertContentAt(editor.state.doc.content.size, html);
      }
    } catch (err) {
      console.error(err);
      alert("Claude is having a moment. Try again, or write it yourself — your draft is safe.");
    } finally {
      setAiBusy(false);
      triggerSave();
    }
  }

  // AI: Improve selected text (rephrase / shorten / expand / pastoralize / fix grammar)
  async function improveSelection(action: string) {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text.trim()) {
      alert("Highlight some text first.");
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text }),
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
      }
      editor.chain().focus().deleteRange({ from, to }).insertContent(acc).run();
    } catch (err) {
      console.error(err);
      alert("Claude is busy. Try again in a moment.");
    } finally {
      setAiBusy(false);
      triggerSave();
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Topbar
        savedAt={savedAt}
        savingState={savingState}
        onPublish={() => setPublishOpen(true)}
        status={initial.status}
        issueNumber={initial.issueNumber}
      />

      <main className="px-6 pt-12 pb-32">
        <div className="max-w-[65ch] mx-auto">
          <input
            type="text"
            placeholder="Theme word (one word, e.g. Joy)"
            value={themeWord}
            onChange={(e) => setThemeWord(e.target.value)}
            className="block w-full font-body text-xs uppercase tracking-[0.18em] text-muted-foreground bg-transparent border-0 focus:outline-none mb-3"
          />
          <input
            type="text"
            placeholder="Untitled letter"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full font-display text-4xl md:text-5xl font-semibold tracking-tight bg-transparent border-0 focus:outline-none mb-4 placeholder:text-muted-foreground/40"
          />
          <input
            type="text"
            placeholder="Subtitle (the one big idea)"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="block w-full font-pullquote italic text-lg md:text-xl text-muted-foreground bg-transparent border-0 focus:outline-none mb-10 placeholder:text-muted-foreground/40"
          />

          {editor ? (
            <BubbleMenu
              editor={editor}
              className="flex gap-1 bg-foreground rounded-md shadow-lg p-1"
            >
              <BubbleAction onClick={() => improveSelection("rephrase")} disabled={aiBusy}>
                ✦ Rephrase
              </BubbleAction>
              <BubbleAction onClick={() => improveSelection("shorten")} disabled={aiBusy}>
                Shorten
              </BubbleAction>
              <BubbleAction onClick={() => improveSelection("expand")} disabled={aiBusy}>
                Expand
              </BubbleAction>
              <BubbleAction onClick={() => improveSelection("fix-grammar")} disabled={aiBusy}>
                Fix
              </BubbleAction>
              <BubbleAction onClick={() => improveSelection("pastoralize")} disabled={aiBusy}>
                Pastoral
              </BubbleAction>
            </BubbleMenu>
          ) : null}

          <EditorContent editor={editor} />

          {editor && editor.getText().trim().length === 0 ? (
            <div className="mt-12 border border-dashed border-border rounded p-6 text-center">
              <p className="font-body text-sm text-muted-foreground mb-3">
                Empty page. Start typing, or:
              </p>
              <button
                type="button"
                onClick={draftWithClaude}
                disabled={aiBusy}
                className="rounded-full bg-primary px-5 py-2 font-body text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {aiBusy ? "Drafting…" : "✦ Draft with Claude"}
              </button>
            </div>
          ) : null}
        </div>
      </main>

      {publishOpen ? (
        <PublishPanel
          letterId={letterId}
          title={title}
          themeWord={themeWord}
          onClose={() => setPublishOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Topbar({
  savedAt,
  savingState,
  onPublish,
  status,
  issueNumber,
}: {
  savedAt: Date | null;
  savingState: "idle" | "saving" | "error";
  onPublish: () => void;
  status: string;
  issueNumber: number;
}) {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <a href="/admin/letters" className="font-body text-sm text-muted-foreground hover:text-foreground">
          ← Letters
        </a>
        <span className="font-body text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Issue No. {issueNumber} · {status}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <SavedIndicator savedAt={savedAt} state={savingState} />
        <button
          type="button"
          onClick={onPublish}
          className="rounded-full bg-primary px-5 py-2 font-body text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Publish ▾
        </button>
      </div>
    </header>
  );
}

function SavedIndicator({
  savedAt,
  state,
}: {
  savedAt: Date | null;
  state: "idle" | "saving" | "error";
}) {
  if (state === "saving") {
    return <span className="font-body text-xs text-muted-foreground">Saving…</span>;
  }
  if (state === "error") {
    return (
      <span className="font-body text-xs text-destructive">
        Save failed — retrying
      </span>
    );
  }
  if (!savedAt) {
    return <span className="font-body text-xs text-muted-foreground">Not saved yet</span>;
  }
  const sec = Math.max(1, Math.round((Date.now() - savedAt.getTime()) / 1000));
  return (
    <span className="font-body text-xs text-muted-foreground">
      Saved · {sec}s ago
    </span>
  );
}

function BubbleAction({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 font-body text-xs text-background hover:bg-foreground/10 rounded disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function PublishPanel({
  letterId,
  title,
  themeWord,
  onClose,
}: {
  letterId: string;
  title: string;
  themeWord: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sendBroadcast, setSendBroadcast] = useState(true);
  const [publishWeb, setPublishWeb] = useState(true);
  const [emailSubject, setEmailSubject] = useState(title);
  const [emailPreview, setEmailPreview] = useState("");

  function startPublishCountdown() {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c === null) {
          clearInterval(timer);
          return null;
        }
        if (c <= 1) {
          clearInterval(timer);
          startTransition(async () => {
            if (publishWeb) {
              await publishLetter({
                id: letterId,
                themeWord: themeWord || undefined,
                sendBroadcast,
                emailSubject: emailSubject || undefined,
                emailPreviewText: emailPreview || undefined,
              });
            }
            window.location.href = "/admin/letters";
          });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function cancelCountdown() {
    setCountdown(null);
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-2xl font-semibold mb-2">
          Publish this letter?
        </h2>
        <p className="font-body text-sm text-muted-foreground mb-6">
          Live on the website immediately. Email broadcast sends to the full
          audience.
        </p>

        <div className="border border-border rounded p-4 mb-6">
          <p className="font-body text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">
            Going live
          </p>
          <p className="font-display text-lg">{title || "Untitled letter"}</p>
          {themeWord ? (
            <p className="font-body text-xs uppercase tracking-[0.18em] text-muted-foreground mt-1">
              {themeWord}
            </p>
          ) : null}
        </div>

        <div className="space-y-4 mb-6">
          <label className="block">
            <span className="font-body text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1 block">
              Email subject
            </span>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder={title}
              className="w-full px-3 py-2 border border-border rounded font-body text-sm bg-background"
            />
          </label>
          <label className="block">
            <span className="font-body text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1 block">
              Preview text (60-90 chars)
            </span>
            <input
              type="text"
              maxLength={90}
              value={emailPreview}
              onChange={(e) => setEmailPreview(e.target.value)}
              placeholder="Shows next to the subject in inboxes"
              className="w-full px-3 py-2 border border-border rounded font-body text-sm bg-background"
            />
          </label>

          <div className="space-y-2 border-t border-border pt-4">
            <label className="flex items-center gap-2 font-body text-sm">
              <input
                type="checkbox"
                checked={publishWeb}
                onChange={(e) => setPublishWeb(e.target.checked)}
                className="rounded"
              />
              <span>Publish on website</span>
            </label>
            <label className="flex items-center gap-2 font-body text-sm">
              <input
                type="checkbox"
                checked={sendBroadcast}
                onChange={(e) => setSendBroadcast(e.target.checked)}
                className="rounded"
              />
              <span>Send to email subscribers</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          {countdown === null ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                autoFocus
                className="px-4 py-2 rounded-full border border-border font-body text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startPublishCountdown}
                disabled={pending || (!publishWeb && !sendBroadcast)}
                className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-body font-semibold text-sm disabled:opacity-50"
              >
                🚀 Send & publish
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={cancelCountdown}
                className="px-4 py-2 rounded-full bg-destructive text-destructive-foreground font-body font-semibold text-sm"
              >
                Cancel
              </button>
              <p className="font-body text-sm text-muted-foreground py-2">
                Publishing in {countdown}…
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
