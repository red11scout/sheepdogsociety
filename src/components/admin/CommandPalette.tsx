"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  icon: IconName;
  href?: string;
  action?: () => void;
  group: "Quick action" | "Page" | "AI";
  keywords?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onAskAi?: (prompt: string) => void;
}

export function CommandPalette({ open, onClose, onAskAi }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const items: PaletteItem[] = useMemo(
    () => [
      // Quick actions
      {
        id: "new-letter",
        label: "Write a new Letter",
        hint: "Tiptap editor + Claude co-pilot",
        icon: "pen",
        href: "/admin/letters/new",
        group: "Quick action",
        keywords: "newsletter weekly compose draft",
      },
      {
        id: "new-event",
        label: "Schedule an event",
        icon: "calendar",
        href: "/admin/events",
        group: "Quick action",
        keywords: "gathering meetup",
      },
      {
        id: "send-broadcast",
        label: "Send a Resend broadcast",
        icon: "send",
        href: "/admin/newsletter",
        group: "Quick action",
        keywords: "email blast",
      },
      // Pages
      {
        id: "page-dashboard",
        label: "Cockpit",
        icon: "target",
        href: "/admin/dashboard",
        group: "Page",
      },
      {
        id: "page-inbox",
        label: "Inbox",
        hint: "Contact submissions",
        icon: "inbox",
        href: "/admin/contacts",
        group: "Page",
      },
      {
        id: "page-letter",
        label: "The Letter",
        icon: "sparkles",
        href: "/admin/encouragements",
        group: "Page",
      },
      {
        id: "page-stories",
        label: "Stories (Testimonies)",
        icon: "flame",
        href: "/admin/testimonies",
        group: "Page",
      },
      {
        id: "page-subscribers",
        label: "Newsletter Subscribers",
        icon: "mail",
        href: "/admin/newsletter",
        group: "Page",
      },
      {
        id: "page-events",
        label: "Events",
        icon: "calendar",
        href: "/admin/events",
        group: "Page",
      },
      {
        id: "page-groups",
        label: "Groups & Locations",
        icon: "map-pin",
        href: "/admin/groups",
        group: "Page",
        keywords: "location address map",
      },
      {
        id: "page-members",
        label: "Members",
        icon: "users-group",
        href: "/admin/members",
        group: "Page",
      },
      {
        id: "page-plant-requests",
        label: "Plant Requests",
        icon: "plus",
        href: "/admin/location-requests",
        group: "Page",
      },
      {
        id: "page-resources",
        label: "Resources",
        icon: "download",
        href: "/admin/resources",
        group: "Page",
      },
      {
        id: "page-admins",
        label: "Admins",
        icon: "shield",
        href: "/admin/users",
        group: "Page",
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = `${item.label} ${item.hint ?? ""} ${item.keywords ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, items]);

  // Reset highlight when filtered changes
  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQuery("");
    }
  }, [open]);

  // Keyboard: Esc to close, arrows to navigate, Enter to select
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, filtered.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlight === filtered.length && query.trim() && onAskAi) {
          onAskAi(query.trim());
          onClose();
        } else {
          const item = filtered[highlight];
          if (item) selectItem(item);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, highlight, query, onAskAi, onClose]);

  function selectItem(item: PaletteItem) {
    onClose();
    if (item.href) {
      router.push(item.href);
    } else if (item.action) {
      item.action();
    }
  }

  if (!open) return null;

  // Group filtered items by group
  const grouped: Record<string, PaletteItem[]> = {};
  filtered.forEach((it) => {
    grouped[it.group] = grouped[it.group] ?? [];
    grouped[it.group].push(it);
  });

  let runningIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-iron/85 px-4 pt-[15vh] backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl border border-stone/20 bg-iron shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-stone/15 px-4 py-3">
          <Icon name="search" size={16} className="text-stone/55" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Jump to a page, run an action, ask Claude..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-bone placeholder:text-stone/40 focus:outline-none"
          />
          <span className="border border-stone/20 bg-iron/60 px-1.5 py-0.5 text-[0.625rem] font-medium text-stone/55">
            Esc
          </span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {Object.entries(grouped).map(([group, list]) => (
            <div key={group} className="px-2 py-2">
              <div className="px-3 pb-1.5 section-mark text-stone/40">
                {group}
              </div>
              <ul>
                {list.map((item) => {
                  const idx = runningIndex++;
                  const active = idx === highlight;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlight(idx)}
                        onClick={() => selectItem(item)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                          active
                            ? "bg-brass/15 text-bone"
                            : "text-stone/75 hover:bg-iron/60"
                        }`}
                      >
                        <Icon
                          name={item.icon}
                          size={16}
                          className={active ? "text-brass" : "text-stone/55"}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.hint && (
                          <span className="hidden text-xs text-stone/45 lg:inline">
                            {item.hint}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Ask AI fallback */}
          {query.trim() && onAskAi && (
            <div className="border-t border-stone/15 px-2 py-2">
              <div className="px-3 pb-1.5 section-mark text-stone/40">
                Ask Claude
              </div>
              <button
                type="button"
                onMouseEnter={() => setHighlight(filtered.length)}
                onClick={() => {
                  onAskAi(query.trim());
                  onClose();
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  highlight === filtered.length
                    ? "bg-brass/15 text-bone"
                    : "text-stone/75 hover:bg-iron/60"
                }`}
              >
                <Icon
                  name="sparkles"
                  size={16}
                  className={
                    highlight === filtered.length
                      ? "text-brass"
                      : "text-stone/55"
                  }
                />
                <span className="flex-1 truncate italic">
                  &ldquo;{query}&rdquo;
                </span>
                <span className="text-xs text-stone/45">Stream a response</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-stone/15 px-4 py-2.5 text-[0.625rem] text-stone/45">
          <div className="flex items-center gap-3">
            <span>↑↓ to move</span>
            <span>↵ to select</span>
          </div>
          <span className="section-mark">Sheepdog Cockpit</span>
        </div>
      </div>
    </div>
  );
}
