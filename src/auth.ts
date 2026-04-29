// Full Auth.js v5 server config (Node runtime).
// Wires the Drizzle adapter (pointing at Neon via NEON_DATABASE_URL when set,
// else DATABASE_URL) plus the Resend magic-link provider with a custom
// React-Email template.
//
// Coexists with Clerk for the duration of the migration. The middleware swap
// (replacing Clerk with this) lands in a separate commit once we've smoke-
// tested magic-link delivery on a preview URL.

import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { render } from "@react-email/render";
import * as schema from "@/db/schema";
import { authConfig } from "@/auth.config";
import { resend, FROM_AUTH } from "@/lib/email";
import { MagicLinkEmail } from "@/emails/magic-link";

// Auth.js needs its own Drizzle client (separate from src/db/index.ts) so the
// adapter can read/write account/session/verification_token rows without
// pulling in the full schema's relation graph. Re-using the same Postgres
// driver pool to avoid extra connections.
function getAuthDb() {
  // Use the same DB the rest of the app uses so users + sessions + accounts
  // all live together. Auth.js's Drizzle adapter requires the users table it
  // references to be reachable on the same connection, and the existing
  // members data is in DATABASE_URL.
  const url = process.env.DATABASE_URL?.trim().replace(/\\n$/, "");
  if (!url) {
    throw new Error("DATABASE_URL must be set for Auth.js");
  }
  const client = postgres(url, {
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    max: 1, // single connection — Auth.js writes are infrequent
  });
  return drizzle(client, { schema });
}

const authDb = getAuthDb();

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(authDb, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY ?? process.env.RESEND_API_KEY,
      from: FROM_AUTH,
      // Custom template rendered through @react-email/render so we get the
      // brand-correct email AND the plaintext URL fallback that prevents
      // Outlook Safe Links from burning one-time tokens.
      async sendVerificationRequest({ identifier, url, provider }) {
        const host = new URL(url).host;
        const html = await render(MagicLinkEmail({ url, host }));
        const text = `Sign in to ${host}\n\n${url}\n\nThis link works for 24 hours.\n\nIf you didn't request this, ignore this email.`;
        const result = await resend().emails.send({
          from: provider.from!,
          to: identifier,
          subject: `Sign in to ${host}`,
          html,
          text,
        });
        if (result.error) {
          throw new Error(`Resend send failed: ${result.error.message}`);
        }
      },
    }),
  ],
});
