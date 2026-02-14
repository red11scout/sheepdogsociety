"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useSession } from "@clerk/nextjs";
import { useMemo } from "react";

function createBrowserSupabaseClient(token: string | null) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    }
  );
}

export function useSupabase() {
  const { session } = useSession();

  return useMemo(() => {
    const token = session ? (session as unknown as { getToken: (opts: { template: string }) => Promise<string | null> }).getToken({ template: "supabase" }) : null;
    // For the browser client, we create without token initially
    // and update headers on each request through the middleware
    return createBrowserSupabaseClient(null);
  }, [session]);
}

export { createBrowserSupabaseClient };
