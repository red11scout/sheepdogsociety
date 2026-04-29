import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client (Server Components / Route Handlers).
// During the Auth.js v5 migration, the Clerk-issued Supabase JWT is no
// longer available. RLS-aware queries should switch to using the
// service-role client in src/lib/supabase/admin.ts (server-only).
// This client now operates at anon level, suitable for public-read use.
// Phase G: optionally re-issue an Auth.js-signed Supabase JWT if we keep
// using Supabase Realtime/RLS long-term.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context — ignore
          }
        },
      },
    }
  );
}
