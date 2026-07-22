"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

export interface GroupOption {
  id: string; // locations.id
  label: string; // e.g. "Ball Ground · Tuesday 6:30am"
}

/**
 * The /join "Join a group" path. Files a Group Interest — the admin
 * approves it into the members database, and if a specific group is
 * picked the leader gets an automatic introduction email.
 */
export function JoinGroupForm({
  groups,
  preselectedGroupId,
}: {
  groups: GroupOption[];
  preselectedGroupId?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [locationId, setLocationId] = useState(preselectedGroupId ?? "");
  const [message, setMessage] = useState("");
  const [wantsNewsletter, setWantsNewsletter] = useState(true);
  const [terms, setTerms] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!terms) return;
    startTransition(async () => {
      setError("");
      try {
        const res = await fetch("/api/public/locations/interest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationId: locationId || undefined,
            name,
            email,
            phone: phone || undefined,
            message: message || undefined,
            wantsNewsletter,
            honeypot,
          }),
        });
        if (res.ok) setSubmitted(true);
        else setError("That did not go through. Check your details and try again.");
      } catch {
        setError("Network hiccup. Try again in a moment.");
      }
    });
  }

  if (submitted) {
    const picked = groups.find((g) => g.id === locationId);
    return (
      <div className="border border-brass/40 p-12 text-center">
        <Icon name="check" size={48} strokeWidth={2.25} className="mx-auto text-brass" />
        <h3 className="display-xl mt-8 text-3xl md:text-4xl">A seat is saved.</h3>
        <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-muted-foreground">
          {picked
            ? "The leader has your name. Check your email — he will reach out to welcome you."
            : "Check your email. We will point you to the right table."}
        </p>
        <Link
          href="/groups"
          className="mt-8 inline-flex items-center gap-2 section-mark transition-colors hover:text-brass"
        >
          View all groups
          <Icon name="arrow-right" size={14} />
        </Link>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className={inputCls()}
          />
        </Field>
        <Field label="Email" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={inputCls()}
          />
        </Field>
      </div>

      <Field label="Phone (optional)" hint="Only if you want a call or text back. We never share it.">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          placeholder="+1 404 555 1234"
          className={inputCls()}
        />
      </Field>

      <Field
        label="Which group?"
        hint="Pick one and the leader gets your name right away. No preference is fine too."
      >
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className={inputCls()}
        >
          <option value="">No preference yet — surprise me</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Anything you want a leader to know? (optional)">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={2000}
          className={`${inputCls()} resize-y`}
        />
      </Field>

      <fieldset className="border-t border-foreground/15 pt-6">
        <legend className="section-mark text-brass">§ Reach me</legend>
        <div className="mt-4">
          <Toggle checked={wantsNewsletter} onChange={setWantsNewsletter}>
            Email me the weekly Letter.
          </Toggle>
        </div>
      </fieldset>

      <Toggle checked={terms} onChange={setTerms}>
        I agree to the{" "}
        <Link href="/privacy" className="underline decoration-brass underline-offset-4 hover:text-brass">
          Privacy Policy
        </Link>
        .
      </Toggle>

      {error && (
        <p className="border border-oxblood/40 bg-oxblood/10 px-4 py-3 text-sm text-oxblood">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !terms || !name.trim() || !email.trim()}
        className="lift inline-flex h-12 items-center gap-3 bg-foreground px-6 text-sm font-medium uppercase tracking-[0.18em] text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Sending…" : "There is a chair"}
        {!submitting && <Icon name="arrow-right" size={16} />}
      </button>

      <p className="text-xs leading-relaxed text-muted-foreground">
        No password. No account. We will not show up uninvited.
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="section-mark text-muted-foreground">
        § {label}
        {required && <span className="ml-1 text-brass">*</span>}
      </span>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 shrink-0 cursor-pointer accent-brass"
      />
      <span className="text-sm leading-relaxed text-foreground">{children}</span>
    </label>
  );
}

function inputCls() {
  return "block h-11 w-full border border-foreground/15 bg-transparent px-3 text-base text-foreground placeholder:text-foreground/30 focus:border-brass focus:outline-none";
}
