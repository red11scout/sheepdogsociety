"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hash,
  Lock,
  Users,
  MessageCircle,
  Shield,
  BookOpen,
  Heart,
  HandHeart,
  User,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { AppUser, Channel } from "@/lib/types";

type SidebarProps = {
  user: AppUser;
  onToggle: () => void;
};

export function Sidebar({ user, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    community: true,
    leaders: true,
    groups: true,
    dms: false,
  });

  const isLeader =
    user.role === "admin" ||
    user.role === "group_leader" ||
    user.role === "asst_leader";

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((data) => setChannels(data.channels ?? []))
      .catch(() => {});
  }, []);

  const orgChannels = channels.filter((c) => c.type === "org");
  const leaderChannels = channels.filter((c) => c.type === "leaders");
  const groupChannels = channels.filter((c) => c.type === "group");
  const dmChannels = channels.filter((c) => c.type === "dm");

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function ChannelLink({ channel }: { channel: Channel }) {
    const href = `/channels/${channel.id}`;
    const isActive = pathname === href;
    const icon =
      channel.type === "leaders" ? (
        <Lock className="h-4 w-4" />
      ) : channel.type === "dm" ? (
        <MessageCircle className="h-4 w-4" />
      ) : (
        <Hash className="h-4 w-4" />
      );

    return (
      <Link
        href={href}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        {icon}
        <span className="truncate">{channel.name}</span>
      </Link>
    );
  }

  function SectionHeader({
    label,
    sectionKey,
  }: {
    label: string;
    sectionKey: string;
  }) {
    const expanded = expandedSections[sectionKey];
    return (
      <button
        onClick={() => toggleSection(sectionKey)}
        className="flex w-full items-center gap-1 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {label}
      </button>
    );
  }

  const initials =
    (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "");

  return (
    <div className="flex h-full w-72 flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-bronze" />
          <span className="text-lg font-bold">Sheepdog</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {/* Channel List */}
      <ScrollArea className="flex-1 px-2 py-2">
        {/* Community channels */}
        <SectionHeader label="Community" sectionKey="community" />
        {expandedSections.community && (
          <div className="mb-3 space-y-0.5 pl-1">
            {orgChannels.map((c) => (
              <ChannelLink key={c.id} channel={c} />
            ))}
          </div>
        )}

        {/* Leaders-only channels */}
        {isLeader && leaderChannels.length > 0 && (
          <>
            <SectionHeader label="Leaders" sectionKey="leaders" />
            {expandedSections.leaders && (
              <div className="mb-3 space-y-0.5 pl-1">
                {leaderChannels.map((c) => (
                  <ChannelLink key={c.id} channel={c} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Group channels */}
        {groupChannels.length > 0 && (
          <>
            <SectionHeader label="My Groups" sectionKey="groups" />
            {expandedSections.groups && (
              <div className="mb-3 space-y-0.5 pl-1">
                {groupChannels.map((c) => (
                  <ChannelLink key={c.id} channel={c} />
                ))}
              </div>
            )}
          </>
        )}

        {/* DMs */}
        {dmChannels.length > 0 && (
          <>
            <SectionHeader label="Direct Messages" sectionKey="dms" />
            {expandedSections.dms && (
              <div className="mb-3 space-y-0.5 pl-1">
                {dmChannels.map((c) => (
                  <ChannelLink key={c.id} channel={c} />
                ))}
              </div>
            )}
          </>
        )}

        <Separator className="my-3" />

        {/* Navigation links */}
        <div className="space-y-0.5">
          <NavLink
            href="/bible"
            icon={<BookOpen className="h-4 w-4" />}
            label="Bible"
            active={pathname.startsWith("/bible")}
          />
          <NavLink
            href="/devotionals"
            icon={<Heart className="h-4 w-4" />}
            label="Devotionals"
            active={pathname.startsWith("/devotionals")}
          />
          <NavLink
            href="/prayer"
            icon={<HandHeart className="h-4 w-4" />}
            label="Prayer"
            active={pathname.startsWith("/prayer")}
          />
          <NavLink
            href="/groups"
            icon={<Users className="h-4 w-4" />}
            label="Groups"
            active={pathname.startsWith("/groups")}
          />
          <NavLink
            href="/members"
            icon={<User className="h-4 w-4" />}
            label="Members"
            active={pathname.startsWith("/members")}
          />
          {user.role === "admin" && (
            <NavLink
              href="/admin/users"
              icon={<Settings className="h-4 w-4" />}
              label="Admin"
              active={pathname.startsWith("/admin")}
            />
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* User Profile */}
      <div className="flex items-center gap-2 px-3 py-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatarUrl ?? undefined} />
          <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 truncate">
          <p className="text-sm font-medium truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {user.role.replace("_", " ")}
          </p>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
