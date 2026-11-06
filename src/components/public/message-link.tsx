"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ContactForm from "@/components/public/contact-form";

export const SHEPHERD_EMAIL = "shepherd@acts2028sheepdogsociety.com";

interface MessageLinkProps {
  /** Link text; defaults to the address itself. */
  children?: ReactNode;
  className?: string;
  /** Pre-selects the topic in the form (see TOPICS in contact-form). */
  topic?: string;
  /** Dialog heading. */
  title?: string;
}

/**
 * Every "email us" touchpoint on the site opens THIS: an in-page message
 * form that posts to /api/public/contact, which delivers to shepherd@
 * (and auto-replies to the sender). Never a `mailto:` link — on a desktop
 * without a registered mail app, and in most in-app browsers, mailto
 * fails silently and the visitor sees nothing happen. The address stays
 * visible in the dialog for anyone who would rather write from their own
 * client.
 */
export function MessageLink({
  children,
  className,
  topic,
  title = "Write to the Watch",
}: MessageLinkProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "link-editorial"}
      >
        {children ?? SHEPHERD_EMAIL}
      </button>
      <DialogContent className="max-h-[92dvh] w-[min(100vw-2rem,42rem)] overflow-y-auto overscroll-contain rounded-none border-foreground/15 bg-background p-0 text-foreground sm:max-w-2xl">
        <DialogHeader className="border-b border-foreground/10 px-6 pt-6 pb-5 text-left md:px-8">
          <DialogTitle className="display-soft text-3xl font-normal leading-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Your message goes straight to{" "}
            <span className="select-all text-foreground">{SHEPHERD_EMAIL}</span>.
            Jeremy reads every one and replies to the address you give.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 md:px-8 md:pb-8">
          <ContactForm variant="dialog" defaultTopic={topic} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
