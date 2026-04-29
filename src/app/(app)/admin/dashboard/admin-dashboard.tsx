"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  HandHeart,
  Calendar,
  FileText,
  Sparkles,
  Hash,
  UserCheck,
  UserPlus,
  TrendingUp,
  Mail,
  PenSquare,
  Bot,
  Send,
  Inbox,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

type DashboardData = {
  stats: DashboardStats | null;
  recentLetters: RecentLetter[];
};

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({ stats: null, recentLetters: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => setData({ stats: d.stats ?? null, recentLetters: d.recentLetters ?? [] }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const stats = data.stats;
  if (!stats) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <p className="text-muted-foreground">Failed to load dashboard.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back. Here&apos;s what&apos;s happening across the ministry.
        </p>
      </div>

      {/* NEW: AI-powered Letter editor hero */}
      <section className="rounded-lg border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-bronze/10 p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <Badge variant="secondary" className="mb-3">
              <Sparkles className="h-3 w-3 mr-1" />
              NEW
            </Badge>
            <h2 className="text-2xl font-bold mb-2">
              Letter editor with Claude AI
            </h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-prose">
              Write weekly letters with AI assistance. Highlight any text and
              ask Claude to rephrase, shorten, expand, or make it more pastoral.
              Every keystroke auto-saves with full version history. When ready,
              publish to the website and send to email subscribers in one click.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/letters/new"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <PenSquare className="h-4 w-4" />
                Start a new letter
              </Link>
              <Link
                href="/admin/letters"
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Browse all letters
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="flex gap-3">
            <MiniStat label="Drafts" value={stats.draftLetters} />
            <MiniStat label="Published" value={stats.publishedLetters} />
            <MiniStat
              label="Subscribers"
              value={stats.activeSubscribers}
              icon={<Mail className="h-3 w-3" />}
            />
          </div>
        </div>
      </section>

      {/* Recent letters list */}
      {data.recentLetters.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent letters
            </h2>
            <Link href="/admin/letters" className="text-xs text-primary hover:underline">
              See all →
            </Link>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                {data.recentLetters.map((letter) => (
                  <tr key={letter.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono w-20">
                      No. {letter.issueNumber}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/letters/${letter.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {letter.title}
                      </Link>
                      {letter.themeWord ? (
                        <span className="ml-2 text-xs uppercase tracking-wider text-muted-foreground">
                          {letter.themeWord}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={letter.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground text-right">
                      {new Date(letter.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* AI tools section */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          AI tools
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AiToolCard
            icon={<PenSquare className="h-5 w-5" />}
            title="Letter editor"
            body="Tiptap + Claude bubble menu. Rephrase, shorten, pastoralize."
            href="/admin/letters"
          />
          <AiToolCard
            icon={<FileText className="h-5 w-5" />}
            title="Devotional drafts"
            body="Generate scripture-anchored devotionals with one click."
            href="/admin/devotionals"
          />
          <AiToolCard
            icon={<Calendar className="h-5 w-5" />}
            title="Reading plans"
            body="Build a reading plan from a theme or book of the Bible."
            href="/admin/reading-plans"
          />
          <AiToolCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Daily scripture"
            body="Curated verse + reflection for daily-scripture page."
            href="/admin/scripture"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {stats.aiGenerationsThisWeek} AI generations this week ·{" "}
          {stats.aiGenerationsTotal} total
        </p>
      </section>

      {/* Original stat cards (kept for completeness, secondary now) */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Community stats
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active members"
            value={stats.activeUsers}
            icon={UserCheck}
            href="/admin/users"
          />
          <StatCard
            title="Pending approval"
            value={stats.pendingUsers}
            icon={UserPlus}
            href="/admin/users"
            alert={stats.pendingUsers > 0}
          />
          <StatCard
            title="Total members"
            value={stats.totalUsers}
            icon={Users}
            href="/members"
          />
          <StatCard
            title="Groups"
            value={stats.totalGroups}
            icon={Users}
            href="/groups"
          />
          <StatCard
            title="Channels"
            value={stats.totalChannels}
            icon={Hash}
            href="/channels"
          />
          <StatCard
            title="Messages (7 days)"
            value={stats.messagesThisWeek}
            icon={TrendingUp}
          />
          <StatCard
            title="Active prayers"
            value={stats.activePrayers}
            icon={HandHeart}
            href="/prayer"
          />
          <StatCard
            title="Upcoming events"
            value={stats.upcomingEvents}
            icon={Calendar}
            href="/events"
          />
          <StatCard
            title="Published posts"
            value={stats.publishedPosts}
            icon={FileText}
            href="/blog"
          />
          <StatCard
            title="Pending testimonies"
            value={stats.pendingTestimonies}
            icon={Sparkles}
            href="/testimonies"
            alert={stats.pendingTestimonies > 0}
          />
          <StatCard
            title="Newsletter subscribers"
            value={stats.activeSubscribers}
            icon={Inbox}
            href="/admin/newsletter"
          />
          <StatCard
            title="Total messages"
            value={stats.totalMessages}
            icon={MessageSquare}
          />
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <QuickAction href="/admin/letters/new" icon={<Sparkles className="h-3 w-3" />}>
            ✨ New letter
          </QuickAction>
          <QuickAction href="/admin/users">Manage users</QuickAction>
          <QuickAction href="/testimonies">Review testimonies</QuickAction>
          <QuickAction href="/blog/new">Write blog post</QuickAction>
          <QuickAction href="/admin/groups">Manage groups</QuickAction>
          <QuickAction href="/admin/devotionals">Devotionals</QuickAction>
          <QuickAction href="/admin/reading-plans">Reading plans</QuickAction>
          <QuickAction href="/admin/newsletter">Newsletter list</QuickAction>
        </div>
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="text-center min-w-[80px]">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
        {icon}
        {label}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  alert,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  alert?: boolean;
}) {
  const inner = (
    <Card
      className={`transition-colors ${href ? "cursor-pointer hover:bg-secondary/50" : ""} ${
        alert ? "ring-1 ring-yellow-500/50" : ""
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

function AiToolCard({
  icon,
  title,
  body,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-secondary/30 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-primary">{icon}</span>
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-4 py-2 text-sm hover:bg-secondary/80"
    >
      {icon}
      {children}
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "published"
      ? "bg-green-500/10 text-green-500 border-green-500/30"
      : status === "scheduled"
      ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
      : status === "archived"
      ? "bg-stone-500/10 text-stone-500 border-stone-500/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${tone}`}
    >
      {status}
    </span>
  );
}
