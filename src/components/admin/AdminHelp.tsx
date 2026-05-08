"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/utils";

/**
 * Persistent ? button (bottom-right, every admin page) + side-sheet.
 * Phase C scope: text + nav links. The MDX-driven help system can come later.
 */

type Topic = {
  title: string;
  body: string;
  href?: string;
};

const TOPICS: { section: string; items: Topic[] }[] = [
  {
    section: "How do I…",
    items: [
      {
        title: "Compose this week's encouragement",
        body: "1. Click Weekly Encouragements in the sidebar. 2. Click Compose this week's encouragement. 3. Theme + title (one word, then a line a man remembers). 4. Cover image: upload or generate. 5. Pick a voice from the ten. 6. Click Draft this encouragement. 7. Use this draft, then publish.",
        href: "/admin/encouragements/new",
      },
      {
        title: "Approve a new admin",
        body: "1. Admins (sidebar Settings group). 2. Pending tab. 3. Click the row. 4. Approve. They get a magic-link email and can sign in.",
        href: "/admin/users",
      },
      {
        title: "Add a group",
        body: "1. Groups (sidebar People group). 2. New group. 3. Name, city, state, latitude/longitude (the city field auto-geocodes). 4. Toggle Active. The locator picks it up immediately.",
        href: "/admin/groups",
      },
      {
        title: "Upload a resource (PDF, guide)",
        body: "1. Resources (sidebar Assets group). 2. Pick a section (Bible Studies, Leader Guides, Workout Plans, Sermons, Devotional Series). 3. New resource. 4. Title, file, optional cover image. Save.",
        href: "/admin/resources",
      },
      {
        title: "Schedule an event",
        body: "1. Events (sidebar People group). 2. New event. 3. Type, title, date, location. 4. Save. The public events page updates immediately.",
        href: "/admin/events",
      },
      {
        title: "Triage a plant request",
        body: "1. Plant requests (sidebar People group, badge shows count). 2. Click a pending request. 3. Reach out by email or phone. 4. Mark as Reviewed.",
        href: "/admin/location-requests",
      },
    ],
  },
  {
    section: "The Letter",
    items: [
      {
        title: "Drafting with Claude",
        body: "Highlight any text in the editor. Six actions show up: Match voice, Tighten, Sharpen verbs, Expand, Fix, Pastoral. Streaming. Cmd-J anywhere triggers the last action.",
        href: "/admin/letters",
      },
      {
        title: "Cover image",
        body: "Click the cover slot and a side-drawer opens with four AI candidates. Pick one or upload your own. Brand voice prompt pre-loaded. Brass-on-iron style preset by default.",
      },
      {
        title: "Publish flow",
        body: "Publish writes to the public archive AND queues a Resend Broadcast in one click. A 3-second countdown gives you time to bail. Letters lock from edits once sent — clone to revise.",
        href: "/admin/letters",
      },
    ],
  },
  {
    section: "Groups & members",
    items: [
      {
        title: "Adding a group",
        body: "Name, city, meeting day, leader name. The leader's email and phone are private — never shown on the public page. The locator pulls from this table.",
        href: "/admin/groups",
      },
      {
        title: "Plant requests",
        body: "Men who want to start a group land in /admin/location-requests. Status workflow: New → Contacted → Vetting → Approved → Launched.",
        href: "/admin/location-requests",
      },
      {
        title: "Members directory",
        body: "Phase D wires the new <MemberSignup /> form. Until then, signups land in newsletterSubscribers and groupInquiries via the existing forms.",
        href: "/admin/users",
      },
    ],
  },
  {
    section: "Site content",
    items: [
      {
        title: "What renders where",
        body: "Public pages live under (public)/. Devotionals pull from the devotionals table (isApproved=true). Letters pull from letters where status='published'. Events from upcoming.",
      },
      {
        title: "Brand voice",
        body: "Every Claude call prepends the brand-voice rules. Banned-word list is hard-coded. Edit src/lib/ai/prompts.ts via PR to change it.",
        href: "/admin/settings",
      },
    ],
  },
  {
    section: "Keyboard",
    items: [
      {
        title: "Cmd-K",
        body: "Open the command palette. Search every group, every letter, every event. Fastest way to anywhere.",
      },
      {
        title: "Cmd-J",
        body: "Open Claude. Ask anything in plain English. Drafting, brainstorming, scripture suggestions.",
      },
    ],
  },
];

export function AdminHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName ?? "")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open help"
        className="lift fixed bottom-6 right-6 z-30 inline-flex h-12 w-12 items-center justify-center border border-stone/30 bg-iron text-bone shadow-lg transition-colors hover:border-brass hover:text-brass focus:outline-none focus:ring-2 focus:ring-brass focus:ring-offset-2 focus:ring-offset-iron"
      >
        <Icon name="help" size={20} />
      </button>

      {/* Side-sheet */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close help"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-iron/60 backdrop-blur-sm"
        />
        <aside
          role="dialog"
          aria-label="Admin help"
          className={cn(
            "absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-stone/15 bg-iron text-bone shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone/15 bg-iron px-6 py-4">
            <div className="flex items-center gap-3">
              <Icon name="help" size={18} className="text-brass" />
              <span className="section-mark text-bone">§ Help</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-stone/60 hover:text-bone"
            >
              <Icon name="close" size={18} />
            </button>
          </header>

          <div className="px-6 py-6">
            <p className="font-pullquote text-lg italic leading-relaxed text-stone">
              Most of what you need is two clicks away. Search the palette with{" "}
              <kbd className="font-mono text-xs text-brass">⌘K</kbd>. Ask Claude
              with <kbd className="font-mono text-xs text-brass">⌘J</kbd>. Open
              this panel anywhere with{" "}
              <kbd className="font-mono text-xs text-brass">?</kbd>.
            </p>

            {TOPICS.map((group) => (
              <section key={group.section} className="mt-10">
                <div className="flex items-center gap-3">
                  <span className="section-mark text-brass">
                    § {group.section}
                  </span>
                  <div className="hairline flex-1 text-stone/30" />
                </div>
                <ul className="mt-4 space-y-5">
                  {group.items.map((t) => (
                    <li key={t.title}>
                      <h3 className="font-display text-base font-semibold text-bone">
                        {t.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-stone">
                        {t.body}
                      </p>
                      {t.href && (
                        <Link
                          href={t.href}
                          onClick={() => setOpen(false)}
                          className="mt-2 inline-flex items-center gap-1 section-mark text-brass hover:opacity-70"
                        >
                          Open
                          <Icon name="arrow-right" size={11} />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <div className="mt-12 border-t border-stone/15 pt-6">
              <p className="text-xs leading-relaxed text-stone/60">
                Need something not covered here? Email{" "}
                <a
                  href="mailto:hello@acts2028sheepdogsociety.com"
                  className="text-brass underline decoration-brass/40 underline-offset-4 hover:text-gold"
                >
                  hello@acts2028sheepdogsociety.com
                </a>
                . A real human reads it.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
