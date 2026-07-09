"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";

/**
 * "I'm interested" form for a group detail page. Posts to the existing
 * public interest API; the leader follows up by email. Copy preserved
 * from the retired /locations/[id] page.
 */
export function GroupInterestForm({ locationId }: { locationId: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/locations/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, ...form }),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      /* the retry is the form staying on screen */
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
      <Field
        label="Name"
        required
        value={form.name}
        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
      />
      <Field
        label="Email"
        type="email"
        required
        value={form.email}
        onChange={(v) => setForm((f) => ({ ...f, email: v }))}
      />
      <Field
        label="Phone (optional)"
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
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="mt-3 w-full border border-foreground/20 bg-transparent px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
        />
      </div>
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
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  type?: string;
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 h-11 w-full border border-foreground/20 bg-transparent px-4 text-base text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
      />
    </div>
  );
}
