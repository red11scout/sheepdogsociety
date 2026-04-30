"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Magnetic } from "@/components/motion/Magnetic";

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

export default function RequestLocationPage() {
  const [form, setForm] = useState({
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    proposedCity: "",
    proposedState: "",
    proposedMeetingDetails: "",
    reason: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/locations/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      /* fail silently */
    }
    setSubmitting(false);
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <>
      <title>Plant a group — Sheepdog Society</title>
      <meta
        name="description"
        content="Request to start a new Sheepdog Society group in your area."
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-bone text-iron">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <Link
            href="/locations"
            className="inline-flex items-center gap-2 section-mark text-iron/60 hover:text-brass"
          >
            <Icon name="arrow-right" size={12} className="rotate-180" />
            All groups
          </Link>
          <div className="mt-10 flex items-center gap-4">
            <span className="section-mark">§ Plant a group</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6rem)]">
            Ready to lead?
            <br />
            <span className="text-brass">Start one here.</span>
          </h1>
          <p className="mt-10 max-w-2xl font-pullquote text-xl italic leading-relaxed text-iron/70 md:text-2xl">
            Two to twelve men. Weekly Scripture study. Tell us about your
            vision and we will set up a video call.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-12 md:py-32">
          {submitted ? (
            <div className="border border-brass/40 bg-iron/40 p-12 text-center">
              <Icon
                name="check"
                size={48}
                strokeWidth={2.25}
                className="mx-auto text-brass"
              />
              <h2 className="display-xl mt-8 text-3xl text-bone md:text-4xl">
                Request received.
              </h2>
              <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-stone">
                We will reach out to schedule a call. Welcome to the
                brotherhood.
              </p>
              <Link
                href="/locations"
                className="mt-8 inline-flex items-center gap-2 section-mark text-brass hover:opacity-70"
              >
                View all groups
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-8">
              <div className="flex items-center gap-4">
                <span className="section-mark text-brass">§ Your details</span>
                <div className="hairline flex-1" />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <DarkField
                  label="Your name"
                  required
                  value={form.requesterName}
                  onChange={(v) => update("requesterName", v)}
                />
                <DarkField
                  label="Email"
                  type="email"
                  required
                  value={form.requesterEmail}
                  onChange={(v) => update("requesterEmail", v)}
                />
              </div>

              <DarkField
                label="Phone (optional)"
                value={form.requesterPhone}
                onChange={(v) => update("requesterPhone", v)}
              />

              <div className="mt-4 flex items-center gap-4">
                <span className="section-mark text-brass">§ Where</span>
                <div className="hairline flex-1" />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <DarkField
                  label="City"
                  required
                  value={form.proposedCity}
                  onChange={(v) => update("proposedCity", v)}
                />
                <div>
                  <label className="section-mark text-stone/60">
                    State<span className="ml-1 text-brass">*</span>
                  </label>
                  <select
                    value={form.proposedState}
                    onChange={(e) => update("proposedState", e.target.value)}
                    required
                    className="mt-3 h-11 w-full border border-stone/25 bg-transparent px-4 text-sm text-bone focus:border-brass focus:outline-none"
                  >
                    <option value="" className="bg-iron text-bone">
                      Select state
                    </option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s} className="bg-iron text-bone">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="section-mark text-stone/60">
                  Proposed meeting day, time, place
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Saturday mornings 7am at the diner on 5th"
                  value={form.proposedMeetingDetails}
                  onChange={(e) =>
                    update("proposedMeetingDetails", e.target.value)
                  }
                  className="mt-3 w-full border border-stone/25 bg-transparent px-4 py-3 text-base leading-relaxed text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
                />
              </div>

              <div>
                <label className="section-mark text-stone/60">
                  Why you want to lead a group
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about yourself and your vision."
                  value={form.reason}
                  onChange={(e) => update("reason", e.target.value)}
                  className="mt-3 w-full border border-stone/25 bg-transparent px-4 py-3 text-base leading-relaxed text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
                />
              </div>

              <Magnetic strength={0.18}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="lift inline-flex h-12 items-center gap-2 border border-bone bg-bone px-8 text-sm font-medium uppercase tracking-wider text-iron transition-colors hover:bg-stone disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit request"}
                  {!submitting && <Icon name="arrow-right" size={16} />}
                </button>
              </Magnetic>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

function DarkField({
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
  return (
    <div>
      <label className="section-mark text-stone/60">
        {label}
        {required && <span className="ml-1 text-brass">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 h-11 w-full border border-stone/25 bg-transparent px-4 text-base text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
      />
    </div>
  );
}
