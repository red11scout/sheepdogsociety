import "server-only";
import { resend } from "@/lib/email";

/**
 * Mirror a member's `subscribed` checkbox into the Resend Audience that the
 * weekly-letter broadcast targets (RESEND_AUDIENCE_ID). Best-effort by
 * design: callers have already made the DB write durable, and a Resend
 * hiccup must never block an admin toggle or a /join signup.
 *
 * Resend's contacts.create rejects duplicates, so we create first (covers
 * the brand-new case) and then update by email (covers the existing case
 * and flips the unsubscribed flag either way).
 */
export async function syncMemberToAudience(
  email: string | null | undefined,
  subscribed: boolean
): Promise<void> {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const trimmed = email?.trim();
  if (!audienceId || !trimmed) return;

  try {
    await resend().contacts.create({
      audienceId,
      email: trimmed,
      unsubscribed: !subscribed,
    });
  } catch (err) {
    // Duplicate contact is the normal case for an existing member.
    console.warn("resend audience create skipped:", err);
  }
  try {
    await resend().contacts.update({
      audienceId,
      email: trimmed,
      unsubscribed: !subscribed,
    });
  } catch (err) {
    console.warn("resend audience update failed:", err);
  }
}
