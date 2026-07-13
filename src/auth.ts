// Auth.js v5 server config (Node runtime).
// Email + password admin sign-in via the Credentials provider.
//
// Per-user bcryptjs hashes live in users.password_hash, accessed via raw SQL
// (not Drizzle) so this still works on databases where migration 0003 has
// not been applied yet. ADMIN_PASSWORD env-var is the universal fallback.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
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
  return { db: drizzle(client, { schema }), sql: client };
}

const { db: authDb, sql: authSql } = getAuthDb();

// Never log emails or discriminating auth-failure reasons in production: that
// leaks PII and gives an oracle distinguishing "not allowlisted" from "wrong
// password". These traces are dev-only.
const AUTH_DEBUG = process.env.NODE_ENV !== "production";
function authDebug(...args: unknown[]): void {
  if (AUTH_DEBUG) console.log("[auth]", ...args);
}

async function fetchPasswordHash(userId: string): Promise<string | null> {
  try {
    const rows = await authSql<
      { password_hash: string | null }[]
    >`SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1`;
    const value = rows[0]?.password_hash ?? "";
    return value.trim() || null;
  } catch {
    // password_hash column doesn't exist yet → migration 0003 not applied.
    console.warn(
      "[auth] password_hash column missing; falling back to ADMIN_PASSWORD env."
    );
    return null;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
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
          authDebug("missing email or password");
          return null;
        }
        if (!isAdminEmail(email)) {
          authDebug("email not on ADMIN_EMAILS allowlist:", email);
          return null;
        }

        // Select only legacy columns — safe regardless of migration state.
        const [user] = await authDb
          .select({
            id: schema.users.id,
            email: schema.users.email,
            firstName: schema.users.firstName,
            role: schema.users.role,
          })
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);

        if (!user) {
          authDebug("no users row for allowlisted email:", email);
          return null;
        }
        if (user.role !== "admin") {
          authDebug("user is not an admin:", email);
          return null;
        }

        const hash = await fetchPasswordHash(user.id);
        let valid = false;
        if (hash) {
          try {
            valid = await bcrypt.compare(password, hash);
          } catch (err) {
            console.error("[auth] bcrypt.compare error:", err);
            valid = false;
          }
        } else {
          // Transition fallback: env-var password.
          const expected = process.env.ADMIN_PASSWORD;
          if (!expected) {
            console.error(
              "[auth] no password_hash for user and ADMIN_PASSWORD env not set"
            );
            return null;
          }
          valid = password === expected;
        }

        if (!valid) {
          authDebug("password mismatch for", email);
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
