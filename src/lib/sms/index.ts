/**
 * SMS provider abstraction.
 *
 * Phase E wires Twilio behind the `SMS_ENABLED` feature flag. When the flag
 * is off (or any required env var is missing) `sendSms()` returns
 * `{ status: "not_configured" }` — callers MUST tolerate this gracefully.
 *
 * Required env when `SMS_ENABLED=true`:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_MESSAGING_SERVICE_SID  (created in step 4 of A2P_10DLC_CHECKLIST)
 *
 * Optional:
 *   TWILIO_WEBHOOK_SIGNING_SECRET (used by /api/webhooks/twilio/* to verify)
 */

import "server-only";
import twilio from "twilio";

export { SMS_OPT_IN_DISCLOSURE } from "./disclosure";

export type SmsCategory =
  | "welcome"           // After member signup confirms.
  | "double_opt_in"     // The first "Reply YES to confirm" send.
  | "event_reminder"    // 24h-before, 2h-before reminders.
  | "newsletter"        // Weekly Letter notification (optional).
  | "transactional";    // Anything else admin-initiated.

export type SmsResult =
  | { status: "sent"; sid: string }
  | { status: "queued"; reason: "quiet_hours" | "double_opt_in_pending" }
  | { status: "blocked"; reason: "unsubscribed" | "invalid_number" | "send_error"; error?: string }
  | { status: "not_configured"; reason: "missing_provider_credentials" };

export interface SendSmsInput {
  to: string;             // E.164 (e.g. "+14045551234")
  message: string;        // ≤ 160 chars where possible. Always include "Reply STOP".
  category: SmsCategory;
  /** Member id, if this send is tied to a specific row in `members`. */
  memberId?: string;
  /** Event id, if this send is an event reminder. */
  eventId?: string;
  /** Recipient timezone (IANA). If absent, quiet-hour gate uses Eastern. */
  timezone?: string;
}

/**
 * The single seam every server-side SMS-send should pass through.
 * Returns `not_configured` if the feature flag is off or creds are missing.
 * Callers MUST never throw on SMS failure — fall back to email or skip.
 */
export async function sendSms(input: SendSmsInput): Promise<SmsResult> {
  if (!isSmsEnabled()) {
    return { status: "not_configured", reason: "missing_provider_credentials" };
  }

  // Quiet-hour gate. Confirmation sends (double_opt_in) bypass the gate
  // because they're a direct user action.
  if (input.category !== "double_opt_in" && isInQuietHours(new Date(), input.timezone)) {
    return { status: "queued", reason: "quiet_hours" };
  }

  if (!isLikelyE164(input.to)) {
    return { status: "blocked", reason: "invalid_number" };
  }

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
    const result = await client.messages.create({
      to: input.to,
      body: input.message,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID!,
    });
    return { status: "sent", sid: result.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sms] send failed", { to: redactPhone(input.to), error: message });
    return { status: "blocked", reason: "send_error", error: message };
  }
}

/** Cheap feature-flag check. Twilio cred presence + explicit opt-in. */
export function isSmsEnabled(): boolean {
  return (
    process.env.SMS_ENABLED === "true" &&
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_MESSAGING_SERVICE_SID
  );
}

/**
 * Quiet hours per CANONICAL_PLAN: 9am–8pm Mon–Sat, noon–6pm Sun, recipient-local.
 * If timezone is unknown, defaults to America/New_York (the ministry's HQ).
 * Outside the window, callers receive `queued` and may retry later.
 */
export function isInQuietHours(now: Date, timezone?: string): boolean {
  const tz = timezone ?? "America/New_York";
  // Use Intl to get the recipient's local hour + day-of-week.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    weekday: "short",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "12", 10);
  const day = parts.find((p) => p.type === "weekday")?.value ?? "Mon";

  if (day === "Sun") {
    // Sunday: noon–6pm only.
    return !(hour >= 12 && hour < 18);
  }
  // Mon–Sat: 9am–8pm.
  return !(hour >= 9 && hour < 20);
}

function isLikelyE164(s: string): boolean {
  return /^\+[1-9]\d{7,15}$/.test(s.trim());
}

function redactPhone(s: string): string {
  if (s.length < 6) return "***";
  return `${s.slice(0, 3)}***${s.slice(-2)}`;
}

/**
 * STOP keywords that map to unsubscribe. Twilio handles these automatically
 * inside the Messaging Service, but we mirror inbound STOPs into our DB via
 * `/api/webhooks/twilio/inbound` so admins see who opted out and when.
 */
export const STOP_KEYWORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
export const HELP_KEYWORDS = ["HELP", "INFO"];
export const CONFIRM_KEYWORDS = ["YES", "Y", "CONFIRM"];

export const HELP_RESPONSE_TEXT = `Acts 2:28 Sheepdog Society — for support, email hello@acts2028sheepdogsociety.com. Msg & data rates may apply. Reply STOP to unsubscribe.`;
