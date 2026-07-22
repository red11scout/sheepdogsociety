#!/usr/bin/env node
/**
 * One-time backfill: mirror every reachable, subscribed member into the
 * Resend Audience the weekly letter broadcasts to. Idempotent — contacts
 * that already exist are updated, not duplicated. Run after migration 0025:
 *
 *   DATABASE_URL='...' RESEND_API_KEY='...' RESEND_AUDIENCE_ID='...' \
 *     node scripts/sync-members-to-audience.mjs
 */
import postgres from "postgres";
import { Resend } from "resend";

const url = process.env.DATABASE_URL;
const apiKey = process.env.RESEND_API_KEY;
const audienceId = process.env.RESEND_AUDIENCE_ID;
if (!url || !apiKey || !audienceId) {
  console.error("DATABASE_URL, RESEND_API_KEY, and RESEND_AUDIENCE_ID are all required.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const resend = new Resend(apiKey);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rows = await sql`
  SELECT id, email, first_name, subscribed
  FROM members
  WHERE deleted_at IS NULL
    AND is_active = true
    AND email IS NOT NULL
    AND email <> ''
`;
console.log(`${rows.length} members with email to mirror.`);

let synced = 0;
let failed = 0;
for (const row of rows) {
  const unsubscribed = !row.subscribed;
  try {
    const created = await resend.contacts.create({
      audienceId,
      email: row.email,
      firstName: row.first_name ?? undefined,
      unsubscribed,
    });
    if (created.error) {
      // Most likely "already exists" — update instead.
      const updated = await resend.contacts.update({ audienceId, email: row.email, unsubscribed });
      if (updated.error) throw new Error(JSON.stringify(updated.error));
    }
    synced++;
    console.log(`  ok  ${row.email} (${unsubscribed ? "unsubscribed" : "subscribed"})`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${row.email}:`, err.message ?? err);
  }
  await sleep(600); // Resend default rate limit: 2 req/s
}

console.log(`Done. ${synced} synced, ${failed} failed.`);
await sql.end();
process.exit(failed > 0 ? 1 : 0);
