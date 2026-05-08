"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: string | number;
  hint?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  pendingCount?: number;
  pendingTestimonies?: number;
  pendingLocationRequests?: number;
}

export function AdminSidebar({
  pendingCount = 0,
  pendingTestimonies = 0,
  pendingLocationRequests = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const totalInbox = pendingCount + pendingTestimonies + pendingLocationRequests;

  const groups: NavGroup[] = [
    {
      label: "Today",
      items: [
        {
          href: "/admin/dashboard",
          label: "Home",
          icon: "target",
          hint: "Your starting point. Shows this week's encouragement status, the inbox, and quick actions.",
        },
        {
          href: "/admin/contacts",
          label: "Inbox",
          icon: "inbox",
          badge: totalInbox > 0 ? totalInbox : undefined,
          hint: "Contact submissions, testimonies awaiting approval, group-start requests. The number is what's still unread or pending.",
        },
      ],
    },
    {
      label: "Write",
      items: [
        {
          href: "/admin/encouragements",
          label: "Weekly Encouragements",
          icon: "sparkles",
          hint: "Theme, image, voice, AI draft, then publish. The main weekly artifact.",
        },
        {
          href: "/admin/letters",
          label: "The Letter",
          icon: "pen",
          hint: "Free-form weekly editorial. Tiptap editor with Claude bubble menu. Use when you want full creative control.",
        },
        {
          href: "/admin/devotionals",
          label: "Devotionals",
          icon: "scroll",
          hint: "Daily devotionals shown on the public site. Generate with AI or write by hand.",
        },
        {
          href: "/admin/scripture",
          label: "Daily Scripture",
          icon: "lamp",
          hint: "One verse a day. Curated for the homepage and the daily-scripture page.",
        },
        {
          href: "/admin/reading-plans",
          label: "Reading Plans",
          icon: "compass",
          hint: "Multi-day scripture plans. Build from a theme or a book of the Bible.",
        },
        {
          href: "/admin/testimonies",
          label: "Stories",
          icon: "flame",
          hint: "Submitted testimonies. Approve to publish on the public Stories page.",
        },
        {
          href: "/admin/blog",
          label: "Blog",
          icon: "scroll",
          hint: "Long-form essays. Slower cadence than encouragements or letters.",
        },
      ],
    },
    {
      label: "People",
      items: [
        {
          href: "/admin/newsletter",
          label: "Subscribers",
          icon: "mail",
          hint: "Newsletter list. Send Resend Broadcasts.",
        },
        {
          href: "/admin/events",
          label: "Events",
          icon: "calendar",
          hint: "Breakfasts, prayer nights, retreats. Shown on the public events page.",
        },
        {
          href: "/admin/groups",
          label: "Groups",
          icon: "brothers",
          hint: "Where men gather. Each group has a city, leader, meeting cadence. Powers the locator.",
        },
        {
          href: "/admin/locations",
          label: "Locations",
          icon: "map-pin",
          hint: "Map pins for the locator. A location can host one or more groups.",
        },
        {
          href: "/admin/members",
          label: "Members",
          icon: "users-group",
          hint: "Every signup from /join. Read-only this phase; inline status editing lands in Phase E.",
        },
        {
          href: "/admin/location-requests",
          label: "Plant Requests",
          icon: "plus",
          badge: pendingLocationRequests > 0 ? pendingLocationRequests : undefined,
          hint: "Men asking to start a group in their city. Mark each as you respond.",
        },
      ],
    },
    {
      label: "Assets",
      items: [
        {
          href: "/admin/resources",
          label: "Resources",
          icon: "download",
          hint: "PDFs and guides organized by section. Pick a section, then add a resource.",
        },
      ],
    },
    {
      label: "Settings",
      items: [
        {
          href: "/admin/users",
          label: "Admins",
          icon: "shield",
          hint: "Who can sign in to this cockpit. Members of the public never log in.",
        },
        {
          href: "/admin/audit",
          label: "Audit log",
          icon: "clipboard",
          hint: "Every change made by every admin. Read-only.",
        },
        {
          href: "/admin/settings",
          label: "Settings",
          icon: "settings",
          hint: "Integrations, brand voice, environment overview.",
        },
      ],
    },
  ];

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-stone/15 bg-iron">
      {/* Brand */}
      <Link
        href="/admin/dashboard"
        className="group flex items-center gap-3 border-b border-stone/15 px-6 py-5 transition-colors hover:bg-iron/60"
      >
        <Icon name="shield" size={32} className="text-brass" />
        <div className="flex flex-col leading-tight">
          <span className="display-xl text-base text-bone">
            Sheepdog
          </span>
          <span className="section-mark text-[0.6rem] text-brass">
            Cockpit
          </span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.label} className="mb-6 last:mb-0">
            <div className="px-3 pb-2 section-mark text-stone/40">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.hint}
                      className={cn(
                        "group flex items-center gap-3 rounded-none px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-brass/15 text-bone"
                          : "text-stone/75 hover:bg-iron/60 hover:text-bone"
                      )}
                    >
                      <Icon
                        name={item.icon}
                        size={16}
                        className={cn(
                          "shrink-0",
                          active ? "text-brass" : "text-stone/55 group-hover:text-stone"
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge != null && (
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center bg-brass px-1.5 text-[0.625rem] font-semibold text-ink">
                          {item.badge}
                        </span>
                      )}
                      {active && (
                        <span
                          className="absolute left-0 h-6 w-[3px] bg-brass"
                          aria-hidden
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-stone/15 px-6 py-4">
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center justify-between text-xs text-stone/55 transition-colors hover:text-brass"
        >
          <span>View public site</span>
          <Icon
            name="arrow-up-right"
            size={12}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </div>
    </aside>
  );
}
