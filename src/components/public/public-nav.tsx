"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { href: "/get-started", label: "Get Started" },
  { href: "/about", label: "About" },
  { href: "/locations", label: "Locations" },
  { href: "/daily-scripture", label: "Daily Scripture" },
  { href: "/scripture-reader", label: "Bible" },
  { href: "/how-we-gather", label: "How We Gather" },
  { href: "/faq", label: "FAQ" },
  { href: "/giving", label: "Give" },
];

export function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Sheepdog Society"
            width={36}
            height={36}
            className="rounded"
          />
          <span className="text-lg font-bold">SheepDog Society</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Sign In + Theme */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button asChild variant="default" size="sm">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>

        {/* Mobile: Theme + Toggle */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            className="rounded-md p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-border pt-2">
            <Button asChild variant="default" size="sm" className="w-full">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
