#!/usr/bin/env node
// Seed (or upsert) a single admin user. Use this for the very first admin
// before /admin/sign-in works.
//
// Usage:
//   NEON_DATABASE_URL='postgresql://...' \
//     ADMIN_EMAIL='hello@acts2028sheepdogsociety.com' \
//     ADMIN_PASSWORD='change-me-in-prod' \
//     ADMIN_NAME='Drew Godwin' \
//     node scripts/seed-admin.mjs
//
// Idempotent. Re-running with the same email upserts. Re-running with a
// different password rotates the hash.

import postgres from "postgres";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const url = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set NEON_DATABASE_URL (or DATABASE_URL).");
  process.exit(1);
}

const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const name = (process.env.ADMIN_NAME ?? "").trim();

if (!email || !email.includes("@")) {
  console.error("ADMIN_EMAIL must be a valid email.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

try {
  const hash = await bcrypt.hash(password, 12);
  const [first, ...rest] = name.split(/\s+/);
  const firstName = first || null;
  const lastName = rest.length ? rest.join(" ") : null;

  const existing = await sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  `;

  if (existing.length > 0) {
    await sql`
      UPDATE users
      SET role = 'admin',
          status = 'active',
          first_name = ${firstName},
          last_name = ${lastName},
          password_hash = ${hash},
          updated_at = NOW()
      WHERE email = ${email}
    `;
    console.log(`✓ Updated existing admin: ${email}`);
  } else {
    const id = randomUUID();
    await sql`
      INSERT INTO users (id, email, role, status, first_name, last_name, password_hash, created_at, updated_at)
      VALUES (${id}, ${email}, 'admin', 'active', ${firstName}, ${lastName}, ${hash}, NOW(), NOW())
    `;
    console.log(`✓ Created admin: ${email} (${id})`);
  }

  console.log(
    `\nNext step: visit /admin/sign-in and log in with the email + password you set.`
  );
} catch (err) {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await sql.end();
}
