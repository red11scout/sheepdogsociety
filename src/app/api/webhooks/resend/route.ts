import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { eq } from "drizzle-orm";

// Resend webhook for delivery events.
// Subscribers state mirror: marks rows inactive on bounce/complaint/unsubscribe.
// Resend is the source of truth; this just keeps the local table in sync so
// the admin subscribers list shows accurate counts.

interface ResendWebhookPayload {
  type: string;
  data?: {
    email?: string;
    to?: string | string[];
  };
}

function extractEmail(data: ResendWebhookPayload["data"]): string | null {
  if (!data) return null;
  if (data.email) return data.email.toLowerCase();
  if (typeof data.to === "string") return data.to.toLowerCase();
  if (Array.isArray(data.to) && data.to[0]) return data.to[0].toLowerCase();
  return null;
}

export async function POST(req: Request) {
  // Resend signs webhooks with a secret; verification deferred until we
  // configure RESEND_WEBHOOK_SECRET in env. For now accept and process so
  // local sync works in dev/preview. Add svix verification in Phase G.
  let payload: ResendWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const email = extractEmail(payload.data);
  if (!email) {
    return new Response("ok", { status: 200 });
  }

  // Events Resend emits: email.sent, email.delivered, email.bounced,
  // email.complained, email.opened, contact.unsubscribed, contact.subscribed.
  switch (payload.type) {
    case "email.bounced":
    case "email.complained":
    case "contact.unsubscribed":
      try {
        await db
          .update(newsletterSubscribers)
          .set({ isActive: false })
          .where(eq(newsletterSubscribers.email, email));
      } catch (err) {
        console.error("subscriber sync failed", err);
      }
      break;
    case "contact.subscribed":
      try {
        await db
          .update(newsletterSubscribers)
          .set({ isActive: true })
          .where(eq(newsletterSubscribers.email, email));
      } catch (err) {
        console.error("subscriber sync failed", err);
      }
      break;
    default:
      // ignore everything else
      break;
  }

  return new Response("ok", { status: 200 });
}
