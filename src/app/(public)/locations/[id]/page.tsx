"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Magnetic } from "@/components/motion/Magnetic";

type LocationDetail = {
  id: string;
  name: string;
  description: string | null;
  latitude: string;
  longitude: string;
  address: string | null;
  city: string;
  state: string;
  zipCode: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  meetingPlace: string | null;
  groupSize: number | null;
  maxSize: number;
  contactName: string | null;
  contactEmail: string | null;
  signalGroupUrl: string | null;
  imageUrl: string | null;
};

export default function LocationDetailPage() {
  const params = useParams();
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [interestForm, setInterestForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/public/locations/${params.id}`)
      .then((r) => r.json())
      .then((data) => setLocation(data.location ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleInterest(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/locations/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: params.id,
          ...interestForm,
        }),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      /* fail silently */
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="bg-bone">
        <div className="mx-auto max-w-5xl px-6 py-32 md:px-12">
          <div className="h-8 w-48 animate-pulse bg-iron/10" />
          <div className="mt-6 h-72 animate-pulse bg-iron/10" />
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="bg-bone">
        <div className="mx-auto max-w-3xl px-6 py-32 text-center md:px-12">
          <Icon
            name="map-pin"
            size={48}
            strokeWidth={2}
            className="mx-auto text-iron/30"
          />
          <h1 className="display-xl mt-8 text-3xl text-iron md:text-4xl">
            Group not found.
          </h1>
          <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-iron/60">
            This group may no longer be active.
          </p>
          <Link
            href="/locations"
            className="mt-10 inline-flex items-center gap-2 section-mark text-brass hover:opacity-70"
          >
            <Icon name="arrow-right" size={14} className="rotate-180" />
            All groups
          </Link>
        </div>
      </div>
    );
  }

  const memberPart =
    location.groupSize != null
      ? `${location.groupSize} ${location.groupSize === 1 ? "man" : "men"}`
      : null;
  const meta = [memberPart, location.meetingDay, location.meetingTime]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <title>{`${location.name} — Sheepdog Society`}</title>

      {/* Hero */}
      <section className="relative overflow-hidden bg-iron text-bone">
        <div className="aurora" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <Link
            href="/locations"
            className="inline-flex items-center gap-2 section-mark text-stone/60 hover:text-brass"
          >
            <Icon name="arrow-right" size={12} className="rotate-180" />
            All groups
          </Link>
          <div className="mt-10 flex items-center gap-4">
            <span className="section-mark">
              § {location.city}, {location.state}
            </span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-8 max-w-4xl text-[clamp(2.5rem,7vw,6rem)] text-bone">
            {location.name}
          </h1>
          {meta && <p className="mt-8 section-mark text-brass">{meta}</p>}
          {location.description && (
            <p className="mt-8 max-w-2xl font-pullquote text-xl italic leading-relaxed text-stone md:text-2xl">
              {location.description}
            </p>
          )}
        </div>
      </section>

      {/* Details */}
      <section className="bg-bone text-iron">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-28">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Details</span>
            <div className="hairline flex-1" />
          </div>
          <div className="mt-10 grid gap-px bg-iron/10 md:grid-cols-2 lg:grid-cols-4">
            <Detail
              icon="clock"
              label="When"
              value={
                location.meetingDay
                  ? `${location.meetingDay}${location.meetingTime ? ` · ${location.meetingTime}` : ""}`
                  : "TBD"
              }
            />
            <Detail
              icon="map-pin"
              label="Where"
              value={location.meetingPlace || location.address || "TBD"}
            />
            <Detail
              icon="brothers"
              label="Group size"
              value={`${location.groupSize ?? 0} of ${location.maxSize} men`}
            />
            {location.contactName && (
              <Detail
                icon="mail"
                label="Contact"
                value={location.contactName}
              />
            )}
          </div>

          {location.signalGroupUrl && (
            <div className="mt-10 flex items-center justify-between border border-iron/10 bg-bone p-6 md:p-8">
              <div className="flex items-center gap-4">
                <Icon
                  name="message"
                  size={28}
                  strokeWidth={2}
                  className="text-brass"
                />
                <div>
                  <p className="display-xl text-lg text-iron md:text-xl">
                    Signal group
                  </p>
                  <p className="text-sm text-iron/60">
                    Join for between-meeting comms.
                  </p>
                </div>
              </div>
              <Magnetic strength={0.18}>
                <a
                  href={location.signalGroupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lift inline-flex h-11 items-center gap-2 border border-iron px-5 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-iron hover:text-bone"
                >
                  Join Signal
                  <Icon name="arrow-up-right" size={14} />
                </a>
              </Magnetic>
            </div>
          )}
        </div>
      </section>

      {/* Interest form */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-12 md:py-28">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Interested?</span>
            <div className="hairline flex-1" />
          </div>
          <h2 className="display-xl mt-10 text-3xl text-bone md:text-5xl">
            Show up. We will be there.
          </h2>

          {submitted ? (
            <div className="mt-10 flex items-start gap-4 border border-brass/40 bg-iron/40 p-6 md:p-8">
              <Icon name="check" size={24} className="text-brass" />
              <p className="font-pullquote text-lg italic leading-relaxed text-bone md:text-xl">
                Thank you, brother. The group leader will be in touch.
              </p>
            </div>
          ) : (
            <form onSubmit={handleInterest} className="mt-10 grid gap-6">
              <DarkField
                label="Name"
                required
                value={interestForm.name}
                onChange={(v) =>
                  setInterestForm((f) => ({ ...f, name: v }))
                }
              />
              <DarkField
                label="Email"
                type="email"
                required
                value={interestForm.email}
                onChange={(v) =>
                  setInterestForm((f) => ({ ...f, email: v }))
                }
              />
              <DarkField
                label="Phone (optional)"
                value={interestForm.phone}
                onChange={(v) =>
                  setInterestForm((f) => ({ ...f, phone: v }))
                }
              />
              <div>
                <label className="section-mark text-stone/60">
                  Anything you want the leader to know
                </label>
                <textarea
                  rows={4}
                  value={interestForm.message}
                  onChange={(e) =>
                    setInterestForm((f) => ({ ...f, message: e.target.value }))
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
                  {submitting ? "Sending..." : "I'm interested"}
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

function Detail({
  icon,
  label,
  value,
}: {
  icon: "clock" | "map-pin" | "brothers" | "mail";
  label: string;
  value: string;
}) {
  return (
    <div className="bg-bone p-8">
      <div className="flex items-center gap-3">
        <Icon name={icon} size={20} className="text-brass" />
        <span className="section-mark">{label}</span>
      </div>
      <p className="display-xl mt-6 text-lg text-iron md:text-xl">{value}</p>
    </div>
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
