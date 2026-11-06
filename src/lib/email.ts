import { Resend } from "resend";

let _client: Resend | null = null;

export function resend(): Resend {
  if (!_client) {
    const key = process.env.RESEND_API_KEY ?? process.env.AUTH_RESEND_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY (or AUTH_RESEND_KEY) is not set");
    }
    _client = new Resend(key);
  }
  return _client;
}

export const FROM_AUTH =
  process.env.RESEND_FROM_AUTH ?? "auth@acts2028sheepdogsociety.com";
export const FROM_NEWSLETTER =
  process.env.RESEND_FROM_NEWSLETTER ??
  "letter@acts2028sheepdogsociety.com";
export const FROM_TRANSACTIONAL =
  process.env.RESEND_FROM_TRANSACTIONAL ??
  "notifications@acts2028sheepdogsociety.com";

/**
 * The shepherd inbox. Every public lead-capture form notifies this address
 * on submit, and every auto-reply is sent FROM it, so a man's follow-up
 * details land straight with Jeremy (shepherd@ forwards to his inbox).
 * Single source of truth — do not re-hardcode the address in handlers.
 */
export const SHEPHERD_EMAIL =
  process.env.SHEPHERD_EMAIL ?? "shepherd@acts2028sheepdogsociety.com";
export const FROM_SHEPHERD = `Sheepdog Society <${SHEPHERD_EMAIL}>`;

/**
 * Recipients for every "a man wrote in" notification: shepherd@ plus any
 * extra addresses in NOTIFY_EMAILS (comma-separated). The shepherd@
 * mailbox sits behind GoDaddy Advanced Email Security, which has
 * quarantined site notifications before; a copy to an inbox outside that
 * filter means a message is never silently lost. De-duplicated,
 * case-insensitive, so listing shepherd@ again is harmless.
 */
export function notifyRecipients(): string[] {
  const extras = (process.env.NOTIFY_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
  const seen = new Set<string>();
  return [SHEPHERD_EMAIL, ...extras].filter((e) => {
    const key = e.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
