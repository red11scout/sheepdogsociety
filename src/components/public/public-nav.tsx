"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandWordmark } from "@/components/public/brand-wordmark";

// Brief §3 mandates 5 items max in the primary nav. The legacy app's
// secondary routes (Daily Scripture, Bible reader, FAQ, Giving) live in
// the More menu so we don't break existing inbound links.
const primaryLinks = [
  { href: "/letter", label: "Letter" },
  { href: "/devotionals", label: "Devotionals" },
  { href: "/groups", label: "Groups" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
];

const moreLinks = [
  { href: "/resources", label: "Resources" },
  { href: "/daily-scripture", label: "Daily Scripture" },
  { href: "/scripture-reader", label: "Bible Reader" },
  { href: "/how-we-gather", label: "How We Gather" },
  { href: "/stories", label: "Stories" },
  { href: "/faq", label: "FAQ" },
  { href: "/giving", label: "Give" },
  { href: "/partnerships", label: "Partnerships" },
  { href: "/contact", label: "Contact" },
];

export function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-stone bg-bone/95 backdrop-blur supports-[backdrop-filter]:bg-bone/85">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <BrandWordmark size="md" />

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-3 py-2 font-body text-sm text-iron transition-colors hover:text-brass"
            >
              {link.label}
            </Link>
          ))}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              onBlur={() => setTimeout(() => setMoreOpen(false), 150)}
              className="rounded px-3 py-2 font-body text-sm text-iron transition-colors hover:text-brass"
              aria-expanded={moreOpen}
              aria-haspopup="true"
            >
              More
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded border border-stone bg-bone shadow-lg">
                {moreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-2 font-body text-sm text-iron hover:bg-stone/30 hover:text-brass"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/subscribe"
            className="rounded-full bg-iron px-5 py-2 font-body text-sm font-semibold text-bone transition-colors hover:bg-navy"
          >
            Subscribe
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="rounded p-2 text-iron md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-stone bg-bone px-4 pb-6 md:hidden">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-3 font-body text-base text-iron border-b border-stone/50 hover:text-brass"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <details className="mt-1">
            <summary className="cursor-pointer px-3 py-3 font-body text-base text-iron border-b border-stone/50">
              More
            </summary>
            {moreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-6 py-2 font-body text-sm text-olive hover:text-brass"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </details>
          <Link
            href="/subscribe"
            onClick={() => setMobileOpen(false)}
            className="mt-4 block rounded-full bg-iron px-5 py-3 text-center font-body text-sm font-semibold text-bone hover:bg-navy"
          >
            Subscribe
          </Link>
        </div>
      )}
    </header>
  );
}
