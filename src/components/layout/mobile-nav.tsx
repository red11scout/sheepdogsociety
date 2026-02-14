"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, BookOpen, HandHeart, User } from "lucide-react";
import type { AppUser } from "@/lib/types";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/channels", icon: MessageCircle, label: "Chat" },
  { href: "/bible", icon: BookOpen, label: "Bible" },
  { href: "/prayer", icon: HandHeart, label: "Prayer" },
  { href: "/members", icon: User, label: "Profile" },
];

export function MobileNav({ user: _user }: { user: AppUser }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
