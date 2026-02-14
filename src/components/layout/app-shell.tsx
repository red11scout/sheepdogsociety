"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import type { AppUser } from "@/lib/types";

export function AppShell({
  user,
  children,
}: {
  user: AppUser;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar — hidden on mobile */}
      <div
        className={`hidden md:flex ${
          sidebarOpen ? "w-72" : "w-0"
        } flex-shrink-0 transition-all duration-200`}
      >
        {sidebarOpen && (
          <Sidebar user={user} onToggle={() => setSidebarOpen(false)} />
        )}
      </div>

      {/* Center Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav user={user} />

      {/* Sidebar toggle (when collapsed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-2 top-4 z-50 hidden rounded-md bg-secondary p-2 hover:bg-secondary/80 md:block"
          aria-label="Open sidebar"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
