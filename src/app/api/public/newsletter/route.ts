import { NextResponse } from "next/server";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { z } from "zod/v4";
import { resend } from "@/lib/email";

const schema = z.object({
  email: z.email(),
  firstName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { email, firstName } = parsed.data;

    // Our table is the source of truth for the admin list/export.
    // onConflictDoUpdate (not DoNothing) so someone who previously
    // unsubscribed and resubmits the form is actually reactivated,
    // instead of the insert silently no-oping and leaving them locked out.
    await db
      .insert(newsletterSubscribers)
      .values({ email, firstName: firstName ?? "" })
      .onConflictDoUpdate({
        target: newsletterSubscribers.email,
        set: { isActive: true },
      });

    // Sync to the Resend Audience the weekly Letter broadcast actually
    // sends to (broadcastEncouragement targets RESEND_AUDIENCE_ID).
    // Non-blocking: our table above already has the subscriber, so a
    // Resend hiccup here must not fail the signup response.
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (audienceId) {
      try {
        const { error } = await resend().contacts.create({
          audienceId,
          email,
          firstName: firstName || undefined,
          unsubscribed: false,
        });
        if (error) console.error("resend contact create rejected", error);
      } catch (err) {
        console.error("resend contact sync failed", err);
      }
    } else {
      console.error(
        "RESEND_AUDIENCE_ID not set; skipped audience sync for",
        email
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
