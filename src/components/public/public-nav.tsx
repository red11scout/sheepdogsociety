"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavLink {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}

const navLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/groups", label: "Groups" },
  { href: "/events", label: "Events" },
  { href: "/letter", label: "The Letter" },
  { href: "/bible", label: "Bible" },
  // Gallery is an admin tool (login-gated in middleware); it is spliced
  // in after Bible for signed-in admins only — see `links` below.
  { href: "/resources", label: "Resources" },
  {
    href: "/about",
    label: "About",
    children: [
      { href: "/about", label: "About us" },
      { href: "/stories", label: "Stories" },
      { href: "/how-we-gather", label: "How we gather" },
      { href: "/what-to-expect", label: "What to expect" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/acts-20-28", label: "Acts 20:28" },
    ],
  },
  // { href: "/giving", label: "Give" }, // hidden — uncomment to restore
];

/**
 * Broadsheet masthead (Phase 2). Three stacked rows on desktop:
 *   1. folio topbar (strapline + utility links + theme toggle)
 *   2. masthead row (hairline — crest — wordmark — mirrored crest — hairline)
 *   3. slim nav — the ONLY sticky element (rows 1-2 scroll away)
 * Mobile collapses to the single sticky nav row: crest + wordmark left,
 * theme toggle + hamburger right, slide-down panel below.
 */
export function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Gallery is an admin tool (login-gated in middleware). The tab renders
  // only for a signed-in admin, so visitors never land on a sign-in wall.
  // Client-side session probe keeps every public page statically renderable.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (alive && s?.user && (s.user as { role?: string }).role === "admin") {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // slice(0, 5) = Home, Groups, Events, The Letter, Bible — the Gallery
  // tab lands between Bible and Resources. These indices MUST move when
  // navLinks changes (Phase 3 moved them 4 -> 5 for the Bible tab).
  const links: NavLink[] = isAdmin
    ? [
        ...navLinks.slice(0, 5),
        { href: "/gallery", label: "Gallery" },
        ...navLinks.slice(5),
      ]
    : navLinks;

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
    <>
      {/* Rows 1-2 — scroll away; desktop only */}
      <header className="hidden bg-background text-foreground lg:block">
        {/* Row 1: folio topbar */}
        <div className="border-b border-foreground/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1.5 md:px-10">
            <p className="folio">
              Acts 20:28 &middot; Keep watch over yourselves and all the flock
            </p>
            <div className="flex items-center gap-5">
              <Link href="/acts-20-28" className="folio transition-colors hover:text-brass">
                The Verse
              </Link>
              <Link href="/join" className="folio transition-colors hover:text-brass">
                New here
              </Link>
              <ThemeToggle className="inline-flex h-7 w-7 items-center justify-center text-stone transition-colors hover:text-brass" />
            </div>
          </div>
        </div>

        {/* Row 2: masthead — mirrored crests, heraldic supporters.
            Full-bleed on purpose: the hairlines run from the viewport
            edges to the crests, per the prototype study. */}
        <div className="border-b border-foreground/10">
          <div className="flex items-center gap-6 py-4">
            <div className="hairline flex-1" aria-hidden />
            <Image src="/logo.png" alt="" width={44} height={53} className="h-[53px] w-11" />
            <Link href="/" className="text-center" aria-label="Sheepdog Society home">
              <span className="brand-wordmark block text-3xl">Sheepdog Society</span>
              <span className="folio mt-1.5 block">
                A brotherhood anchored in Acts 20:28
              </span>
            </Link>
            {/* Right crest mirrored so the sheepdogs face the wordmark */}
            <Image
              src="/logo.png"
              alt=""
              width={44}
              height={53}
              className="h-[53px] w-11 -scale-x-100"
            />
            <div className="hairline flex-1" aria-hidden />
          </div>
        </div>
      </header>

      {/* Row 3: the slim sticky nav (mobile: the whole masthead) */}
      <div className="sticky top-0 z-50 border-b border-foreground/15 bg-background/95 text-foreground backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 md:px-10">
          {/* Mobile brand — single-row masthead collapse */}
          <Link
            href="/"
            className="flex items-center gap-3 lg:hidden"
            aria-label="Sheepdog Society home"
          >
            <Image src="/logo.png" alt="" width={32} height={38} className="h-[38px] w-8" />
            <span className="leading-tight">
              <span className="brand-wordmark block text-lg">Sheepdog Society</span>
              <span className="folio block text-[0.625rem]">Acts 20:28</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {links.map((link) => {
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
                      className="folio inline-flex items-center gap-1 px-3 py-3 transition-colors hover:text-brass"
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
                        className="absolute left-0 top-full mt-1 min-w-[200px] border border-foreground/15 bg-popover text-popover-foreground"
                        onMouseEnter={cancelClose}
                        onMouseLeave={scheduleClose}
                      >
                        <ul className="py-2">
                          {link.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className="block px-4 py-2 text-sm text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
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
                  className="folio px-3 py-3 transition-colors hover:text-brass"
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop CTA — the ONE nav CTA, label exactly "Join" */}
          <div className="hidden shrink-0 items-center lg:flex">
            <Link
              href="/join"
              className="section-mark lift inline-flex h-11 items-center gap-2 border border-foreground/70 px-4 transition-colors hover:border-brass hover:bg-brass/10"
            >
              Join
              <Icon name="arrow-right" size={12} />
            </Link>
          </div>

          {/* Mobile cluster */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle className="inline-flex h-11 w-11 items-center justify-center border border-foreground/15 text-foreground/70 transition-colors hover:border-brass hover:text-brass" />
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-none text-foreground"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <Icon name={mobileOpen ? "close" : "menu"} size={22} />
            </button>
          </div>
        </nav>

        {/* Mobile slide-down panel */}
        {mobileOpen && (
          <div className="border-t border-foreground/10 bg-background px-6 pb-6 pt-2 lg:hidden">
            {links.map((link) => (
              <div key={link.href}>
                <Link
                  href={link.href}
                  className="block py-3 text-sm font-medium text-foreground/80"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
                {link.children && (
                  <div className="ml-4 border-l border-foreground/10 pl-4">
                    {link.children
                      .filter((c) => c.href !== link.href)
                      .map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block py-2 text-sm text-foreground/65"
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-4 border-t border-foreground/10 pt-4">
              <Link
                href="/join"
                onClick={() => setMobileOpen(false)}
                className="lift inline-flex h-12 w-full items-center justify-center gap-2 bg-foreground px-5 text-sm font-medium text-background"
              >
                Join
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
