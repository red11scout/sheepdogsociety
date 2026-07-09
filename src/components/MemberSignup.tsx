"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { SMS_OPT_IN_DISCLOSURE } from "@/lib/sms/disclosure";

/**
 * Phase D — single-screen member signup. No multi-step. No account.
 * Submits to /api/members. On success, swaps in the covenant share card.
 */

type Intent = "join" | "start" | "just_keep_posted";
type Timeline = "now" | "three_months" | "exploring";

export interface GroupOption {
  id: string;
  label: string; // e.g. "Ball Ground · Tuesday 6:30am"
}

interface MemberSignupProps {
  /** Group options for the join-a-group picker. Pass `[]` to omit picker. */
  groups: GroupOption[];
  /** Pre-select a group id if the user came from /groups/[id]. */
  preselectedGroupId?: string;
  /** Where the visitor came from. Logged for admin source tracking. */
  source?: string;
  /** Compact = embedded modal; default = full-page. */
  variant?: "default" | "compact";
}

type SubmitResult = {
  ok: boolean;
  memberId?: string;
  covenantUrl?: string;
  smsStatus?: string;
  error?: string;
};

export function MemberSignup({
  groups,
  preselectedGroupId,
  source,
  variant = "default",
}: MemberSignupProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState<Intent>("join");
  const [groupId, setGroupId] = useState<string>(preselectedGroupId ?? "");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [timeline, setTimeline] = useState<Timeline>("now");
  const [note, setNote] = useState("");
  const [wantsNewsletter, setWantsNewsletter] = useState(true);
  const [wantsEvents, setWantsEvents] = useState(true);
  const [wantsSms, setWantsSms] = useState(false);
  const [terms, setTerms] = useState(false);

  // Honeypot — bots fill this, humans never see it.
  const [honeypot, setHoneypot] = useState("");

  const [submitting, startTransition] = useTransition();
  const [result, setResult] = useState<SubmitResult | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!terms) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            phone: phone || undefined,
            intent,
            groupId: intent === "join" && groupId ? groupId : undefined,
            city: intent === "start" && city ? city : undefined,
            state: intent === "start" && state ? state : undefined,
            zip: intent === "start" && zip ? zip : undefined,
            timeline: intent === "start" ? timeline : undefined,
            note: note || undefined,
            wantsNewsletter,
            wantsEvents,
            wantsSms: !!phone && wantsSms,
            source,
            honeypot,
            smsConsentTextShown: wantsSms ? SMS_OPT_IN_DISCLOSURE : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setResult({ ok: false, error: data?.error ?? "Something broke. Try again." });
          return;
        }
        setResult({
          ok: true,
          memberId: data.memberId,
          covenantUrl: data.covenantUrl,
          smsStatus: data.smsStatus,
        });
      } catch {
        setResult({ ok: false, error: "Network hiccup. Try again in a moment." });
      }
    });
  }

  if (result?.ok && result.covenantUrl) {
    return <CovenantSuccess covenantUrl={result.covenantUrl} firstName={firstNameOf(name)} smsStatus={result.smsStatus} />;
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

      {/* Name + email */}
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

      {/* Phone (optional) */}
      <Field label="Phone (optional)" hint="Only if you want event texts. We never share it.">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          placeholder="+1 404 555 1234"
          className={inputCls()}
        />
      </Field>

      {/* Intent */}
      <Field label="Why are you here?" required>
        <div className="grid gap-2 md:grid-cols-3">
          <Segment selected={intent === "join"} onClick={() => setIntent("join")}>
            Join a group
          </Segment>
          <Segment selected={intent === "start"} onClick={() => setIntent("start")}>
            Start a group
          </Segment>
          <Segment
            selected={intent === "just_keep_posted"}
            onClick={() => setIntent("just_keep_posted")}
          >
            Just keep me posted
          </Segment>
        </div>
      </Field>

      {/* Conditional: join → group picker */}
      {intent === "join" && groups.length > 0 && (
        <Field
          label="Which group?"
          hint="Pick one. The leader will follow up by email."
        >
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
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
      )}

      {/* Conditional: start → city + timeline */}
      {intent === "start" && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="City" required>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className={inputCls()}
              />
            </Field>
            <Field label="State" required>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                maxLength={2}
                placeholder="GA"
                required
                className={inputCls()}
              />
            </Field>
            <Field label="Zip">
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                maxLength={10}
                className={inputCls()}
              />
            </Field>
          </div>
          <Field label="Timeline">
            <div className="grid gap-2 md:grid-cols-3">
              <Segment selected={timeline === "now"} onClick={() => setTimeline("now")}>
                Ready now
              </Segment>
              <Segment selected={timeline === "three_months"} onClick={() => setTimeline("three_months")}>
                Within three months
              </Segment>
              <Segment selected={timeline === "exploring"} onClick={() => setTimeline("exploring")}>
                Just exploring
              </Segment>
            </div>
          </Field>
        </>
      )}

      {/* Free-form note */}
      <Field
        label={
          intent === "start"
            ? "Why this group? (optional)"
            : "Anything you want a leader to know? (optional)"
        }
      >
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className={`${inputCls()} resize-y`}
        />
      </Field>

      {/* Notification preferences */}
      <fieldset className="border-t border-foreground/15 pt-6">
        <legend className="section-mark text-brass">§ Reach me</legend>
        <div className="mt-4 space-y-3">
          <Toggle checked={wantsNewsletter} onChange={setWantsNewsletter}>
            Email me the weekly Letter.
          </Toggle>
          <Toggle checked={wantsEvents} onChange={setWantsEvents}>
            Email me when there is a gathering nearby.
          </Toggle>
          {phone && (
            <Toggle checked={wantsSms} onChange={setWantsSms}>
              Text me a heads-up before events.
            </Toggle>
          )}
        </div>
        {phone && wantsSms && (
          <p className="mt-3 max-w-prose text-xs leading-relaxed text-muted-foreground">
            {SMS_OPT_IN_DISCLOSURE}
          </p>
        )}
      </fieldset>

      {/* Terms */}
      <Toggle checked={terms} onChange={setTerms}>
        I agree to the{" "}
        <Link href="/privacy" className="underline decoration-brass underline-offset-4 hover:text-brass">
          Privacy Policy
        </Link>
        {phone && wantsSms && (
          <>
            {" "}and{" "}
            <Link href="/sms-terms" className="underline decoration-brass underline-offset-4 hover:text-brass">
              SMS Terms
            </Link>
          </>
        )}
        .
      </Toggle>

      {/* Error */}
      {result?.ok === false && (
        <p className="border border-oxblood/40 bg-oxblood/10 px-4 py-3 text-sm text-oxblood">
          {result.error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={
          submitting ||
          !terms ||
          !name.trim() ||
          !email.trim() ||
          (intent === "start" && (!city.trim() || !state.trim()))
        }
        className="lift inline-flex h-12 items-center gap-3 bg-foreground px-6 text-sm font-medium uppercase tracking-[0.18em] text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Sending…" : variant === "compact" ? "Save my seat" : "There is a chair"}
        {!submitting && <Icon name="arrow-right" size={16} />}
      </button>

      <p className="text-xs leading-relaxed text-muted-foreground">
        No password. No account. We will not show up uninvited.
      </p>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────────────────────

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

function Segment({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`h-11 border px-4 text-sm transition-colors ${
        selected
          ? "border-brass bg-brass text-iron"
          : "border-foreground/15 bg-transparent text-foreground hover:border-brass/60"
      }`}
    >
      {children}
    </button>
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

function firstNameOf(full: string): string {
  return full.trim().split(/\s+/)[0] ?? "brother";
}

// ────────────────────────────────────────────────────────────────────────────
// Success state — covenant card preview + share moment.
// ────────────────────────────────────────────────────────────────────────────

function CovenantSuccess({
  covenantUrl,
  firstName,
  smsStatus,
}: {
  covenantUrl: string;
  firstName: string;
  smsStatus?: string;
}) {
  const shareText = `A brother saved you a seat. ${typeof window !== "undefined" ? window.location.origin : "https://www.acts2028sheepdogsociety.com"}/join`;

  return (
    <div className="space-y-10">
      <div>
        <span className="section-mark text-brass">§ A brother saved you a seat</span>
        <h2 className="display-xl mt-4 text-[clamp(2rem,5vw,4rem)] text-foreground">
          Welcome, {firstName}.
        </h2>
        <p className="mt-6 max-w-prose font-pullquote text-xl italic text-foreground/70">
          Check your email — a leader will follow up. In the meantime, here is your watch card. Save it. Text it to a brother who needs to hear about this.
        </p>
      </div>

      {/* Covenant card preview — actual share image is the OG response. */}
      <div className="overflow-hidden border border-foreground/15 bg-iron">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={covenantUrl}
          alt={`${firstName}'s watch card — Acts 20:28`}
          className="block w-full"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={covenantUrl}
          download={`watch-card-${firstName.toLowerCase()}.png`}
          className="lift inline-flex h-12 items-center gap-3 bg-brass px-6 text-sm font-medium uppercase tracking-[0.18em] text-iron transition-colors hover:bg-gold"
        >
          Save image
          <Icon name="download" size={16} />
        </a>
        <a
          href={`sms:?&body=${encodeURIComponent(shareText)}`}
          className="lift inline-flex h-12 items-center gap-3 border border-foreground px-6 text-sm font-medium uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          Text a brother
          <Icon name="arrow-right" size={16} />
        </a>
      </div>

      {smsStatus === "not_configured" && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Heads up: text reminders are still being set up. We logged your
          preference and will start sending them once Twilio approves us. You
          will get the email reminders in the meantime.
        </p>
      )}

      <p className="border-t border-foreground/15 pt-6 text-xs leading-relaxed text-muted-foreground">
        You can update preferences or unsubscribe from any email we send.
        Reply STOP to any text we send. We will not show up uninvited.
      </p>
    </div>
  );
}
