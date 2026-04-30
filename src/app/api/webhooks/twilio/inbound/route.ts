import { NextResponse } from "next/server";
import twilio from "twilio";
import { db } from "@/db";
import { members, memberNotificationPrefs } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  STOP_KEYWORDS,
  HELP_KEYWORDS,
  CONFIRM_KEYWORDS,
  HELP_RESPONSE_TEXT,
} from "@/lib/sms";

export const runtime = "nodejs";

/**
 * Twilio inbound webhook. Handles STOP / HELP / YES keywords.
 *
 * Twilio's Messaging Service auto-replies to STOP/HELP at the carrier level,
 * but we ALSO mirror STOPs into our DB so admins see who opted out and when.
 * YES (case-insensitive) flips `sms_double_opt_in_at` on, completing the
 * double-opt-in handshake.
 *
 * Returns TwiML — empty `<Response/>` means "no auto-reply", otherwise we
 * include `<Message>` to send back.
 */
export async function POST(req: Request) {
  // Verify the request actually came from Twilio.
  if (!verifyTwilioSignature(req, await peekFormData(req))) {
    return new Response("Forbidden", { status: 403 });
  }

  // Re-parse — verifyTwilioSignature consumed the original body.
  const form = await req.formData();
  const from = String(form.get("From") ?? "").trim();
  const body = String(form.get("Body") ?? "")
    .trim()
    .toUpperCase();

  if (!from) {
    return new Response(twiml(), { headers: { "Content-Type": "text/xml" } });
  }

  // Locate the member by phone (best-effort; multiple members could share a phone).
  const matches = await db
    .select({
      memberId: members.id,
      prefId: memberNotificationPrefs.id,
    })
    .from(members)
    .leftJoin(
      memberNotificationPrefs,
      eq(memberNotificationPrefs.memberId, members.id)
    )
    .where(eq(members.phone, from));

  // STOP — flip wantsSms off across all matching members. Twilio auto-replies.
  if (STOP_KEYWORDS.includes(body)) {
    for (const m of matches) {
      if (m.prefId) {
        await db
          .update(memberNotificationPrefs)
          .set({ wantsSms: false, updatedAt: new Date() })
          .where(eq(memberNotificationPrefs.id, m.prefId));
      }
    }
    return new Response(twiml(), { headers: { "Content-Type": "text/xml" } });
  }

  // HELP — return ministry-specific text.
  if (HELP_KEYWORDS.includes(body)) {
    return new Response(twiml(HELP_RESPONSE_TEXT), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // YES — complete the double-opt-in.
  if (CONFIRM_KEYWORDS.includes(body)) {
    for (const m of matches) {
      if (m.prefId) {
        await db
          .update(memberNotificationPrefs)
          .set({ smsDoubleOptInAt: new Date(), updatedAt: new Date() })
          .where(eq(memberNotificationPrefs.id, m.prefId));
      }
    }
    return new Response(
      twiml(
        "Confirmed. You will get event reminders. Reply STOP to opt out, HELP for help."
      ),
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  // Unknown inbound — no auto-reply.
  return new Response(twiml(), { headers: { "Content-Type": "text/xml" } });
}

/**
 * Twilio sends webhooks as application/x-www-form-urlencoded with an
 * `X-Twilio-Signature` header that we verify using the auth token + URL.
 * In dev (no signing secret) we accept all requests.
 */
async function peekFormData(req: Request): Promise<Record<string, string>> {
  const cloned = req.clone();
  const text = await cloned.text();
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

function verifyTwilioSignature(
  req: Request,
  params: Record<string, string>
): boolean {
  const secret = process.env.TWILIO_AUTH_TOKEN;
  if (!secret) return true; // Dev: accept all.
  const signature = req.headers.get("x-twilio-signature");
  if (!signature) return false;
  // Twilio expects the full public URL the webhook was POSTed to.
  const url =
    req.headers.get("x-forwarded-proto") &&
    req.headers.get("x-forwarded-host")
      ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}${new URL(req.url).pathname}`
      : req.url;
  return twilio.validateRequest(secret, signature, url, params);
}

function twiml(message?: string): string {
  if (!message) return `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  // Escape minimal XML special chars.
  const safe = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`;
}

// Allow Twilio's GET probes during webhook configuration testing.
export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST only — Twilio inbound webhook." });
}
