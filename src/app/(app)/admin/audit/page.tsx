import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, auditLog } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { HintTooltip } from "@/components/admin/HintTooltip";
import { format, formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

const ACTION_TONE: Record<string, string> = {
  create: "border-olive/40 bg-olive/10 text-olive",
  update: "border-stone/30 bg-stone/10 text-stone",
  soft_delete: "border-oxblood/40 bg-oxblood/10 text-oxblood",
  restore: "border-olive/40 bg-olive/10 text-olive",
  publish: "border-brass/40 bg-brass/10 text-brass",
  broadcast: "border-brass/40 bg-brass/10 text-brass",
  archive: "border-stone/30 bg-stone/10 text-stone",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string; action?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/admin/sign-in");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin") redirect("/admin/sign-in");

  const sp = await searchParams;
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const limit = 100;
  const offset = (pageNum - 1) * limit;

  const rows = await db
    .select({
      id: auditLog.id,
      userId: auditLog.userId,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      before: auditLog.before,
      after: auditLog.after,
      ipAddress: auditLog.ipAddress,
      createdAt: auditLog.createdAt,
      actorEmail: users.email,
      actorName: users.firstName,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.userId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-12 md:py-14">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <span className="section-mark text-brass">§ Audit</span>
            <div className="hairline w-32" />
          </div>
          <h1 className="display-xl mt-4 text-3xl text-bone md:text-5xl">
            Every change. Every actor.
          </h1>
          <p className="mt-2 font-pullquote text-base italic text-stone">
            Read-only. Soft-delete protected.
          </p>
        </div>
        <HintTooltip hint="Every admin write — letter publish, group edit, member archive — appends a row here. Diffs are stored as JSONB. Never permits inline editing or deletion." />
      </header>

      {rows.length === 0 ? (
        <div className="mt-16 border border-dashed border-stone/30 bg-iron/40 p-16 text-center">
          <Icon name="clipboard" size={48} className="mx-auto text-brass" />
          <h2 className="mt-6 font-display text-2xl text-bone md:text-3xl">
            No audit entries yet.
          </h2>
          <p className="mt-3 max-w-prose mx-auto text-sm leading-relaxed text-stone">
            Once admins start publishing letters, editing groups, or archiving
            members, every action shows up here.
          </p>
        </div>
      ) : (
        <section className="mt-12 border border-stone/15 bg-iron/40">
          <div className="hidden grid-cols-[160px_120px_1fr_1.4fr_140px] gap-4 border-b border-stone/15 px-6 py-3 section-mark text-stone/60 md:grid">
            <span>When</span>
            <span>Action</span>
            <span>Actor</span>
            <span>Entity</span>
            <span>IP</span>
          </div>
          <ul className="divide-y divide-stone/10">
            {rows.map((r) => {
              const tone = ACTION_TONE[r.action] ?? ACTION_TONE.update;
              return (
                <li key={r.id}>
                  <details className="group">
                    <summary className="grid cursor-pointer list-none grid-cols-1 gap-2 px-6 py-4 transition-colors hover:bg-stone/5 md:grid-cols-[160px_120px_1fr_1.4fr_140px] md:items-center md:gap-4">
                      <div>
                        <p className="text-sm text-bone">
                          {formatDistanceToNow(r.createdAt, { addSuffix: true })}
                        </p>
                        <p className="text-xs text-stone/55">
                          {format(r.createdAt, "MMM d · HH:mm")}
                        </p>
                      </div>
                      <div>
                        <span
                          className={`inline-flex h-6 items-center border px-2 text-[0.625rem] font-medium uppercase tracking-[0.14em] ${tone}`}
                        >
                          {r.action}
                        </span>
                      </div>
                      <div className="text-sm text-stone">
                        {r.actorName || r.actorEmail || "system"}
                      </div>
                      <div className="text-sm text-bone">
                        <span className="text-brass">{r.entityType}</span>
                        <span className="ml-2 font-mono text-xs text-stone/60">
                          {String(r.entityId).slice(0, 12)}…
                        </span>
                      </div>
                      <div className="text-xs text-stone/50">
                        {r.ipAddress ?? "—"}
                      </div>
                    </summary>
                    {Boolean(r.before || r.after) && (
                      <div className="grid gap-4 border-t border-stone/10 bg-iron/60 px-6 py-4 md:grid-cols-2">
                        <div>
                          <p className="section-mark text-stone/60">§ Before</p>
                          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words border border-stone/10 bg-iron/40 p-3 font-mono text-[0.6875rem] leading-relaxed text-stone">
{r.before ? JSON.stringify(r.before, null, 2) : "—"}
                          </pre>
                        </div>
                        <div>
                          <p className="section-mark text-brass">§ After</p>
                          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words border border-brass/20 bg-iron/40 p-3 font-mono text-[0.6875rem] leading-relaxed text-bone">
{r.after ? JSON.stringify(r.after, null, 2) : "—"}
                          </pre>
                        </div>
                      </div>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>

          {rows.length === limit && (
            <div className="border-t border-stone/15 px-6 py-3 text-right">
              <a
                href={`?page=${pageNum + 1}`}
                className="section-mark text-brass hover:opacity-70"
              >
                Older →
              </a>
            </div>
          )}
        </section>
      )}

      <p className="mt-12 text-xs leading-relaxed text-stone/50">
        Phase E ships read-only. Filter chips (actor / action / date range) +
        CSV export land in a follow-up. To wire a new module into the audit log,
        call <code className="text-brass">db.insert(auditLog).values({"{ ... }"})</code> at the end of every Server
        Action that mutates state.
      </p>
    </div>
  );
}
