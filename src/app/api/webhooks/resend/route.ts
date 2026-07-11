import { Webhook } from "svix";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { eq } from "drizzle-orm";

// Resend webhook for delivery events.
// Subscribers state mirror: marks rows inactive on bounce/complaint/unsubscribe.
// Resend is the source of truth; this just keeps the local table in sync so
// the admin subscribers list shows accurate counts.
//
// Security: Resend signs webhooks with svix. We verify the signature against
// RESEND_WEBHOOK_SECRET before trusting the payload — without this, anyone
// could forge bounce/unsubscribe events keyed on a victim's email to toggle
// their subscription. In production the secret is REQUIRED (fail closed); in
// dev/preview, where the secret is often unset, we process unverified so local
// sync keeps working.

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

function isProduction(): boolean {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const raw = await req.text();

  let payload: ResendWebhookPayload;
  if (secret) {
    const headers = {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    };
    try {
      payload = new Webhook(secret).verify(raw, headers) as ResendWebhookPayload;
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }
  } else {
    // No secret configured. Reject in production (fail closed); tolerate in
    // dev/preview so local delivery-event sync still works.
    if (isProduction()) {
      console.error("RESEND_WEBHOOK_SECRET not set; rejecting webhook in production");
      return new Response("Webhook not configured", { status: 401 });
    }
    try {
      payload = JSON.parse(raw) as ResendWebhookPayload;
    } catch {
      return new Response("Bad request", { status: 400 });
    }
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
