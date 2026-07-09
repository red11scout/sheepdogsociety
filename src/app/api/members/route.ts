import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { members, memberNotificationPrefs } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { resend, FROM_AUTH, FROM_NEWSLETTER } from "@/lib/email";
import { sendSms, SMS_OPT_IN_DISCLOSURE } from "@/lib/sms";

export const runtime = "nodejs";

const SignupBody = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(254),
    phone: z.string().max(24).optional(),
    intent: z.enum(["join", "start", "just_keep_posted"]),
    groupId: z.string().uuid().optional(),
    city: z.string().max(80).optional(),
    state: z.string().max(2).optional(),
    zip: z.string().max(10).optional(),
    timeline: z.enum(["now", "three_months", "exploring"]).optional(),
    note: z.string().max(2000).optional(),
    wantsNewsletter: z.boolean().default(true),
    wantsEvents: z.boolean().default(true),
    wantsSms: z.boolean().default(false),
    source: z.string().max(120).optional(),
    // No .max(0) — that would throw a ZodError on a filled honeypot
    // during .parse() below, skipping the runtime check further down
    // and surfacing a visible 400 to bots instead of a silent fake-success.
    honeypot: z.string().max(500).optional(),
    smsConsentTextShown: z.string().max(2000).optional(),
  })
  // "Start a group" is meaningless without a place to start it. The UI
  // marks city/state required for this path but neither the button's
  // disable logic nor this schema enforced it — a start-intent signup
  // could go through with no location at all.
  .superRefine((data, ctx) => {
    if (data.intent === "start") {
      if (!data.city?.trim()) {
        ctx.addIssue({ code: "custom", message: "City is required to start a group.", path: ["city"] });
      }
      if (!data.state?.trim()) {
        ctx.addIssue({ code: "custom", message: "State is required to start a group.", path: ["state"] });
      }
    }
  });

