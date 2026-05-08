"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { CountUp } from "@/components/motion/CountUp";
import { Magnetic } from "@/components/motion/Magnetic";
import { Spotlight } from "@/components/motion/Spotlight";
import { HintTooltip } from "@/components/admin/HintTooltip";
import { EmptyState } from "@/components/admin/EmptyState";
import { SetupChecklist } from "@/components/admin/SetupChecklist";
import { cn } from "@/lib/utils";

type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  totalGroups: number;
  totalMessages: number;
  messagesThisWeek: number;
  activePrayers: number;
  answeredPrayers: number;
  upcomingEvents: number;
  publishedPosts: number;
  pendingTestimonies: number;
  totalChannels: number;
  draftLetters: number;
  publishedLetters: number;
  activeSubscribers: number;
  aiGenerationsThisWeek: number;
  aiGenerationsTotal: number;
};

type RecentLetter = {
  id: string;
  title: string;
  themeWord: string | null;
  issueNumber: number;
  status: string;
  updatedAt: string;
};

type ThisWeek = {
  status: "missing" | "draft" | "scheduled" | "published";
  latest: {
    id: string;
    title: string;
    slug: string;
    status: string;
    issueNumber: number;
    theme: string;
    updatedAt: string;
  } | null;
};

type DashboardData = {
  stats: DashboardStats | null;
  recentLetters: RecentLetter[];
  thisWeek: ThisWeek | null;
};

interface AdminDashboardProps {
  greetingName?: string;
}

