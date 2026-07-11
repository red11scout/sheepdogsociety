"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";

const TABS: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: "/", label: "Home", icon: "shield", exact: true },
  { href: "/groups", label: "Groups", icon: "map-pin" },
  // Events replaced Letter per Drew 2026-07-11; The Letter moved to the
  // hamburger panel (public-nav mobileSecondaryLinks) so it stays reachable.
  { href: "/events", label: "Events", icon: "calendar" },
  { href: "/bible", label: "Bible", icon: "scroll" },
  { href: "/resources", label: "Resources", icon: "clipboard" },
];

/**
 * Mobile-only bottom tab bar (spec §A.1). 99% of users are on phones;
 * this puts the five primary destinations one thumb-tap away. Desktop
 * masthead is untouched. Active state = brass text + a 2px top bar
 * (shape, not color alone) + aria-current for assistive tech.
 */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/15 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 pt-1 ${
                  active ? "text-brass" : "text-foreground/60"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-0.5 bg-brass"
                  />
                )}
                <Icon name={tab.icon} size={20} />
                <span className="text-[0.625rem] font-medium uppercase tracking-wider">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
