#!/usr/bin/env node
// Apply just drizzle/0001_supabase_cutover.sql to the target DB.
// Used during the cutover to add the new Auth.js + brief tables to the
// existing Supabase database without disturbing the 30 community tables.
//
// Usage:
//   DATABASE_URL='postgresql://...' node scripts/apply-supabase-cutover.mjs

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = dirname(dirname(__filename));
const migrationPath = join(projectRoot, "drizzle", "0001_supabase_cutover.sql");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });
const contents = await readFile(migrationPath, "utf8");
const statements = contents
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter((s) => s && !s.match(/^(--|$)/));

console.log(`Applying ${statements.length} statement(s) from 0001_supabase_cutover.sql`);

let okCount = 0;
let failCount = 0;
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.slice(0, 80).replace(/\s+/g, " ");
  process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}… `);
  try {
    await sql.unsafe(stmt);
    console.log("OK");
    okCount++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`FAIL\n     ${msg}`);
    failCount++;
  }
}

await sql.end();
console.log(`\nDone. ${okCount} OK, ${failCount} fail`);
