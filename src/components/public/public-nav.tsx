"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavLink {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}

const navLinks: NavLink[] = [
  { href: "/locations", label: "Groups" },
  { href: "/encouragements", label: "Letter" },
  { href: "/events", label: "Events" },
  { href: "/resources", label: "Resources" },
  { href: "/stories", label: "Stories" },
  {
    href: "/about",
    label: "About",
    children: [
      { href: "/about", label: "About us" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  // { href: "/giving", label: "Give" }, // hidden — uncomment to restore
];

export function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close any open desktop dropdown on route change-y events
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120);
  }
  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-iron/10 bg-bone/90 backdrop-blur supports-[backdrop-filter]:bg-bone/75">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 md:px-12">
        <Link
          href="/"
          className="flex items-center gap-3 text-iron"
          aria-label="Sheepdog Society home"
        >
          <Image
            src="/logo.png"
            alt=""
            width={36}
            height={36}
            className="rounded-none"
          />
          <div className="leading-tight">
            <div className="display-xl text-base text-iron">
              Sheepdog Society
            </div>
            <div className="section-mark text-[0.625rem] text-brass">
              Acts 20:28
            </div>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => {
            if (link.children) {
              const isOpen = openMenu === link.href;
              return (
                <div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => {
                    cancelClose();
                    setOpenMenu(link.href);
                  }}
                  onMouseLeave={scheduleClose}
                >
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-iron/70 transition-colors hover:text-iron"
                    onFocus={() => setOpenMenu(link.href)}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                  >
                    {link.label}
                    <Icon
                      name="chevron-down"
                      size={12}
                      className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </Link>
                  {isOpen && (
                    <div
                      className="absolute left-0 top-full mt-1 min-w-[180px] border border-iron/10 bg-bone shadow-lg"
                      onMouseEnter={cancelClose}
                      onMouseLeave={scheduleClose}
                    >
                      <ul className="py-2">
                        {link.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className="block px-4 py-2 text-sm text-iron/75 transition-colors hover:bg-iron/5 hover:text-iron"
                              onClick={() => setOpenMenu(null)}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-iron/70 transition-colors hover:text-iron"
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle className="inline-flex h-9 w-9 items-center justify-center border border-iron/15 text-iron/70 transition-colors hover:border-iron hover:text-iron" />
          <Button
            asChild
            size="sm"
            className="lift h-10 rounded-none border border-iron bg-background px-5 text-sm text-foreground hover:bg-background/90"
          >
            <Link href="/get-started">
              Join
              <Icon name="arrow-right" size={14} className="ml-2" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle className="inline-flex h-9 w-9 items-center justify-center border border-iron/15 text-iron/70 transition-colors hover:border-iron hover:text-iron" />
          <button
            type="button"
            className="rounded-none p-2 text-iron"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <Icon name={mobileOpen ? "close" : "menu"} size={22} />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-iron/10 bg-bone px-6 pb-6 pt-2 lg:hidden">
          {navLinks.map((link) => (
            <div key={link.href}>
              <Link
                href={link.href}
                className="block py-3 text-sm font-medium text-iron/80"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
              {link.children && (
                <div className="ml-4 border-l border-iron/10 pl-4">
                  {link.children
                    .filter((c) => c.href !== link.href)
                    .map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block py-2 text-sm text-iron/65"
                        onClick={() => setMobileOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ))}
          <div className="mt-4 border-t border-iron/10 pt-4">
            <Button
              asChild
              size="sm"
              className="lift h-11 w-full rounded-none border border-iron bg-background px-5 text-sm text-foreground hover:bg-background/90"
            >
              <Link href="/get-started" onClick={() => setMobileOpen(false)}>
                Join the brotherhood
                <Icon name="arrow-right" size={16} className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
