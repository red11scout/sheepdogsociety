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
      return isAdminEmail(email);
    },
    // JWT callback runs on every request — we surface the user id so
    // server components can read session.user.id without a DB hop.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const role = (user as { role?: string }).role;
        if (role) token.role = role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        if (token.id) session.user.id = token.id as string;
        if (token.role) (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  providers: [],
  // JWT session strategy — required for edge middleware (database sessions
  // need a Drizzle adapter, which can't run on edge runtime).
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 }, // 30 days
} satisfies NextAuthConfig;

export { isAdminEmail };
