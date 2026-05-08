import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

// DATABASE_URL on Vercel points at the Neon pooled endpoint (host
// suffix is `-pooler`). That's the prod database for the entire
// runtime app (this client + Auth.js in src/auth.ts both read it).
// The Marketplace integration also injects DATABASE_URL_UNPOOLED for
// migration scripts that need a stable session.
//
// History: prior to 2026-05-08 prod was on Supabase; we cut over to
// Neon to get first-class Vercel env-var sync and per-preview DB
// branching. See docs/MIGRATIONS.md.
function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL?.trim().replace(/\\n$/, "");
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    const client = postgres(connectionString, {
      // Neon's pgbouncer-style pooler is transaction-mode; prepared
      // statements aren't supported, so prepare must be off.
      prepare: false,
      // Match Supabase pooler-side limits. Each Vercel serverless function
      // runs in its own process; max=20 lets parallel page-load fan-out
      // (e.g. dashboard's 8-query Promise.all + per-page layout queries)
      // run without queueing on the client side.
      max: 20,
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