export function AdminDashboard({ greetingName = "brother" }: AdminDashboardProps) {
  const [data, setData] = useState<DashboardData>({
    stats: null,
    recentLetters: [],
    thisWeek: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) =>
        setData({
          stats: d.stats ?? null,
          recentLetters: d.recentLetters ?? [],
          thisWeek: d.thisWeek ?? null,
        })
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data.stats) {
    return (
      <div className="px-8 py-10 md:px-12">
        <div className="h-8 w-64 animate-pulse bg-stone/10" />
        <div className="mt-6 grid gap-4 md:grid-cols-12">
          <div className="h-64 animate-pulse bg-stone/10 md:col-span-8" />
          <div className="h-64 animate-pulse bg-stone/10 md:col-span-4" />
        </div>
      </div>
    );
  }

  const stats = data.stats;
  const today = new Date();
  const dayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const inboxTotal =
    stats.pendingTestimonies + stats.pendingUsers + (data.stats ? 0 : 0);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-12 md:py-14">
      {/* Greeting */}
      <header>
        <div className="flex items-center gap-4">
          <span className="section-mark text-brass">§ {dayLabel}</span>
          <div className="hairline flex-1" />
        </div>
        <h1 className="display-xl mt-6 text-4xl text-bone md:text-6xl">
          Sit down, {greetingName}.
          <br />
          <span className="text-brass">Here is the watch.</span>
        </h1>
      </header>

      {/* Bento — top row */}
      <section className="mt-12 grid gap-4 md:grid-cols-12">
        {/* This week — main panel */}
        <Spotlight
          size={620}
          color="var(--color-brass)"
          className="border border-stone/15 bg-iron/40 md:col-span-8"
        >
          <div className="p-8 md:p-10">
            <ThisWeekHero
              thisWeek={data.thisWeek}
              draftLetters={stats.draftLetters}
              publishedLetters={stats.publishedLetters}
              activeSubscribers={stats.activeSubscribers}
            />
          </div>
        </Spotlight>

        {/* Inbox */}
        <div className="border border-stone/15 bg-iron/40 md:col-span-4">
          <div className="flex items-center justify-between border-b border-stone/15 px-6 py-4">
            <div className="flex items-center gap-3">
              <Icon name="inbox" size={18} className="text-brass" />
              <span className="section-mark text-bone">§ Inbox</span>
            </div>
            <HintTooltip hint="Items waiting on you. Approve testimonies, review group plant requests, read contact submissions." />
          </div>
          <ul className="divide-y divide-stone/10">
            <InboxRow
              icon="flame"
              label="Pending testimonies"
              count={stats.pendingTestimonies}
              href="/admin/testimonies"
            />
            <InboxRow
              icon="brothers"
              label="Member approvals"
              count={stats.pendingUsers}
              href="/admin/users"
            />
            <InboxRow
              icon="message"
              label="Contact submissions"
              count={0}
              href="/admin/contacts"
              hint="Open inbox"
            />
            <InboxRow
              icon="plus"
              label="Plant requests"
              count={0}
              href="/admin/location-requests"
              hint="Group-start applications"
            />
          </ul>
        </div>
      </section>

      {/* First-week onboarding — auto-hides once every step is done */}
      <SetupChecklist
        stats={{
          totalGroups: stats.totalGroups,
          activeSubscribers: stats.activeSubscribers,
          publishedLetters: stats.publishedLetters,
          upcomingEvents: stats.upcomingEvents,
        }}
      />

      {/* Stats row */}
      <section className="mt-4 grid gap-4 md:grid-cols-4">
        <StatTile
          icon="mail"
          label="Subscribers"
          value={stats.activeSubscribers}
          href="/admin/newsletter"
        />
        <StatTile
          icon="brothers"
          label="Active members"
          value={stats.activeUsers}
          href="/admin/users"
        />
        <StatTile
          icon="calendar"
          label="Upcoming events"
          value={stats.upcomingEvents}
          href="/admin/events"
        />
        <StatTile
          icon="sparkles"
          label="AI uses · 7d"
          value={stats.aiGenerationsThisWeek}
        />
      </section>

      {/* AI quick actions */}
      <section className="mt-12">
        <div className="flex items-center gap-4">
          <span className="section-mark text-brass">§ Claude is here</span>
          <div className="hairline flex-1" />
          <span className="section-mark text-stone/40">⌘ J to summon</span>
        </div>
        <p className="mt-6 max-w-2xl font-pullquote text-lg italic leading-relaxed text-stone">
          Ask Claude anything. Drafting, sharpening, brainstorming a scripture
          for a man who is hurting. Press ⌘ K to jump anywhere. Press ⌘ J to
          open the assistant.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AiActionCard
            icon="pen"
            title="Draft a Letter"
            body="Open Letter editor with Tiptap + Claude bubble menu."
            href="/admin/letters/new"
          />
          <AiActionCard
            icon="lamp"
            title="Daily scripture"
            body="Curate today&rsquo;s verse, theme, and reflection."
            href="/admin/scripture"
          />
          <AiActionCard
            icon="scroll"
            title="Devotional"
            body="Generate a scripture-anchored devotional from a seed thought."
            href="/admin/devotionals"
          />
          <AiActionCard
            icon="compass"
            title="Reading plan"
            body="Build a multi-day plan from a theme or book of the Bible."
            href="/admin/reading-plans"
          />
        </div>
      </section>

      {/* Recent letters */}
      <section className="mt-14">
        <div className="flex items-center gap-4">
          <span className="section-mark text-brass">§ Recent Letters</span>
          <div className="hairline flex-1" />
          <Link
            href="/admin/letters"
            className="section-mark text-stone/55 transition-colors hover:text-brass"
          >
            See all
          </Link>
        </div>
        {data.recentLetters.length > 0 ? (
          <div className="mt-6 border border-stone/15">
            {data.recentLetters.map((letter, i) => (
              <Link
                key={letter.id}
                href={`/admin/letters/${letter.id}`}
                className={cn(
                  "group/row grid grid-cols-[80px_1fr_120px_110px] items-center gap-4 px-6 py-4 transition-colors hover:bg-iron/60",
                  i > 0 && "border-t border-stone/10"
                )}
              >
                <span className="section-mark text-stone/45">
                  No. {letter.issueNumber}
                </span>
                <div className="min-w-0">
                  <p className="truncate display-xl text-base text-bone group-hover/row:text-brass md:text-lg">
                    {letter.title || "Untitled"}
                  </p>
                  {letter.themeWord && (
                    <p className="mt-1 section-mark text-stone/45">
                      {letter.themeWord}
                    </p>
                  )}
                </div>
                <StatusPill status={letter.status} />
                <span className="text-right text-xs text-stone/55">
                  {new Date(letter.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              icon="pen"
              title="No Letters yet."
              body="The Letter is your weekly word. Draft one with Claude, autosave, then publish + broadcast in one click. The first one gets the brotherhood paying attention."
              primary={{
                label: "Write the first Letter",
                href: "/admin/letters/new",
              }}
            />
          </div>
        )}
      </section>

      {/* Keyboard hints — compact strip */}
      <section className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-3 border border-dashed border-stone/15 bg-iron/20 px-5 py-4 text-xs text-stone/70">
        <span className="section-mark text-stone/45">Shortcuts</span>
        <span className="inline-flex items-center gap-2">
          <kbd className="border border-stone/25 bg-iron/60 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-bone">⌘ K</kbd>
          jump anywhere
        </span>
        <span className="inline-flex items-center gap-2">
          <kbd className="border border-stone/25 bg-iron/60 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-bone">⌘ J</kbd>
          ask Claude
        </span>
        <span className="inline-flex items-center gap-2">
          <kbd className="border border-stone/25 bg-iron/60 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-bone">?</kbd>
          open help
        </span>
        <span className="text-stone/45">Hover any{" "}
          <Icon name="help" size={12} className="-mt-0.5 inline-block text-stone/55" /> for a tip.
        </span>
      </section>

      {/* Footer hint */}
      <footer className="mt-16 flex items-center justify-between border-t border-stone/15 pt-6 text-xs text-stone/45">
        <p>
          Sheepdog Cockpit. {inboxTotal > 0 ? `${inboxTotal} items waiting.` : "Inbox is clear."}
        </p>
        <p className="section-mark">Glory to God</p>
      </footer>
    </div>
  );
}

function ThisWeekHero({
  thisWeek,
  draftLetters,
  publishedLetters,
  activeSubscribers,
}: {
  thisWeek: ThisWeek | null;
  draftLetters: number;
  publishedLetters: number;
  activeSubscribers: number;
}) {
  const status = thisWeek?.status ?? "missing";
  const latest = thisWeek?.latest ?? null;

  const headlines: Record<ThisWeek["status"], { kicker: string; tail: string }> = {
    missing: {
      kicker: "No encouragement",
      tail: "this week.",
    },
    draft: {
      kicker: "A draft is",
      tail: "in progress.",
    },
    scheduled: {
      kicker: "This week is",
      tail: "scheduled.",
    },
    published: {
      kicker: "This week is",
      tail: "out the door.",
    },
  };

  const { kicker, tail } = headlines[status];
  const ctaHref =
    latest && status !== "published"
      ? `/admin/encouragements/${latest.id}`
      : "/admin/encouragements/new";
  const ctaLabel =
    status === "published"
      ? "Compose next week"
      : latest
      ? "Open the draft"
      : "Compose this week's encouragement";

  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span className="section-mark text-brass">§ This week</span>
          <HintTooltip hint="Your weekly word to the brotherhood. Pick a theme, a cover image, and a voice. Claude drafts intro, scriptures, guidance, and notes. You publish." />
        </div>
        <h2 className="display-xl mt-4 text-2xl text-bone md:text-4xl">
          {kicker}
          <br />
          <span className="text-brass">{tail}</span>
        </h2>
        {latest && (
          <p className="mt-4 max-w-md text-sm text-stone/80">
            <span className="section-mark text-stone/55">No. {latest.issueNumber}</span>{" "}
            <span className="text-bone">{latest.title || "Untitled"}</span>
            {latest.theme && (
              <>
                {" · "}
                <span className="text-stone/65">{latest.theme}</span>
              </>
            )}
          </p>
        )}
        {!latest && (
          <p className="mt-4 max-w-md font-pullquote text-base italic leading-relaxed text-stone">
            Four short steps. Theme, image, voice, draft. Read it, edit it, send it.
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Magnetic>
            <Link
              href={ctaHref}
              className="lift group inline-flex h-11 items-center gap-2 border border-bone bg-bone px-6 text-sm font-medium text-iron transition-colors hover:bg-stone"
            >
              <Icon name="sparkles" size={16} />
              {ctaLabel}
              <Icon
                name="arrow-right"
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </Magnetic>
          <Link
            href="/admin/encouragements"
            className="inline-flex items-center gap-2 section-mark text-stone/70 transition-colors hover:text-brass"
          >
            All letters
            <Icon name="arrow-right" size={12} />
          </Link>
        </div>
      </div>
      <div className="hidden flex-col gap-1 border-l border-stone/15 pl-6 md:flex">
        <MiniStat label="Drafts" value={draftLetters} />
        <MiniStat label="Published" value={publishedLetters} />
        <MiniStat label="Subscribers" value={activeSubscribers} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 py-1.5">
      <div className="display-xl text-2xl text-brass">
        <CountUp to={value} />
      </div>
      <div className="section-mark text-[0.625rem] text-stone/55">{label}</div>
    </div>
  );
}

function InboxRow({
  icon,
  label,
  count,
  href,
  hint,
}: {
  icon: IconName;
  label: string;
  count: number;
  href: string;
  hint?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group/row flex items-center gap-3 px-6 py-4 transition-colors hover:bg-iron/60"
      >
        <Icon name={icon} size={16} className="text-stone/55 group-hover/row:text-brass" />
        <span className="flex-1 truncate text-sm text-stone/85">{label}</span>
        {count > 0 ? (
          <span className="inline-flex h-6 min-w-[24px] items-center justify-center bg-brass px-2 text-[0.625rem] font-semibold text-ink">
            {count}
          </span>
        ) : (
          <span className="section-mark text-stone/35">
            {hint ?? "0"}
          </span>
        )}
        <Icon
          name="arrow-right"
          size={12}
          className="text-stone/30 transition-all group-hover/row:translate-x-0.5 group-hover/row:text-brass"
        />
      </Link>
    </li>
  );
}

function StatTile({
  icon,
  label,
  value,
  href,
}: {
  icon: IconName;
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <div className="lift group/tile relative overflow-hidden border border-stone/15 bg-iron/40 p-6 transition-colors hover:border-brass/40">
      <div className="flex items-center justify-between">
        <Icon name={icon} size={18} className="text-brass" />
        {href && (
          <Icon
            name="arrow-up-right"
            size={14}
            className="text-stone/30 transition-all group-hover/tile:translate-x-0.5 group-hover/tile:-translate-y-0.5 group-hover/tile:text-brass"
          />
        )}
      </div>
      <div className="display-xl mt-6 text-3xl text-bone md:text-4xl">
        <CountUp to={value} />
      </div>
      <div className="mt-1 section-mark text-stone/55">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

function AiActionCard({
  icon,
  title,
  body,
  href,
}: {
  icon: IconName;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group/card lift block border border-stone/15 bg-iron/40 p-6 transition-colors hover:border-brass/40"
    >
      <div className="flex items-center justify-between">
        <Icon name={icon} size={20} className="text-brass" />
        <Icon
          name="arrow-up-right"
          size={14}
          className="text-stone/30 transition-all group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5 group-hover/card:text-brass"
        />
      </div>
      <h3 className="display-xl mt-6 text-lg text-bone md:text-xl">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone/75">{body}</p>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "published"
      ? "border-olive/40 text-olive bg-olive/10"
      : status === "scheduled"
      ? "border-brass/40 text-brass bg-brass/10"
      : status === "archived"
      ? "border-stone/30 text-stone/60 bg-stone/5"
      : "border-stone/30 text-stone/70 bg-stone/5";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.18em] border",
        tone
      )}
    >
      {status}
    </span>
  );
}

