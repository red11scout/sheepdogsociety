import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Twilio delivery-status callback. Phase E currently ACKs every event so
 * Twilio stops retrying. A future migration adds an `sms_messages` log table
 * for per-send analytics (delivered_at, failed_at, error_code).
 *
 * Configured under Messaging Service → Status callback URL.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const sid = String(form.get("MessageSid") ?? "");
    const status = String(form.get("MessageStatus") ?? "");
    const errorCode = form.get("ErrorCode");
    if (sid && status) {
      console.log(
        `[twilio status] ${sid} → ${status}${errorCode ? ` (error ${errorCode})` : ""}`
      );
    }
  } catch (err) {
    console.error("[twilio status] parse failed", err);
  }
  // Always 200 — Twilio retries non-2xx and we don't want a backlog.
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST only — Twilio status callback." });
}
