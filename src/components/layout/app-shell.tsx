"use client";

import type { AppUser } from "@/lib/types";

/**
 * AppShell wraps the (app) route group. Historically this rendered a
 * member-area sidebar + mobile-nav for non-admin pages. Since the member
 * area is decommissioned (per the 2026-04-29 architecture decision),
 * the only surviving routes under (app) are /admin/**, which have their
 * own AdminShell. So this component is now a thin pass-through, kept
 * only so the (app)/layout.tsx import keeps working.
 */
export function AppShell({
  user: _user,
  children,
}: {
  user: AppUser;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
