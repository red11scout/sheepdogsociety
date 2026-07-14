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
