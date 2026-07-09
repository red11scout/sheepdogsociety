"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Magnetic } from "@/components/motion/Magnetic";

const SUGGESTIONS = [
  "I am drifting from my wife.",
  "I haven't prayed in months.",
  "What does Acts 20:28 ask of me?",
  "My anger is hurting my kids.",
  "I am tired and I do not know why.",
  "What scripture should I sit with this week?",
];

type Status = "idle" | "streaming" | "done" | "error" | "rate-limited";

export function AskTheWatch() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const responseRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || status === "streaming") return;

    setStatus("streaming");
    setResponse("");
    setErrorMsg("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/public/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
        signal: controller.signal,
      });

      if (res.status === 429) {
        setStatus("rate-limited");
        setErrorMsg(
          "Easy, brother. We have to slow down for a moment. Try again in a few minutes."
        );
        return;
      }
      if (!res.ok || !res.body) {
        throw new Error(await res.text());
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setResponse(acc);
        responseRef.current?.scrollTo({
          top: responseRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
      setStatus("done");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStatus("error");
      setErrorMsg("Something broke. Try again.");
    }
  }

  function reset() {
    abortRef.current?.abort();
    setPrompt("");
    setResponse("");
    setStatus("idle");
    setErrorMsg("");
    textareaRef.current?.focus();
  }

  function applySuggestion(s: string) {
    setPrompt(s);
    textareaRef.current?.focus();
  }

  const showResponse = status !== "idle" && (response || errorMsg);

  return (
    <div className="relative isolate w-full">
      <form onSubmit={handleAsk} className="relative">
        <div
          className={`group relative border bg-background/40 backdrop-blur transition-colors ${
            status === "streaming"
              ? "border-brass shadow-[0_0_60px_-8px_rgba(212,160,42,0.45)]"
              : "border-stone/20 hover:border-stone/40 focus-within:border-brass"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleAsk(e as unknown as FormEvent);
              }
            }}
            placeholder="Tell us what you are carrying."
            rows={3}
            maxLength={1200}
            disabled={status === "streaming"}
            className="block w-full resize-none bg-transparent px-6 py-6 font-pullquote text-2xl italic leading-relaxed text-foreground placeholder:text-stone/40 focus:outline-none disabled:opacity-50 md:px-8 md:py-7 md:text-3xl"
          />
          <div className="flex items-center justify-between border-t border-stone/15 px-6 py-3 md:px-8">
            <span className="section-mark text-stone/50">
              {status === "streaming" ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse bg-brass" />
                  Watching
                </span>
              ) : (
                <span>⌘ + Enter to send</span>
              )}
            </span>
            <Magnetic strength={0.18}>
              <button
                type="submit"
                disabled={!prompt.trim() || status === "streaming"}
                className="lift inline-flex h-10 items-center gap-2 bg-brass px-5 text-xs font-medium uppercase tracking-[0.18em] text-iron transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === "streaming" ? "Listening" : "Ask"}
                {status !== "streaming" && (
                  <Icon name="arrow-right" size={14} />
                )}
              </button>
            </Magnetic>
          </div>
        </div>
      </form>

      {/* Suggestions */}
      {status === "idle" && !prompt && (
        <div className="mt-6 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => applySuggestion(s)}
              className="border border-stone/15 bg-background/20 px-3 py-1.5 text-xs text-stone/70 transition-all hover:border-brass/60 hover:bg-background/40 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Streaming response */}
      {showResponse && (
        <div className="mt-10 reveal is-visible">
          <div className="flex items-center gap-4">
            <span className="section-mark text-brass">
              § A Brother Replies
            </span>
            <div className="hairline flex-1" />
            {status === "done" || status === "error" || status === "rate-limited" ? (
              <button
                type="button"
                onClick={reset}
                className="section-mark text-stone/60 transition-colors hover:text-brass"
              >
                Ask again
              </button>
            ) : null}
          </div>
          <div
            ref={responseRef}
            className="mt-6 max-h-[420px] overflow-y-auto pr-2 font-pullquote text-xl leading-relaxed text-foreground md:text-2xl"
          >
            {errorMsg ? (
              <p className="italic text-stone">{errorMsg}</p>
            ) : (
              <div className="space-y-5 whitespace-pre-wrap italic">
                {response}
                {status === "streaming" && (
                  <span className="inline-block h-5 w-[3px] translate-y-1 animate-pulse bg-brass" />
                )}
              </div>
            )}
          </div>

          {status === "done" && (
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Magnetic>
                <Link
                  href="/groups"
                  className="lift group inline-flex h-11 items-center gap-2 bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  Find a brother near you
                  <Icon
                    name="arrow-right"
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </Magnetic>
              <Magnetic strength={0.18}>
                <Link
                  href="/acts-20-28"
                  className="lift inline-flex h-11 items-center gap-2 border border-stone/30 bg-transparent px-6 text-sm font-medium text-foreground transition-colors hover:border-brass hover:text-brass"
                >
                  Read Acts 20:28
                </Link>
              </Magnetic>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
