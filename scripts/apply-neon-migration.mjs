#!/usr/bin/env node
// Apply drizzle/0000_*.sql migrations to a target Postgres URL.
// Usage:
//   NEON_DATABASE_URL='postgresql://...' node scripts/apply-neon-migration.mjs
//
// Reads every drizzle/*.sql file in lexical order and executes each statement.
// Statement separator is '--> statement-breakpoint' (Drizzle convention).

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = dirname(dirname(__filename));
const migrationsDir = join(projectRoot, "drizzle");

const url = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set NEON_DATABASE_URL or DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

const entries = await readdir(migrationsDir);
const sqlFiles = entries.filter((f) => f.endsWith(".sql")).sort();

if (sqlFiles.length === 0) {
  console.error(`No .sql files found in ${migrationsDir}`);
  process.exit(1);
}

console.log(`Applying ${sqlFiles.length} migration(s) from ${migrationsDir}`);

for (const file of sqlFiles) {
  const path = join(migrationsDir, file);
  const contents = await readFile(path, "utf8");
  const statements = contents
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`\n${file}: ${statements.length} statement(s)`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.slice(0, 70).replace(/\s+/g, " ");
    process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}… `);
    try {
      await sql.unsafe(stmt);
      console.log("OK");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAIL\n     ${msg}`);
      // Continue; many failures are "already exists" which we tolerate
      // when re-running. A hard failure should be inspected.
    }
  }
}

await sql.end();
console.log("\nDone.");
