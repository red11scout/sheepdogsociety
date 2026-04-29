// Clerk-compatibility shim for the Auth.js v5 migration.
// Exports `auth()` with the SAME shape Clerk's auth() returned (`{ userId }`)
// so the 76 existing call sites under src/app/api/** and src/app/(app)/**
// can swap their import line without changing call shape:
//
//   - import { auth } from <clerk-server>
//   + import { auth } from "@/lib/auth-compat"
//
// The underlying call is Auth.js v5's `auth()` from src/auth.ts, which reads
// the database session and returns the user. We map session.user.id back to
// `userId` for API parity.
//
// Once the migration is fully settled, call sites should be migrated to use
// `auth()` directly from "@/auth" so they get the full Session object.

import { auth as authjsAuth } from "@/auth";

export interface AuthCompatResult {
  userId: string | null;
  sessionId: string | null;
}

export async function auth(): Promise<AuthCompatResult> {
  const session = await authjsAuth();
  return {
    userId: session?.user?.id ?? null,
    sessionId: session?.user?.id ? `session_${session.user.id}` : null,
  };
}
