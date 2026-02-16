import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url, username } =
      evt.data;

    const primaryEmail = email_addresses?.[0]?.email_address ?? "";

    // Auto-promote super admin
    const isSuperAdmin = primaryEmail === "beargodwin@gmail.com";

    await db.insert(users).values({
      id,
      email: primaryEmail,
      firstName: first_name ?? "",
      lastName: last_name ?? "",
      username: username ?? "",
      avatarUrl: image_url ?? "",
      role: isSuperAdmin ? "admin" : "member",
      status: isSuperAdmin ? "active" : "pending",
      approvedBy: isSuperAdmin ? "system" : undefined,
      approvedAt: isSuperAdmin ? new Date() : undefined,
    });
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url, username } =
      evt.data;

    const primaryEmail = email_addresses?.[0]?.email_address ?? "";

    await db
      .update(users)
      .set({
        email: primaryEmail,
        firstName: first_name ?? "",
        lastName: last_name ?? "",
        username: username ?? "",
        avatarUrl: image_url ?? "",
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      await db
        .update(users)
        .set({ status: "suspended", updatedAt: new Date() })
        .where(eq(users.id, id));
    }
  }

  return new Response("OK", { status: 200 });
}