export async function POST(req: Request) {
  // Parse + validate.
  let body: z.infer<typeof SignupBody>;
  try {
    const json = await req.json();
    body = SignupBody.parse(json);
  } catch (err) {
    const message = err instanceof z.ZodError ? "Check your inputs and try again." : "Bad request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Honeypot — bots fill this; humans never see it.
  if (body.honeypot && body.honeypot.length > 0) {
    // Pretend we accepted it. Bot gets a 200 and never knows.
    return NextResponse.json({ ok: true, memberId: "honeypot", covenantUrl: "" });
  }

  const emailLower = body.email.trim().toLowerCase();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;

  try {
    // Upsert by email. If a row exists (active), update it; else create.
    const [existing] = await db
      .select()
      .from(members)
      .where(and(eq(members.email, emailLower), isNull(members.deletedAt)))
      .limit(1);

    let memberId: string;

    if (existing) {
      await db
        .update(members)
        .set({
          name: body.name,
          phone: body.phone ?? null,
          intent: body.intent,
          groupId: body.intent === "join" ? body.groupId ?? null : null,
          city: body.intent === "start" ? body.city ?? null : null,
          state: body.intent === "start" ? body.state ?? null : null,
          zip: body.intent === "start" ? body.zip ?? null : null,
          timeline: body.intent === "start" ? body.timeline ?? null : null,
          note: body.note ?? null,
          source: body.source ?? null,
          updatedAt: new Date(),
        })
        .where(eq(members.id, existing.id));
      memberId = existing.id;
    } else {
      const [created] = await db
        .insert(members)
        .values({
          name: body.name,
          email: emailLower,
          phone: body.phone ?? null,
          intent: body.intent,
          groupId: body.intent === "join" ? body.groupId ?? null : null,
          city: body.intent === "start" ? body.city ?? null : null,
          state: body.intent === "start" ? body.state ?? null : null,
          zip: body.intent === "start" ? body.zip ?? null : null,
          timeline: body.intent === "start" ? body.timeline ?? null : null,
          note: body.note ?? null,
          source: body.source ?? null,
          termsAcceptedAt: new Date(),
        })
        .returning({ id: members.id });
      memberId = created.id;
    }

    // Notification prefs — upsert by memberId.
    const unsubscribeToken = randomBytes(32).toString("hex");
    const wantsSms = body.wantsSms && !!body.phone;

    const [existingPrefs] = await db
      .select()
      .from(memberNotificationPrefs)
      .where(eq(memberNotificationPrefs.memberId, memberId))
      .limit(1);

    if (existingPrefs) {
      await db
        .update(memberNotificationPrefs)
        .set({
          wantsNewsletter: body.wantsNewsletter,
          wantsEvents: body.wantsEvents,
          wantsSms,
          smsConsentAt: wantsSms ? new Date() : existingPrefs.smsConsentAt,
          smsConsentIp: wantsSms ? ip : existingPrefs.smsConsentIp,
          smsConsentUserAgent: wantsSms ? ua : existingPrefs.smsConsentUserAgent,
          smsConsentTextShown: wantsSms
            ? body.smsConsentTextShown ?? SMS_OPT_IN_DISCLOSURE
            : existingPrefs.smsConsentTextShown,
          updatedAt: new Date(),
        })
        .where(eq(memberNotificationPrefs.id, existingPrefs.id));
    } else {
      await db.insert(memberNotificationPrefs).values({
        memberId,
        wantsNewsletter: body.wantsNewsletter,
        wantsEvents: body.wantsEvents,
        wantsSms,
        smsConsentAt: wantsSms ? new Date() : null,
        smsConsentIp: wantsSms ? ip : null,
        smsConsentUserAgent: wantsSms ? ua : null,
        smsConsentTextShown: wantsSms
          ? body.smsConsentTextShown ?? SMS_OPT_IN_DISCLOSURE
          : null,
        emailUnsubscribeToken: unsubscribeToken,
      });
    }

    // Fire-and-forget welcome email (Resend). Don't block on failures.
    let welcomeError: string | null = null;
    try {
      await resend().emails.send({
        from: FROM_NEWSLETTER,
        to: emailLower,
        subject: "A brother saved you a seat",
        text: buildWelcomeEmail(body.name, body.intent),
      });
    } catch (err) {
      welcomeError = err instanceof Error ? err.message : "Resend failed";
      console.error("members welcome email failed", err);
    }

    // Admin notification.
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (adminEmails.length > 0) {
      try {
        await resend().emails.send({
          from: FROM_AUTH,
          to: adminEmails,
          subject: `New signup — ${body.name} (${body.intent})`,
          text: buildAdminAlert(body, memberId),
        });
      } catch (err) {
        console.error("members admin alert failed", err);
      }
    }

    // SMS double-opt-in (Phase D returns not_configured; handled gracefully).
    let smsStatus = "not_applicable";
    if (wantsSms && body.phone) {
      const result = await sendSms({
        to: body.phone,
        message:
          "Reply YES to confirm event reminders from Acts 20:28 Sheepdog Society. Msg & data rates may apply. Reply STOP to opt out, HELP for help.",
        category: "double_opt_in",
        memberId,
      });
      smsStatus = result.status;
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const covenantUrl = `${baseUrl}/api/og/covenant/${memberId}`;

    return NextResponse.json({
      ok: true,
      memberId,
      covenantUrl,
      smsStatus,
      welcomeWarning: welcomeError,
    });
  } catch (err) {
    console.error("members POST failed", err);
    return NextResponse.json(
      { error: "Something broke on our end. Try again, or email shepherd@acts2028sheepdogsociety.com." },
      { status: 500 }
    );
  }
}

function buildWelcomeEmail(name: string, intent: "join" | "start" | "just_keep_posted") {
  const first = name.trim().split(/\s+/)[0] ?? "brother";
  const intentLine =
    intent === "join"
      ? "A leader will reach out soon about a group."
      : intent === "start"
        ? "We will follow up about starting a group where you live."
        : "We will keep you in the loop with the weekly Letter.";
  return `${first},

A brother saved you a seat.

${intentLine}

You do not have to have it all together to sit at the table.

Acts 20:28
"Pay careful attention to yourselves and to all the flock, in which the Holy Spirit has made you overseers, to care for the church of God, which he obtained with his own blood."

— Sheepdog Society
acts2028sheepdogsociety.com

You signed up at /join. To stop these emails, reply UNSUBSCRIBE.`;
}

function buildAdminAlert(b: z.infer<typeof SignupBody>, id: string) {
  const lines = [
    `New signup landed.`,
    ``,
    `Name: ${b.name}`,
    `Email: ${b.email}`,
    b.phone ? `Phone: ${b.phone}` : null,
    `Intent: ${b.intent}`,
    b.groupId ? `Group ID: ${b.groupId}` : null,
    b.city ? `Location: ${b.city}, ${b.state ?? "?"} ${b.zip ?? ""}` : null,
    b.timeline ? `Timeline: ${b.timeline}` : null,
    `Notify: newsletter=${b.wantsNewsletter} events=${b.wantsEvents} sms=${b.wantsSms}`,
    `Source: ${b.source ?? "(direct)"}`,
    b.note ? `\nNote: ${b.note}` : null,
    ``,
    `Admin: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/members?focus=${id}`,
  ].filter(Boolean);
  return lines.join("\n");
}
