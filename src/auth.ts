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
// Auth.js's DrizzleAdapter does runtime type-checks on the DB instance, so
// it has to be a real Drizzle client at module-import time. To avoid
// crashing at build time when DATABASE_URL isn't set in the env (e.g.
// preview deploys without the secret), we fall back to a placeholder URL —
// the placeholder client is never actually queried during build.
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
      // Generate a SHORT 8-character code instead of the default UUID. The
      // user enters this code on a form (POST), which is immune to the email
      // scanner / Outlook Safe Links / Gmail prefetcher problem that burns
      // one-time tokens before the user can click them.
      generateVerificationToken: () => {
        // Excludes look-alike chars (0/O, 1/I, etc.)
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        const buf = new Uint8Array(8);
        crypto.getRandomValues(buf);
        for (let i = 0; i < 8; i++) {
          code += chars[buf[i] % chars.length];
        }
        return code;
      },
      // Email shows the code prominently. The link still works for users
      // whose mail client doesn't prefetch (most desktop Gmail), but the
      // code is the canonical path.
      async sendVerificationRequest({ identifier, url, token, provider }) {
        const host = new URL(url).host;
        const html = await render(MagicLinkEmail({ url, host, code: token }));
        const text = `Sign in to ${host}

Your code: ${token}

Enter this code at:
https://${host}/admin/sign-in

The code works for 24 hours. If you didn't request this, ignore this email.`;
        const result = await resend().emails.send({
          from: provider.from!,
          to: identifier,
          subject: `Sheepdog Society sign-in code: ${token}`,
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
