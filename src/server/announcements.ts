"use server";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users } from "@/db/schema";
import { members, announcements } from "@/db/schema-members";
import { and, desc, eq, inArray, isNull, isNotNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { render } from "@react-email/render";
import { resend, FROM_SHEPHERD, SHEPHERD_EMAIL } from "@/lib/email";
import { AnnouncementEmail } from "@/emails/announcement";
import {
  chunk,
  dedupeRecipients,
  unsubscribeToken,
  type Recipient,
} from "@/lib/announcements/helpers";

async function requireAdmin(): Promise<{ userId: string; email: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") throw new Error("Forbidden");
  return { userId, email: me.email ?? "" };
}

export type AnnouncementAudience = "all" | "leaders" | "groups";

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: "All subscribed members",
  leaders: "Leaders only",
  groups: "Men in groups",
};

/** Only men who can actually be reached and have not opted out. */
function audienceWhere(audience: AnnouncementAudience) {
  const base = [
    isNull(members.deletedAt),
    eq(members.isActive, true),
    eq(members.subscribed, true),
    isNotNull(members.email),
    ne(members.email, ""),
  ];
  if (audience === "leaders") {
    base.push(inArray(members.role, ["leader", "asst_leader"]));
  } else if (audience === "groups") {
    base.push(isNotNull(members.groupId));
  }
  return and(...base);
}

async function loadRecipients(
  audience: AnnouncementAudience
): Promise<Recipient[]> {
  const rows = await db
    .select({
      memberId: members.id,
      email: members.email,
      firstName: members.firstName,
      legacyName: members.name,
    })
    .from(members)
    .where(audienceWhere(audience));
  return dedupeRecipients(
    rows.map((r) => ({
      memberId: r.memberId,
      email: r.email ?? "",
      firstName: r.firstName ?? r.legacyName?.trim().split(/\s+/)[0] ?? null,
    }))
  );
}

export async function getAudienceCounts(): Promise<
  Record<AnnouncementAudience, number>
> {
  await requireAdmin();
  const count = async (a: AnnouncementAudience) => {
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(members)
      .where(audienceWhere(a));
    return row?.c ?? 0;
  };
  return { all: await count("all"), leaders: await count("leaders"), groups: await count("groups") };
}

export interface AnnouncementHistoryRow {
  id: string;
  subject: string;
  audience: string;
  audienceLabel: string;
  recipientCount: number;
  sentAt: string;
}

export async function listAnnouncements(): Promise<AnnouncementHistoryRow[]> {
  await requireAdmin();
  const rows = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.sentAt))
    .limit(25);
  return rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    audience: r.audience,
    audienceLabel:
      AUDIENCE_LABELS[r.audience as AnnouncementAudience] ?? r.audience,
    recipientCount: r.recipientCount,
    sentAt: r.sentAt instanceof Date ? r.sentAt.toISOString() : String(r.sentAt),
  }));
}

export interface SendAnnouncementInput {
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  audience: AnnouncementAudience;
  /** true = send only to the signed-in admin, nothing recorded. */
  testOnly?: boolean;
}

export interface SendAnnouncementResult {
  ok: boolean;
  sent: number;
  failed: number;
  reason?: string;
}

/**
 * Send a branded shepherd@ email to the chosen audience. Per-recipient
 * batched sends (not a Resend Broadcast) because the members pool is
 * segmented per send and each man gets his own unsubscribe link.
 */
export async function sendAnnouncement(
  input: SendAnnouncementInput
): Promise<SendAnnouncementResult> {
  const admin = await requireAdmin();

  const subject = input.subject?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  const ctaLabel = input.ctaLabel?.trim() ?? "";
  const ctaUrl = input.ctaUrl?.trim() ?? "";
  if (!subject || subject.length > 200) {
    return { ok: false, sent: 0, failed: 0, reason: "Subject is required (max 200 characters)." };
  }
  if (!body || body.length > 10000) {
    return { ok: false, sent: 0, failed: 0, reason: "Message is required (max 10,000 characters)." };
  }
  if ((ctaLabel && !ctaUrl) || (ctaUrl && !ctaLabel)) {
    return { ok: false, sent: 0, failed: 0, reason: "Button needs both a label and a link." };
  }
  if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) {
    return { ok: false, sent: 0, failed: 0, reason: "Button link must start with http(s)://." };
  }
  if (!["all", "leaders", "groups"].includes(input.audience)) {
    return { ok: false, sent: 0, failed: 0, reason: "Pick an audience." };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com";

  let recipients: Recipient[];
  if (input.testOnly) {
    if (!admin.email) {
      return { ok: false, sent: 0, failed: 0, reason: "Your admin account has no email to test with." };
    }
    recipients = [{ memberId: "", email: admin.email, firstName: null }];
  } else {
    recipients = await loadRecipients(input.audience);
    if (recipients.length === 0) {
      return { ok: false, sent: 0, failed: 0, reason: "No subscribed members match that audience." };
    }
  }

  let sent = 0;
  let failed = 0;
  for (const batch of chunk(recipients, 100)) {
    const payload = await Promise.all(
      batch.map(async (r) => {
        const unsubscribeUrl = r.memberId
          ? `${siteUrl}/api/public/unsubscribe?m=${r.memberId}&t=${unsubscribeToken(r.memberId)}`
          : undefined;
        const html = await render(
          AnnouncementEmail({
            subject,
            body,
            ctaLabel: ctaLabel || undefined,
            ctaUrl: ctaUrl || undefined,
            unsubscribeUrl,
          })
        );
        const text = [
          body,
          ctaLabel && ctaUrl ? `\n${ctaLabel}: ${ctaUrl}` : "",
          `\n— Sheepdog Society · acts2028sheepdogsociety.com`,
          unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : "",
        ]
          .filter(Boolean)
          .join("\n");
        return {
          from: FROM_SHEPHERD,
          to: r.email,
          replyTo: SHEPHERD_EMAIL,
          subject,
          html,
          text,
        };
      })
    );
    try {
      const res = await resend().batch.send(payload);
      if (res.error) {
        console.error("announcement batch rejected:", res.error);
        failed += batch.length;
      } else {
        sent += batch.length;
      }
    } catch (err) {
      console.error("announcement batch failed:", err);
      failed += batch.length;
    }
    // Stay under Resend's default request rate between batch calls.
    await new Promise((r) => setTimeout(r, 600));
  }

  if (!input.testOnly && sent > 0) {
    await db.insert(announcements).values({
      subject,
      body,
      ctaLabel,
      ctaUrl,
      audience: input.audience,
      sentBy: admin.userId,
      recipientCount: sent,
    });
    revalidatePath("/admin/announcements");
  }

  return { ok: failed === 0 && sent > 0, sent, failed };
}
