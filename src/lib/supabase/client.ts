"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useMemo } from "react";

// Browser-side Supabase client.
// During the Auth.js v5 migration, Clerk's useSession is removed; this
// client is currently only used as a Realtime broker for chat (channels).
// Auth-aware (RLS-token) calls happen server-side via the service-role
// client. If we keep Supabase Realtime long-term, we'll wire an
// Auth.js-issued JWT here in Phase G; for now, the unauthenticated browser
// client is enough for Realtime subscribe/presence.
function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function useSupabase() {
  return useMemo(() => createBrowserSupabaseClient(), []);
}

export { createBrowserSupabaseClient };
