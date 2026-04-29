// Auth.js v5 server config (Node runtime).
// Email + password admin sign-in via the Credentials provider. Simpler than
// magic-link for 2-3 admin users — no email scanner / prefetcher edge cases.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { authConfig, isAdminEmail } from "@/auth.config";

function getAuthDb() {
  const url =
    process.env.DATABASE_URL?.trim().replace(/\\n$/, "") ||
    "postgresql://placeholder@localhost:5432/placeholder";
  const client = postgres(url, {
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    max: 1,
  });
  return drizzle(client, { schema });
}

const authDb = getAuthDb();

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  // No DrizzleAdapter — Credentials provider is JWT-only (no DB sessions),
  // and we look up the user manually in authorize() below. The schema's
  // accounts/sessions/verification_tokens tables become unused but stay
  // in place; nothing reads or writes them.
  providers: [
    Credentials({
      name: "Sheepdog Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) {
          console.log("[auth] missing email or password");
          return null;
        }
        if (!isAdminEmail(email)) {
          console.log("[auth] email not on ADMIN_EMAILS allowlist:", email);
          return null;
        }
        const expected = process.env.ADMIN_PASSWORD;
        if (!expected) {
          console.error("[auth] ADMIN_PASSWORD env var is not set");
          return null;
        }
        if (password !== expected) {
          console.log("[auth] password mismatch for", email);
          return null;
        }
        // Look up the user record so we can return id + role.
        const [user] = await authDb
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);
        if (!user) {
          console.log("[auth] no users row for allowlisted email:", email);
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          name: user.firstName || user.email,
          role: user.role,
        };
      },
    }),
  ],
});
