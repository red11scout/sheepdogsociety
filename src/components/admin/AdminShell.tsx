"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { CommandPalette } from "./CommandPalette";
import { AIAssistant } from "./AIAssistant";
import { AdminHelp } from "./AdminHelp";

interface AdminShellProps {
  user: { id: string; name: string | null; email: string | null };
  pendingCount?: number;
  pendingTestimonies?: number;
  pendingLocationRequests?: number;
  pendingLocationInterests?: number;
  children: React.ReactNode;
}

export function AdminShell({
  user,
  pendingCount,
  pendingTestimonies,
  pendingLocationRequests,
  pendingLocationInterests,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState<string | undefined>();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close mobile nav when route changes
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // ⌘K to open palette / ⌘J for AI
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "j" &&
        !e.shiftKey
      ) {
        e.preventDefault();
        setAssistantOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="admin-shell flex h-screen overflow-hidden bg-iron text-bone">
      {/* Desktop sidebar — always visible at lg+ */}
      <div className="hidden lg:flex">
        <AdminSidebar
          pendingCount={pendingCount}
          pendingTestimonies={pendingTestimonies}
          pendingLocationRequests={pendingLocationRequests}
          pendingLocationInterests={pendingLocationInterests}
        />
      </div>

      {/* Mobile drawer overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-iron/85 backdrop-blur-md lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="h-full w-72 max-w-[85%] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <AdminSidebar
              pendingCount={pendingCount}
              pendingTestimonies={pendingTestimonies}
              pendingLocationRequests={pendingLocationRequests}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopbar
          user={user}
          onOpenCommand={() => setPaletteOpen(true)}
          onOpenAssistant={() => setAssistantOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-iron">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAskAi={(p) => {
          setSeedPrompt(p);
          setAssistantOpen(true);
        }}
      />

      <AIAssistant
        open={assistantOpen}
        onClose={() => {
          setAssistantOpen(false);
          setSeedPrompt(undefined);
        }}
        initialPrompt={seedPrompt}
      />

      <AdminHelp />
    </div>
  );
}
