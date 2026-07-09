"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/public/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="font-pullquote text-sm italic text-brass">
        Welcome, brother. Watch your inbox.
      </p>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex items-center border border-stone/25 transition-colors focus-within:border-brass"
      >
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-label="Email address"
          className="h-11 flex-1 bg-transparent px-4 text-sm text-foreground placeholder:text-stone/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="lift flex h-11 items-center gap-2 bg-brass px-4 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "..." : "Join"}
          {status !== "loading" && <Icon name="arrow-right" size={14} />}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-2 text-sm text-destructive">
          That did not go through. Check the address and try again.
        </p>
      )}
    </>
  );
}
