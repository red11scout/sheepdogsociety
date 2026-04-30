"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/locations", label: "Groups" },
  { href: "/how-we-gather", label: "How we gather" },
  { href: "/about", label: "About" },
  { href: "/stories", label: "Stories" },
  { href: "/daily-scripture", label: "Daily scripture" },
  { href: "/faq", label: "FAQ" },
  { href: "/giving", label: "Give" },
];

export function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm font-medium text-iron/70 transition-colors hover:text-iron"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button
            asChild
            size="sm"
            className="lift h-10 rounded-none border border-iron bg-iron px-5 text-sm text-bone hover:bg-iron/90"
          >
            <Link href="/get-started">
              Join
              <Icon name="arrow-right" size={14} className="ml-2" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          className="rounded-none p-2 text-iron lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <Icon name={mobileOpen ? "close" : "menu"} size={22} />
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-iron/10 bg-bone px-6 pb-6 pt-2 lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-3 text-sm font-medium text-iron/80"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-4 border-t border-iron/10 pt-4">
            <Button
              asChild
              size="sm"
              className="lift h-11 w-full rounded-none border border-iron bg-iron px-5 text-sm text-bone hover:bg-iron/90"
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
