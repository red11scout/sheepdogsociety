import Link from "next/link";
import { listEncouragements } from "@/server/encouragements";
import { Icon } from "@/components/icons/Icon";
import { EmptyState } from "@/components/admin/EmptyState";
import { Magnetic } from "@/components/motion/Magnetic";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EncouragementsAdminPage() {
  let rows: Awaited<ReturnType<typeof listEncouragements>> = [];
  let dbError = "";
  try {
    rows = await listEncouragements();
  } catch (err) {
    dbError =
      err instanceof Error
        ? err.message
        : "Could not load. Migration 0002 may not be applied yet.";
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-12 md:py-14">
      <header>
        <div className="flex items-center gap-4">
          <span className="section-mark text-brass">§ Weekly Encouragements</span>
          <div className="hairline flex-1" />
        </div>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <h1 className="display-xl text-3xl text-bone md:text-5xl">
            Weekly word.
            <br />
            <span className="text-brass">Standardized format.</span>
          </h1>
          <Magnetic>
            <Link
              href="/admin/encouragements/new"
              className="lift group inline-flex h-11 items-center gap-2 border border-bone bg-bone px-6 text-sm font-medium text-ink transition-colors hover:bg-stone"
            >
              <Icon name="sparkles" size={14} />
              Compose this week&rsquo;s encouragement
              <Icon
                name="arrow-right"
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </Magnetic>
        </div>
        <p className="mt-6 max-w-2xl font-pullquote text-base italic leading-relaxed text-stone/80">
          Pick a theme, a cover image, and a voice. Claude drafts the rest. Edit, publish, the public page goes live.
        </p>
      </header>

      <section className="mt-12">
        {dbError ? (
          <div className="border border-oxblood/40 bg-oxblood/15 p-6 text-sm text-bone">
            <p className="display-xl text-base">Database not ready.</p>
            <p className="mt-2 text-stone/80">{dbError}</p>
            <p className="mt-3 text-xs text-stone/60">
              Run:{" "}
              <code className="border border-stone/20 bg-iron/60 px-2 py-0.5">
                NEON_DATABASE_URL=&apos;...&apos; node scripts/apply-neon-migration.mjs drizzle/0002_encouragements_resources.sql
              </code>
            </p>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="sparkles"
            title="No encouragements yet."
            body="Start a new one. Five sections, one cover image, AI by your side. The first issue gets the rhythm started."
            primary={{
              label: "Write the first encouragement",
              href: "/admin/encouragements/new",
            }}
          />
        ) : (
          <div className="border border-stone/15">
            {rows.map((row, i) => (
              <Link
                key={row.id}
                href={`/admin/encouragements/${row.id}`}
                className={cn(
                  "group/row grid grid-cols-[80px_1fr_140px_120px_120px] items-center gap-4 px-6 py-4 transition-colors hover:bg-iron/60",
                  i > 0 && "border-t border-stone/10"
                )}
              >
                <span className="section-mark text-stone/45">
                  No. {row.issueNumber}
                </span>
                <div className="min-w-0">
                  <p className="truncate display-xl text-base text-bone group-hover/row:text-brass md:text-lg">
                    {row.title || "Untitled"}
                  </p>
                  {(row as { theme?: string | null }).theme ? (
                    <p className="mt-1 section-mark text-stone/55">
                      {(row as { theme?: string | null }).theme}
                    </p>
                  ) : row.intro ? (
                    <p className="mt-1 line-clamp-1 text-xs text-stone/55">
                      {row.intro}
                    </p>
                  ) : null}
                </div>
                <StatusPill status={row.status} />
                <span className="text-xs text-stone/55">
                  {row.publishDate
                    ? format(new Date(row.publishDate), "MMM d, yyyy")
                    : "—"}
                </span>
                <span className="text-right text-xs text-stone/55">
                  Updated {format(new Date(row.updatedAt), "MMM d")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "published"
      ? "border-olive/40 text-olive bg-olive/10"
      : status === "scheduled"
      ? "border-brass/40 text-brass bg-brass/10"
      : status === "archived"
      ? "border-stone/30 text-stone/60 bg-stone/5"
      : "border-stone/30 text-stone/70 bg-stone/5";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.18em] border",
        tone
      )}
    >
      {status}
    </span>
  );
}
