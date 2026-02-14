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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
};

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((data) => setStats(data.stats ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-muted-foreground">Failed to load dashboard.</p>
      </div>
    );
  }

  const cards = [
    {
      title: "Active Members",
      value: stats.activeUsers,
      icon: UserCheck,
      href: "/admin/users",
      color: "text-green-500",
    },
    {
      title: "Pending Approval",
      value: stats.pendingUsers,
      icon: UserPlus,
      href: "/admin/users",
      color: "text-yellow-500",
      alert: stats.pendingUsers > 0,
    },
    {
      title: "Total Members",
      value: stats.totalUsers,
      icon: Users,
      href: "/members",
      color: "text-blue-500",
    },
    {
      title: "Groups",
      value: stats.totalGroups,
      icon: Users,
      href: "/groups",
      color: "text-bronze",
    },
    {
      title: "Channels",
      value: stats.totalChannels,
      icon: Hash,
      href: "/channels",
      color: "text-primary",
    },
    {
      title: "Messages (Total)",
      value: stats.totalMessages,
      icon: MessageSquare,
      color: "text-primary",
    },
    {
      title: "Messages (7 days)",
      value: stats.messagesThisWeek,
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      title: "Active Prayers",
      value: stats.activePrayers,
      icon: HandHeart,
      href: "/prayer",
      color: "text-bronze",
    },
    {
      title: "Answered Prayers",
      value: stats.answeredPrayers,
      icon: HandHeart,
      color: "text-green-500",
    },
    {
      title: "Upcoming Events",
      value: stats.upcomingEvents,
      icon: Calendar,
      href: "/events",
      color: "text-primary",
    },
    {
      title: "Published Posts",
      value: stats.publishedPosts,
      icon: FileText,
      href: "/blog",
      color: "text-primary",
    },
    {
      title: "Pending Testimonies",
      value: stats.pendingTestimonies,
      icon: Sparkles,
      href: "/testimonies",
      color: "text-yellow-500",
      alert: stats.pendingTestimonies > 0,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const inner = (
            <Card
              className={`transition-colors ${card.href ? "cursor-pointer hover:bg-secondary/50" : ""} ${
                card.alert ? "ring-1 ring-yellow-500/50" : ""
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          );

          return card.href ? (
            <Link key={card.title} href={card.href}>
              {inner}
            </Link>
          ) : (
            <div key={card.title}>{inner}</div>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/users"
            className="rounded-md bg-secondary px-4 py-2 text-sm hover:bg-secondary/80"
          >
            Manage Users
          </Link>
          <Link
            href="/testimonies"
            className="rounded-md bg-secondary px-4 py-2 text-sm hover:bg-secondary/80"
          >
            Review Testimonies
          </Link>
          <Link
            href="/blog/new"
            className="rounded-md bg-secondary px-4 py-2 text-sm hover:bg-secondary/80"
          >
            Write Post
          </Link>
          <Link
            href="/events"
            className="rounded-md bg-secondary px-4 py-2 text-sm hover:bg-secondary/80"
          >
            Create Event
          </Link>
        </div>
      </div>
    </div>
  );
}
