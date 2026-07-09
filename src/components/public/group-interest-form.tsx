"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";

/**
 * "I'm interested" form for a group detail page. Posts to the existing
 * public interest API; the route notifies shepherd@ so a human sees
 * every submission (this table previously had no reader at all).
 */
export function GroupInterestForm({ locationId }: { locationId: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      const res = await fetch("/api/public/locations/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, ...form, honeypot }),
      });
      if (res.ok) setSubmitted(true);
      else setError(true);
    } catch {
      setError(true);
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="mt-10 flex items-start gap-4 border border-brass/40 p-6 md:p-8">
        <Icon name="check" size={24} className="text-brass" />
        <p className="font-pullquote text-lg italic leading-relaxed md:text-xl">
          Thank you, brother. The group leader will be in touch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 grid gap-6">
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
      <Field
        label="Name"
        required
        maxLength={200}
        value={form.name}
        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
      />
      <Field
        label="Email"
        type="email"
        required
        maxLength={254}
        value={form.email}
        onChange={(v) => setForm((f) => ({ ...f, email: v }))}
      />
      <Field
        label="Phone (optional)"
        maxLength={30}
        value={form.phone}
        onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
      />
      <div>
        <label className="folio" htmlFor="interest-message">
          Anything you want the leader to know
        </label>
        <textarea
          id="interest-message"
          rows={4}
          maxLength={2000}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="mt-3 w-full border border-foreground/20 bg-transparent px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">
          That did not go through. Check your details and try again.
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={submitting}
          className="lift inline-flex h-12 cursor-pointer items-center gap-2 bg-foreground px-8 text-sm font-medium uppercase tracking-wider text-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Sending..." : "I'm interested"}
          {!submitting && <Icon name="arrow-right" size={16} />}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  type = "text",
  maxLength,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = `interest-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div>
      <label className="folio" htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-brass">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 h-11 w-full border border-foreground/20 bg-transparent px-4 text-base text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
      />
    </div>
  );
}
