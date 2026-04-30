#!/usr/bin/env node
// Seed demo content so a fresh dev (or staging) DB has something to look at.
//
// Idempotent: skips rows that already exist by slug/email. Will not duplicate.
//
// Usage:
//   NEON_DATABASE_URL='postgresql://...' node scripts/seed-demo-content.mjs
//
// Seeds:
//   - 5 GA group locations (Ball Ground, Canton, Woodstock, Cumming, Alpharetta)
//   - 6 resources (study guides, field cards, prayer guides)
//   - 4 events (men's breakfast, prayer night, leader huddle, service day)
//   - 3 letters (Watch Yourself, Do Not Stand Alone, The Table Before the Battle)
//
// Skipped:
//   - Members (real signups land via /join)
//   - Devotionals (admin-curated content)
//   - Stories / testimonies (admin-approved)

import postgres from "postgres";
import { randomUUID } from "node:crypto";

const url = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set NEON_DATABASE_URL (or DATABASE_URL).");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

// ────────────────────────────────────────────────────────────────────────────
const LOCATIONS = [
  { slug: "ball-ground-tuesday", name: "Ball Ground · Tuesday breakfast", city: "Ball Ground", state: "GA", lat: 34.3398, lng: -84.3777, day: "Tuesday", time: "06:30", size: 9 },
  { slug: "canton-wednesday", name: "Canton · Wednesday morning", city: "Canton", state: "GA", lat: 34.2367, lng: -84.4907, day: "Wednesday", time: "06:30", size: 12 },
  { slug: "woodstock-friday", name: "Woodstock · Friday before work", city: "Woodstock", state: "GA", lat: 34.1015, lng: -84.5194, day: "Friday", time: "06:00", size: 7 },
  { slug: "cumming-thursday", name: "Cumming · Thursday breakfast", city: "Cumming", state: "GA", lat: 34.2073, lng: -84.1402, day: "Thursday", time: "06:30", size: 8 },
  { slug: "alpharetta-saturday", name: "Alpharetta · Saturday morning", city: "Alpharetta", state: "GA", lat: 34.0754, lng: -84.2941, day: "Saturday", time: "07:00", size: 11 },
];

const RESOURCES = [
  { slug: "how-we-gather", title: "How we gather", category: "guide", level: "all" },
  { slug: "first-table-guide", title: "A first-table guide", category: "guide", level: "newcomer" },
  { slug: "acts-2028-field-card", title: "Acts 20:28 field card", category: "card", level: "all" },
  { slug: "seven-questions-for-men", title: "Seven questions for men", category: "guide", level: "all" },
  { slug: "prayer-before-work", title: "Prayer before work", category: "card", level: "all" },
  { slug: "starting-an-outpost", title: "A guide for starting an outpost", category: "guide", level: "leader" },
];

const LETTERS = [
  { slug: "watch-yourself", issue: 1, title: "Watch yourself.", themeWord: "Watch", subtitle: "Before you watch the flock, you watch yourself." },
  { slug: "do-not-stand-alone", issue: 2, title: "Do not stand alone.", themeWord: "Brothers", subtitle: "A man on his own is a man at risk." },
  { slug: "the-table-before-the-battle", issue: 3, title: "The table before the battle.", themeWord: "Table", subtitle: "First the table, then the work." },
];

const NOW = new Date();
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
const EVENTS = [
  { title: "Men's breakfast — Ball Ground", description: "Coffee, eggs, and one chapter of Acts. Bring a friend.", location: "The Diner on 5th, Ball Ground", startsIn: 7, duration: 90, type: "monthly" },
  { title: "Prayer night", description: "An hour of prayer. No agenda. Show up tired; leave lighter.", location: "Cumming First Baptist", startsIn: 14, duration: 60, type: "monthly" },
  { title: "Leader huddle", description: "Group leaders only. Share what is working. Take a question home.", location: "Online", startsIn: 21, duration: 60, type: "quarterly" },
  { title: "Service day at the food bank", description: "We pack boxes. We work. We do not preach. Wear closed-toe shoes.", location: "North Atlanta Food Bank", startsIn: 35, duration: 240, type: "annual" },
];

// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n→ Seeding demo content into", url.replace(/:[^:]*@/, ":***@"));

  // Find an admin to attribute things to.
  const [admin] = await sql`
    SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1
  `;
  if (!admin) {
    console.error("\nNo admin user found. Run seed-admin.mjs first.");
    process.exit(1);
  }
  const adminId = admin.id;
  console.log(`✓ Admin found: ${adminId.slice(0, 8)}…`);

  // Locations
  for (const l of LOCATIONS) {
    const exists = await sql`SELECT id FROM locations WHERE slug = ${l.slug} LIMIT 1`;
    if (exists.length > 0) {
      console.log(`  · location ${l.slug} exists, skipping`);
      continue;
    }
    await sql`
      INSERT INTO locations (
        id, slug, name, city, state, latitude, longitude,
        meeting_day, meeting_time, group_size, is_active, created_by, created_at, updated_at
      )
      VALUES (
        ${randomUUID()}, ${l.slug}, ${l.name}, ${l.city}, ${l.state}, ${l.lat}, ${l.lng},
        ${l.day}, ${l.time}, ${l.size}, true, ${adminId}, NOW(), NOW()
      )
    `;
    console.log(`  + location: ${l.name}`);
  }

  // Resources
  for (const r of RESOURCES) {
    const exists = await sql`SELECT id FROM resources WHERE slug = ${r.slug} LIMIT 1`;
    if (exists.length > 0) {
      console.log(`  · resource ${r.slug} exists, skipping`);
      continue;
    }
    await sql`
      INSERT INTO resources (
        id, slug, title, description, category, level, is_published, created_by, created_at, updated_at
      )
      VALUES (
        ${randomUUID()}, ${r.slug}, ${r.title},
        ${"A short, plain-language guide for the table."},
        ${r.category}, ${r.level}, true, ${adminId}, NOW(), NOW()
      )
    `;
    console.log(`  + resource: ${r.title}`);
  }

  // Letters
  for (const l of LETTERS) {
    const exists = await sql`SELECT id FROM letters WHERE slug = ${l.slug} LIMIT 1`;
    if (exists.length > 0) {
      console.log(`  · letter ${l.slug} exists, skipping`);
      continue;
    }
    await sql`
      INSERT INTO letters (
        id, slug, issue_number, title, subtitle, theme_word,
        body, body_html, status, author_id,
        published_at, created_at, updated_at
      )
      VALUES (
        ${randomUUID()}, ${l.slug}, ${l.issue}, ${l.title}, ${l.subtitle}, ${l.themeWord},
        ${{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: l.subtitle }] }] }},
        ${`<p>${l.subtitle}</p>`},
        'published', ${adminId},
        ${new Date(NOW.getTime() - l.issue * ONE_WEEK).toISOString()}, NOW(), NOW()
      )
    `;
    console.log(`  + letter: ${l.title}`);
  }

  // Events
  for (const e of EVENTS) {
    const start = new Date(NOW.getTime() + e.startsIn * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + e.duration * 60 * 1000);
    const exists = await sql`
      SELECT id FROM events WHERE title = ${e.title} AND start_time = ${start.toISOString()} LIMIT 1
    `;
    if (exists.length > 0) {
      console.log(`  · event "${e.title}" exists, skipping`);
      continue;
    }
    await sql`
      INSERT INTO events (
        id, title, description, location, start_time, end_time, event_type, created_by, created_at
      )
      VALUES (
        ${randomUUID()}, ${e.title}, ${e.description}, ${e.location},
        ${start.toISOString()}, ${end.toISOString()}, ${e.type}, ${adminId}, NOW()
      )
    `;
    console.log(`  + event: ${e.title}`);
  }

  console.log("\n✓ Done. Visit /locations, /letter, /events, /resources to see the seed.\n");
}

main()
  .catch((err) => {
    console.error("\nSeed failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => sql.end());
