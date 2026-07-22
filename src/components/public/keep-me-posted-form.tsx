"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons/Icon";

/**
 * The /join "Keep me posted" path. Email-only: lands in the Subscribers
 * list and the Resend Audience, so the man gets the weekly Letter.
 */
export function KeepMePostedForm() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setError("");
      try {
        const res = await fetch("/api/public/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            firstName: firstName || undefined,
            honeypot,
          }),
        });
        if (res.ok) setSubmitted(true);
        else setError("That did not go through. Check the email and try again.");
      } catch {
        setError("Network hiccup. Try again in a moment.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="border border-brass/40 p-12 text-center">
        <Icon name="check" size={48} strokeWidth={2.25} className="mx-auto text-brass" />
        <h3 className="display-xl mt-8 text-3xl md:text-4xl">You are on the list.</h3>
        <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-muted-foreground">
          The weekly Letter lands every week. When you are ready for a table,
          the chair is still here.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {/* Honeypot — hidden via accessibility, not display:none (bots check that). */}
      <label className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <span>Leave blank</span>
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </label>

      <p className="max-w-2xl font-pullquote text-lede italic text-muted-foreground">
        Not ready to sit down yet? Take the weekly Letter. One email a week,
        anchored in Scripture. Unsubscribe any time.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="section-mark text-muted-foreground">§ First name (optional)</span>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            className="mt-2 block h-11 w-full border border-foreground/15 bg-transparent px-3 text-base text-foreground focus:border-brass focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="section-mark text-muted-foreground">
            § Email<span className="ml-1 text-brass">*</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-2 block h-11 w-full border border-foreground/15 bg-transparent px-3 text-base text-foreground focus:border-brass focus:outline-none"
          />
        </label>
      </div>

      {error && (
        <p className="border border-oxblood/40 bg-oxblood/10 px-4 py-3 text-sm text-oxblood">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !email.trim()}
        className="lift inline-flex h-12 items-center gap-3 bg-foreground px-6 text-sm font-medium uppercase tracking-[0.18em] text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Sending…" : "Send me the Letter"}
        {!submitting && <Icon name="arrow-right" size={16} />}
      </button>
    </form>
  );
}
