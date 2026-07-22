import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless per-member unsubscribe token: HMAC-SHA256 of the member id,
 * keyed by AUTH_SECRET. No column, no backfill — works for every member,
 * including admin-created rows that never got a prefs row. Embedded in
 * announcement emails as /api/public/unsubscribe?m=<id>&t=<token>.
 */
export function unsubscribeToken(memberId: string, secret?: string): string {
  const key = secret ?? process.env.AUTH_SECRET;
  if (!key) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", key).update(`unsub:${memberId}`).digest("hex");
}

export function verifyUnsubscribeToken(
  memberId: string,
  token: string,
  secret?: string
): boolean {
  if (!memberId || !token) return false;
  let expected: string;
  try {
    expected = unsubscribeToken(memberId, secret);
  } catch {
    return false;
  }
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(token, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface Recipient {
  memberId: string;
  email: string;
  firstName: string | null;
}

/** Case-insensitive dedupe by email; first occurrence wins. */
export function dedupeRecipients(rows: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const r of rows) {
    const key = r.email.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...r, email: r.email.trim() });
  }
  return out;
}

/** Resend's batch endpoint takes at most 100 emails per call. */
export function chunk<T>(items: T[], size = 100): T[][] {
  if (size < 1) throw new Error("chunk size must be >= 1");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
