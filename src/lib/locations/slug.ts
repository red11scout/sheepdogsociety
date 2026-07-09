/**
 * URL slug for a location: slugify(name + city), e.g.
 * "Iron Table" + "Rockmart" -> "iron-table-rockmart".
 * Mirrors the SQL backfill in drizzle/0015_locations_slug.sql — if you
 * change one, change both. Dedupe (-2/-3... suffixes) happens at the
 * call site against the DB, not here (this stays pure for Vitest).
 */
export function locationSlug(name: string, city: string): string {
  const base = `${name ?? ""}-${city ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "group";
}
