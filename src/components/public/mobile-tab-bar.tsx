"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";

const TABS: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: "/", label: "Home", icon: "shield", exact: true },
  { href: "/groups", label: "Groups", icon: "map-pin" },
  // Events replaced Letter per Drew 2026-07-11; The Letter moved to the
  // hamburger panel (public-nav mobileSecondaryLinks) so it stays reachable.
  { href: "/events", label: "Events", icon: "calendar" },
  { href: "/bible", label: "Bible", icon: "scroll" },
  // Join replaced Resources 2026-08-07: the site's one primary CTA
  // (MASTER.md) had no mobile priority at all. Resources stays reachable
  // in the hamburger panel.
  { href: "/join", label: "Join", icon: "gate" },
];

const TEXT_FIELD =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="range"]), textarea, select, [contenteditable="true"]';

/**
 * True while the on-screen keyboard is (very likely) up. Two signals,
 * either is enough: a text field has focus on a coarse-pointer device, or
 * the visual viewport has lost more than a quarter of the window height.
 * iOS Safari never resizes the layout viewport for the keyboard, so a
 * `position: fixed; bottom: 0` bar there is laid out against the full
 * page and lands in the MIDDLE of what the reader can actually see, then
 * drifts as they scroll. Hiding the bar while typing is the only fix
 * that holds on every browser; Android additionally gets the
 * `interactive-widget=resizes-content` viewport hint from the root
 * layout, which makes fixed chrome behave on its own there.
 */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    let focused = false;

    function compute() {
      const vv = window.visualViewport;
      const shrunk = vv ? vv.height < window.innerHeight * 0.75 : false;
      setOpen((focused && coarse.matches) || shrunk);
    }
    function onFocusIn(e: FocusEvent) {
      focused = e.target instanceof Element && e.target.matches(TEXT_FIELD);
      compute();
    }
    function onFocusOut() {
      focused = false;
      // Let the viewport settle before re-showing, so the bar does not
      // flash at the old (mid-screen) position while the keyboard drops.
      setTimeout(compute, 120);
    }

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", compute);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", compute);
    };
  }, []);

  return open;
}

/**
 * Mobile-only bottom tab bar (spec §A.1). 99% of users are on phones;
 * this puts the five primary destinations one thumb-tap away. Desktop
 * masthead is untouched. Active state = brass-deep text + a 2px top bar
 * (shape, not color alone) + aria-current for assistive tech. Hidden
 * while the on-screen keyboard is up (see useKeyboardOpen).
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();

  return (
    <nav
      aria-label="Primary"
      hidden={keyboardOpen}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/15 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
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
                className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 pt-1 active:opacity-60 ${
                  active ? "text-brass-deep" : "text-foreground/70"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-0.5 bg-brass"
                  />
                )}
                <Icon name={tab.icon} size={20} />
                <span className="text-[0.6875rem] font-medium uppercase tracking-wider">
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
