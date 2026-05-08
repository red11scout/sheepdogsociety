import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, members, memberNotificationPrefs } from "@/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { HintTooltip } from "@/components/admin/HintTooltip";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  new: { label: "New", tone: "bg-brass/15 text-brass border-brass/40" },
  reviewed: { label: "Reviewed", tone: "bg-stone/15 text-stone border-stone/40" },
  contacted: { label: "Contacted", tone: "bg-stone/15 text-stone border-stone/40" },
  connected: { label: "Connected", tone: "bg-olive/15 text-olive border-olive/40" },
  needs_followup: { label: "Follow up", tone: "bg-oxblood/15 text-oxblood border-oxblood/40" },
  not_a_fit: { label: "Not a fit", tone: "bg-stone/10 text-stone/60 border-stone/30" },
  archived: { label: "Archived", tone: "bg-stone/5 text-stone/40 border-stone/20" },
};

const INTENT_LABELS: Record<string, string> = {
  join: "Join a group",
  start: "Start a group",
  just_keep_posted: "Just keep posted",
};

export default async function AdminMembersPage() {
  const { userId } = await auth();
  if (!userId) redirect("/admin/sign-in");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin") redirect("/admin/sign-in");

  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      email: members.email,
      phone: members.phone,
      intent: members.intent,
      city: members.city,
      state: members.state,
      status: members.status,
      source: members.source,
      note: members.note,
      createdAt: members.createdAt,
      wantsNewsletter: memberNotificationPrefs.wantsNewsletter,
      wantsEvents: memberNotificationPrefs.wantsEvents,
      wantsSms: memberNotificationPrefs.wantsSms,
    })
    .from(members)
    .leftJoin(
      memberNotificationPrefs,
      eq(memberNotificationPrefs.memberId, members.id)
    )
    .where(isNull(members.deletedAt))
    .orderBy(desc(members.createdAt))
    .limit(500);

  const newCount = rows.filter((r) => r.status === "new").length;
  const followupCount = rows.filter((r) => r.status === "needs_followup").length;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-12 md:py-14">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <span className="section-mark text-brass">§ Members</span>
            <div className="hairline w-32" />
          </div>
          <h1 className="display-xl mt-4 text-3xl text-bone md:text-5xl">
            {rows.length === 0 ? "No signups yet." : `${rows.length} man${rows.length === 1 ? "" : "men"} signed up.`}
          </h1>
          {rows.length > 0 && (
            <p className="mt-2 font-pullquote text-base italic text-stone">
              {newCount} new · {followupCount} need follow-up
            </p>
          )}
        </div>
        <HintTooltip hint="Every signup from /join, group cards, or homepage CTAs lands here. Read-only for now. Use email or phone to follow up; status edits land in Phase E." />
      </header>

      {/* Empty state */}
      {rows.length === 0 ? (
        <div className="mt-16 border border-dashed border-stone/30 bg-iron/40 p-16 text-center">
          <Icon name="brothers" size={48} className="mx-auto text-brass" />
          <h2 className="mt-6 font-display text-2xl text-bone md:text-3xl">
            The first signup will land here.
          </h2>
          <p className="mt-3 max-w-prose mx-auto text-sm leading-relaxed text-stone">
            Members live as DB rows. They never log in. You can email them, text
            them, assign them to a group, or archive. Phase E adds CSV export +
            inline status editing.
          </p>
          <Link
            href="/join"
            className="lift mt-8 inline-flex h-11 items-center gap-2 border border-bone/30 px-5 text-xs font-medium uppercase tracking-[0.18em] text-bone transition-colors hover:border-brass hover:text-brass"
          >
            See the public form
            <Icon name="arrow-up-right" size={14} />
          </Link>
        </div>
      ) : (
        <section className="mt-12 border border-stone/15 bg-iron/40">
          <div className="hidden grid-cols-[1.5fr_1.6fr_1fr_1fr_1.2fr_120px] gap-4 border-b border-stone/15 px-6 py-3 section-mark text-stone/60 md:grid">
            <span>Name</span>
            <span>Contact</span>
            <span>Intent</span>
            <span>Source</span>
            <span>Notify</span>
            <span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-stone/10">
            {rows.map((r) => {
              const status = STATUS_LABELS[r.status] ?? STATUS_LABELS.new;
              const intent = INTENT_LABELS[r.intent] ?? r.intent;
              const place = [r.city, r.state].filter(Boolean).join(", ");
              return (
                <li key={r.id} className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-[1.5fr_1.6fr_1fr_1fr_1.2fr_120px] md:items-center md:gap-4">
                  <div>
                    <p className="font-display text-base text-bone">{r.name}</p>
                    {place && (
                      <p className="text-xs text-stone/60">{place}</p>
                    )}
                  </div>
                  <div className="text-sm">
                    <a
                      href={`mailto:${r.email}`}
                      className="block text-bone hover:text-brass"
                    >
                      {r.email}
                    </a>
                    {r.phone && (
                      <a
                        href={`tel:${r.phone}`}
                        className="block text-xs text-stone/60 hover:text-brass"
                      >
                        {r.phone}
                      </a>
                    )}
                  </div>
                  <div className="text-sm text-stone">{intent}</div>
                  <div className="text-xs text-stone/60">
                    {r.source ?? "—"}
                    <br />
                    {format(r.createdAt, "MMM d, yyyy")}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[0.6875rem]">
                    {r.wantsNewsletter && (
                      <NotifyPill icon="mail" label="Letter" />
                    )}
                    {r.wantsEvents && <NotifyPill icon="calendar" label="Events" />}
                    {r.wantsSms && <NotifyPill icon="phone" label="SMS" />}
                  </div>
                  <div className="md:text-right">
                    <span
                      className={`inline-flex h-6 items-center border px-2 text-[0.625rem] font-medium uppercase tracking-[0.14em] ${status.tone}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  {r.note && (
                    <p className="md:col-span-6 mt-1 max-w-prose text-xs leading-relaxed text-stone/70">
                      <span className="text-brass">Note:</span> {r.note}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="mt-12 text-xs leading-relaxed text-stone/50">
        Read-only this phase. Inline status editing, CSV export, and note editing land in the next phase. For now, follow up by email or phone, and ask a developer if you need a status change.
      </p>
    </div>
  );
}

function NotifyPill({ icon, label }: { icon: "mail" | "calendar" | "phone"; label: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 border border-stone/30 bg-iron/60 px-2 text-stone">
      <Icon name={icon} size={10} className="text-brass" />
      {label}
    </span>
  );
}
