"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Magnetic } from "@/components/motion/Magnetic";

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "joining", label: "Joining a group" },
  { value: "starting", label: "Starting a group" },
  { value: "leadership", label: "Leadership" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "general",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/contact", {
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

  return (
    <>
      <title>Contact — Sheepdog Society</title>
      <meta
        name="description"
        content="Get in touch with Sheepdog Society. We read every note."
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-bone text-iron">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Contact</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6rem)]">
            Send a note.
            <br />
            <span className="text-brass">We read every one.</span>
          </h1>
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
                Message received.
              </h2>
              <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-stone">
                Thank you, brother. We will get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-8">
              <div className="flex items-center gap-4">
                <span className="section-mark text-brass">§ Your message</span>
                <div className="hairline flex-1" />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
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
              </div>

              <div>
                <label className="section-mark text-stone/60">Topic</label>
                <select
                  value={form.topic}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, topic: e.target.value }))
                  }
                  className="mt-3 h-11 w-full border border-stone/25 bg-transparent px-4 text-sm text-bone focus:border-brass focus:outline-none"
                >
                  {TOPICS.map((t) => (
                    <option
                      key={t.value}
                      value={t.value}
                      className="bg-iron text-bone"
                    >
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="section-mark text-stone/60">Message</label>
                <textarea
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                  className="mt-3 w-full border border-stone/25 bg-transparent px-4 py-3 text-base leading-relaxed text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
                />
              </div>

              <Magnetic strength={0.18}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="lift inline-flex h-12 items-center gap-2 border border-bone bg-bone px-8 text-sm font-medium uppercase tracking-wider text-iron transition-colors hover:bg-stone disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Sending..." : "Send message"}
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
