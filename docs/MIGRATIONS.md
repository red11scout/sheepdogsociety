# Database migrations

The Sheepdog Society site uses **Neon** (Postgres) in production. The
`DATABASE_URL` env var on Vercel is the pooled endpoint (host suffix
`-pooler`); `DATABASE_URL_UNPOOLED` is the direct connection used by
migration scripts that need a stable session. Both are auto-injected
by the Vercel + Neon Marketplace integration. Migrations live as plain
SQL files under `drizzle/`. Every file starts with `IF NOT EXISTS` /
`ON CONFLICT DO NOTHING` guards so they're idempotent and re-runnable.

History: prior to 2026-05-08 the prod database was Supabase. We cut
over to Neon for first-class Vercel env-var sync, per-preview database
branching, and to stop bleeding hours on the dual-system tax.

## How migrations apply to production

There are three paths. Use the first one that's reasonable for the change.

### 1. Automatic — push a new SQL file to `main`

When a new file under `drizzle/*.sql` lands on `main`, the
`Apply database migrations` GitHub Action runs `scripts/apply-neon-migration.mjs`
against prod Neon. This is the default.

**Required setup (one time):**

1. In Neon, copy the **unpooled** connection string (the one without `-pooler` in the host). Migration scripts need a stable session, which the pooler can't guarantee.
2. In GitHub repo: **Settings → Environments → New environment** named
   `production`. Add a secret to that environment called
   `DATABASE_URL_PRODUCTION` with the full URL.
3. (Recommended) Under that environment, add **Required reviewers** = yourself
   so prod migrations can't fire without an approval click.

After that, every PR that adds a `drizzle/*.sql` file applies its migrations
automatically when merged. The workflow is in
`.github/workflows/apply-migrations.yml`.

### 2. Manual — re-run the Action from the GitHub UI

Go to **Actions → Apply database migrations → Run workflow** on `main`. Use this
after rotating the Neon password, swapping to a new Neon project, or to
verify a migration ran cleanly. Safe to re-run because of the `IF NOT EXISTS`
guards.

### 3. Local — emergency or restricted access

```bash
cd /Users/drewgodwin/sheepdogsociety
NEON_DATABASE_URL='postgresql://...' \
  node scripts/apply-neon-migration.mjs
```

The script applies **every** `drizzle/*.sql` in lexical order. Pass a single
filename as the second argument to apply only that one (e.g.
`node scripts/apply-neon-migration.mjs drizzle/0006_resources_overhaul.sql`).

## Writing a new migration

1. Create the next-numbered file in `drizzle/`, e.g. `0007_widgets.sql`.
2. Use `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `INSERT ...
   ON CONFLICT DO NOTHING`. **Never** issue raw `DROP` statements — write a
   reversible move-then-drop or a separate cleanup migration.
3. Mirror the change in `src/db/schema.ts` (or `src/db/schema-new.ts`) so
   Drizzle's types stay accurate.
4. Open a PR. When it merges to `main`, the action runs.

## When the Resources page (or any admin page) shows "can't load"

The page surfaces the **raw Postgres error** at the top. Read it before
guessing. Common causes, in rough order:

1. **Vercel `NEON_DATABASE_URL` points at a different database than the one
   you migrated.** This happens when you create a new Neon project and forget
   to update the env var. Confirm by querying the prod URL with the same
   `SELECT` the page is running.
2. **The `drizzle/` files on `main` haven't been applied to prod.** Re-run
   the Action.
3. **Password rotated, Vercel still has the old URL.** Update the Vercel env,
   trigger a redeploy.
