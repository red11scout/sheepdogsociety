"use client";

import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/utils";

/**
 * First-week onboarding checklist on /admin/dashboard. Auto-hides once every
 * item is complete. Items are derived from existing dashboard stats so no new
 * endpoint is required.
 *
 * Five items, in priority order:
 *  1. Add the first group (so men can find one).
 *  2. Connect a newsletter audience (the Letter has a place to land).
 *  3. Publish the first Letter.
 *  4. Schedule the first event.
 *  5. Upload the first resource.
 */

export type SetupStats = {
  totalGroups: number;
  activeSubscribers: number;
  publishedLetters: number;
  upcomingEvents: number;
  /** `totalResources` is not yet wired into the dashboard stats endpoint;
   *  pass `undefined` and the item is omitted. */
  totalResources?: number;
};

type Step = {
  key: string;
  label: string;
  done: boolean;
  href: string;
  hint: string;
};

export function SetupChecklist({ stats }: { stats: SetupStats }) {
  const steps: Step[] = [
    {
      key: "group",
      label: "Add your first group",
      done: stats.totalGroups > 0,
      href: "/admin/groups",
      hint: "Add a city, a meeting day, and a leader name. Men cannot find a table that does not exist on the site yet.",
    },
    {
      key: "subscribers",
      label: "Connect a newsletter audience",
      done: stats.activeSubscribers > 0,
      href: "/admin/newsletter",
      hint: "The footer subscribe form should already be writing to your audience. Send your first issue once a few men sign up.",
    },
    {
      key: "letter",
      label: "Publish the first Letter",
      done: stats.publishedLetters > 0,
      href: "/admin/encouragements",
      hint: "One scripture. One practice. Five-minute read. Saves to a Resend Broadcast and to the public archive in one click.",
    },
    {
      key: "event",
      label: "Schedule the first gathering",
      done: stats.upcomingEvents > 0,
      href: "/admin/events",
      hint: "Breakfast, prayer night, leader huddle, or service day. Pick one. Put it on the calendar.",
    },
    ...(stats.totalResources !== undefined
      ? [
          {
            key: "resource",
            label: "Upload the first field guide",
            done: stats.totalResources > 0,
            href: "/admin/resources",
            hint: "PDF, audio, or a text article. Free to download. Bring it to your next table.",
          } as Step,
        ]
      : []),
  ];

  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = done === total;
  if (allDone) return null;

  const pct = Math.round((done / total) * 100);

  return (
    <section className="mt-8 border border-stone/15 bg-iron/40">
      <header className="flex items-center justify-between border-b border-stone/15 px-6 py-4">
        <div className="flex items-center gap-3">
          <Icon name="check" size={18} className="text-brass" />
          <span className="section-mark text-bone">§ First week</span>
        </div>
        <span className="section-mark text-stone/60">
          {done} of {total} done
        </span>
      </header>

      <div className="px-6 pt-4">
        <div
          className="h-1 w-full overflow-hidden bg-stone/10"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Setup progress"
        >
          <div
            className="h-full bg-brass transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="divide-y divide-stone/10">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              href={step.href}
              className={cn(
                "group flex items-start gap-4 px-6 py-4 transition-colors hover:bg-stone/5",
                step.done && "opacity-60"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center border",
                  step.done
                    ? "border-brass bg-brass text-ink"
                    : "border-stone/30 text-transparent"
                )}
                aria-hidden="true"
              >
                <Icon name="check" size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-display text-base text-bone group-hover:text-brass md:text-lg",
                    step.done && "line-through decoration-stone/40"
                  )}
                >
                  {step.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-stone/60">
                  {step.hint}
                </p>
              </div>
              <Icon
                name="arrow-right"
                size={14}
                className="mt-2 shrink-0 text-stone/40 transition-transform group-hover:translate-x-1 group-hover:text-brass"
              />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
