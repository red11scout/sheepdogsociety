"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const PATH_LABELS: Record<string, string> = {
  dashboard: "Cockpit",
  letters: "The Letter",
  devotionals: "Devotionals",
  scripture: "Daily Scripture",
  "reading-plans": "Reading Plans",
  testimonies: "Stories",
  newsletter: "Subscribers",
  events: "Events",
  groups: "Groups",
  locations: "Locations",
  "location-requests": "Plant Requests",
  resources: "Resources",
  users: "Admins",
  contacts: "Inbox",
  new: "New",
};

interface AdminTopbarProps {
  user: { name: string | null; email: string | null };
  onOpenCommand: () => void;
  onOpenAssistant: () => void;
  onOpenMobileNav?: () => void;
}

export function AdminTopbar({
  user,
  onOpenCommand,
  onOpenAssistant,
  onOpenMobileNav,
}: AdminTopbarProps) {
  const pathname = usePathname();
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      );
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  const segments = pathname?.split("/").filter(Boolean) ?? [];
  const crumbs = segments.slice(1).map((s) => PATH_LABELS[s] || s);

  const initials =
    user.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "?";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-stone/15 bg-iron/85 px-4 backdrop-blur-md md:px-6">
      {/* Mobile menu button */}
      {onOpenMobileNav && (
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="rounded-none p-2 text-stone/70 transition-colors hover:text-bone lg:hidden"
          aria-label="Open menu"
        >
          <Icon name="menu" size={20} />
        </button>
      )}

      {/* Breadcrumb */}
      <div className="flex min-w-0 items-center gap-2 text-sm text-stone/70">
        {crumbs.length === 0 ? (
          <span className="text-bone">Cockpit</span>
        ) : (
          crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && (
                <Icon
                  name="chevron-down"
                  size={12}
                  className="-rotate-90 text-stone/40"
                />
              )}
              <span
                className={cn(
                  "truncate",
                  i === crumbs.length - 1 ? "text-bone" : "text-stone/55"
                )}
              >
                {c}
              </span>
            </span>
          ))
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Command palette trigger */}
      <button
        type="button"
        onClick={onOpenCommand}
        className="hidden items-center gap-3 border border-stone/20 bg-iron/40 px-3 py-1.5 text-xs text-stone/60 transition-colors hover:border-brass/50 hover:text-stone md:flex"
      >
        <Icon name="search" size={14} />
        <span>Jump to anything</span>
        <span className="ml-2 inline-flex items-center gap-0.5 border border-stone/20 bg-iron px-1.5 py-0.5 text-[0.625rem] font-medium text-stone/55">
          ⌘K
        </span>
      </button>

      {/* AI Assistant */}
      <button
        type="button"
        onClick={onOpenAssistant}
        className="lift inline-flex h-9 items-center gap-2 border border-brass/40 bg-brass/10 px-3 text-xs font-medium uppercase tracking-wider text-brass transition-colors hover:bg-brass/20"
      >
        <Icon name="sparkles" size={14} />
        <span className="hidden sm:inline">Ask Claude</span>
      </button>

      {/* Time */}
      <span className="hidden section-mark text-stone/40 xl:inline">
        {time}
      </span>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* User */}
      <div className="flex h-9 w-9 items-center justify-center border border-stone/20 bg-iron text-xs font-medium text-stone">
        {initials}
      </div>
    </header>
  );
}
