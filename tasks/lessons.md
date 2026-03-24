# SheepDog Society — Lessons Learned

## TypeScript
- When using `useState` with an object that has union type fields (like `status: "active" | "pending" | "inactive"`), explicitly type the state variable. Using `as const` on the initial value narrows the type too much and causes errors when the setter receives a wider type.

## Vercel + Next.js
- Database connections must be lazy-initialized when deploying to Vercel. The DB connection string may not be available at build time. Use a Proxy pattern to defer initialization until first access.
- Supabase Realtime works on Vercel without changes since it connects from the browser directly to Supabase, not through the server.
- `(public)` and `(app)` route groups can coexist — use middleware to protect `(app)` routes while allowing `(public)` routes through.

## Architecture
- Moving the authenticated home page from `/` to `/dashboard` when adding a public landing page avoids route conflicts between route groups.
- Admin pages should always verify the user's role server-side, not just rely on middleware.

## Design
- Per client notes: use "protect" not "defend" in copy. Stay away from military references. Keep it Christ-centered. Simple enough for older men to use. Confidentiality is important.
