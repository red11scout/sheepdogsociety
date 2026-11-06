"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Magnetic } from "@/components/motion/Magnetic";
import { Kicker } from "@/components/public/kicker";

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "joining", label: "Joining a group" },
  { value: "starting", label: "Starting a group" },
  { value: "leadership", label: "Leadership" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
];

interface ContactFormProps {
  /** "page" is the full /contact section; "dialog" is the compact form
   *  inside MessageLink's dialog (no outer padding, no kicker). */
  variant?: "page" | "dialog";
  /** Pre-selected topic value (see TOPICS). */
  defaultTopic?: string;
}

export default function ContactForm({
  variant = "page",
  defaultTopic,
}: ContactFormProps = {}) {
  // Two forms can be mounted at once (the /contact page plus the dialog
  // opened from its own hero), so field ids are instance-scoped.
  const uid = useId();
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: TOPICS.some((t) => t.value === defaultTopic) ? (defaultTopic as string) : "general",
    message: "",
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
      const res = await fetch("/api/public/contact", {
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

  const compact = variant === "dialog";
  const Wrapper = compact ? "div" : "section";

  return (
    <Wrapper className={compact ? "text-foreground" : "bg-background text-foreground"}>
      <div className={compact ? "pt-6" : "mx-auto max-w-3xl px-6 py-20 md:px-12 md:py-32"}>
        {submitted ? (
          <div
            role="status"
            className={`border border-brass/40 bg-background/40 text-center ${compact ? "p-8" : "p-12"}`}
          >
            <Icon
              name="check"
              size={48}
              strokeWidth={2.25}
              className="mx-auto text-brass"
            />
            <h2 className="display-xl mt-8 text-display-lg">
              Message received.
            </h2>
            <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-muted-foreground">
              Thank you, brother. We will get back to you soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={compact ? "grid gap-6" : "grid gap-8"}>
            {!compact && <Kicker left="Your message" />}

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

            <div className="grid gap-6 md:grid-cols-2">
              <Field
                id={`${uid}-name`}
                label="Name"
                required
                maxLength={200}
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              />
              <Field
                id={`${uid}-email`}
                label="Email"
                type="email"
                required
                maxLength={254}
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              />
            </div>

            <div>
              <label className="folio" htmlFor={`${uid}-topic`}>Topic</label>
              <select
                id={`${uid}-topic`}
                value={form.topic}
                onChange={(e) =>
                  setForm((f) => ({ ...f, topic: e.target.value }))
                }
                className="mt-3 h-11 w-full border border-foreground/20 bg-transparent px-4 text-sm text-foreground focus:border-brass focus:outline-none"
              >
                {TOPICS.map((t) => (
                  <option
                    key={t.value}
                    value={t.value}
                    className="bg-background text-foreground"
                  >
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="folio" htmlFor={`${uid}-message`}>Message</label>
              <textarea
                id={`${uid}-message`}
                required
                rows={compact ? 5 : 6}
                maxLength={5000}
                value={form.message}
                onChange={(e) =>
                  setForm((f) => ({ ...f, message: e.target.value }))
                }
                className="mt-3 w-full border border-foreground/20 bg-transparent px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-brass focus:outline-none"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">
                That did not go through. Check your details and try again.
              </p>
            )}

            <Magnetic strength={0.18}>
              <button
                type="submit"
                disabled={submitting}
                className="lift inline-flex h-12 items-center gap-2 bg-foreground px-7 text-sm font-medium uppercase tracking-wider text-background disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Send message"}
                {!submitting && <Icon name="arrow-right" size={16} />}
              </button>
            </Magnetic>
          </form>
        )}
      </div>
    </Wrapper>
  );
}

function Field({
  id,
  label,
  required,
  type = "text",
  maxLength,
  value,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="folio" htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-brass-deep">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 h-11 w-full border border-foreground/20 bg-transparent px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-brass focus:outline-none"
      />
    </div>
  );
}
