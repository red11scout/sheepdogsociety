"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

/**
 * Plant-a-group request form, extracted from the retired
 * /locations/request page for the /join start path. Posts to the
 * existing public API; copy preserved verbatim.
 */
export function PlantRequestForm() {
  const [form, setForm] = useState({
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    proposedCity: "",
    proposedState: "",
    proposedMeetingDetails: "",
    reason: "",
  });
  const [honeypot, setHoneypot] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      const res = await fetch("/api/public/locations/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, honeypot }),
      });
      if (res.ok) setSubmitted(true);
      else setError(true);
    } catch {
      setError(true);
    }
    setSubmitting(false);
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  if (submitted) {
    return (
      <div className="border border-brass/40 p-12 text-center">
        <Icon name="check" size={48} strokeWidth={2.25} className="mx-auto text-brass" />
        <h3 className="display-xl mt-8 text-3xl md:text-4xl">Request received.</h3>
        <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-muted-foreground">
          We will reach out to schedule a call. Welcome to the brotherhood.
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
    <form onSubmit={handleSubmit} className="grid gap-8">
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
        Two to twelve men. Weekly Scripture study. Tell us about your vision
        and we will set up a video call.
      </p>

      <div className="flex items-center gap-4">
        <span className="folio">Your details</span>
        <div className="hairline flex-1" aria-hidden />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Field
          label="Your name"
          required
          maxLength={200}
          value={form.requesterName}
          onChange={(v) => update("requesterName", v)}
        />
        <Field
          label="Email"
          type="email"
          required
          maxLength={254}
          value={form.requesterEmail}
          onChange={(v) => update("requesterEmail", v)}
        />
      </div>

      <Field
        label="Phone (optional)"
        maxLength={30}
        value={form.requesterPhone}
        onChange={(v) => update("requesterPhone", v)}
      />

      <div className="mt-4 flex items-center gap-4">
        <span className="folio">Where</span>
        <div className="hairline flex-1" aria-hidden />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Field
          label="City"
          required
          maxLength={200}
          value={form.proposedCity}
          onChange={(v) => update("proposedCity", v)}
        />
        <div>
          <label className="folio" htmlFor="plant-state">
            State<span className="ml-1 text-brass">*</span>
          </label>
          <select
            id="plant-state"
            value={form.proposedState}
            onChange={(e) => update("proposedState", e.target.value)}
            required
            className="mt-3 h-11 w-full border border-foreground/20 bg-transparent px-4 text-sm text-foreground focus:border-brass focus:outline-none"
          >
            <option value="" className="bg-background text-foreground">
              Select state
            </option>
            {US_STATES.map((s) => (
              <option key={s} value={s} className="bg-background text-foreground">
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="folio" htmlFor="plant-meeting">
          Proposed meeting day, time, place
        </label>
        <textarea
          id="plant-meeting"
          rows={3}
          maxLength={2000}
          placeholder="e.g. Saturday mornings 7am at the diner on 5th"
          value={form.proposedMeetingDetails}
          onChange={(e) => update("proposedMeetingDetails", e.target.value)}
          className="mt-3 w-full border border-foreground/20 bg-transparent px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
        />
      </div>

      <div>
        <label className="folio" htmlFor="plant-reason">
          Why you want to lead a group
        </label>
        <textarea
          id="plant-reason"
          rows={4}
          maxLength={2000}
          placeholder="Tell us about yourself and your vision."
          value={form.reason}
          onChange={(e) => update("reason", e.target.value)}
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
          {submitting ? "Submitting..." : "Submit request"}
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
  const id = `plant-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
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
