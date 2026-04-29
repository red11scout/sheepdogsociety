// Edge-safe Auth.js config (no Drizzle adapter — DB drivers can't run on edge).
// Imported by middleware.ts. The full server config (auth.ts) extends this
// and attaches the Drizzle adapter + Resend provider.
import type { NextAuthConfig } from "next-auth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export const authConfig = {
  // Pages live inside the (app) route group as /admin/sign-in
  pages: {
    signIn: "/admin/sign-in",
    verifyRequest: "/admin/check-email",
  },
  callbacks: {
    // Hard allowlist for /admin/* magic-link sign-in.
    // Auth.js calls this on every sign-in attempt regardless of provider.
    async signIn({ user }) {
      const email = user?.email ?? null;
      // Only admins on the allowlist may receive a working magic link.
      // Member sign-up via magic link is intentionally not enabled here —
      // the (app) section uses the existing approval-gate (users.status).
      return isAdminEmail(email);
    },
    // Reflect role + id onto the session so route handlers can authorize.
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        // Role is read from the local users table by the adapter; surface it.
        const role = (user as { role?: string }).role;
        if (role) (session.user as { role?: string }).role = role;
      }
      return session;
    },
  },
  // Providers attached in auth.ts (the full config) — the edge config has none
  // because the Resend provider needs the Resend SDK + Drizzle adapter, both of
  // which require Node runtime.
  providers: [],
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 30 }, // 30 days
} satisfies NextAuthConfig;

export { isAdminEmail };
