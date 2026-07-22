import { db } from "@/db";
import { members } from "@/db/schema-members";
import { eq } from "drizzle-orm";
import { verifyUnsubscribeToken } from "@/lib/announcements/helpers";
import { syncMemberToAudience } from "@/lib/resend-audience";

export const runtime = "nodejs";

/**
 * One-click unsubscribe target embedded in every announcement email:
 * /api/public/unsubscribe?m=<memberId>&t=<hmac>. Stateless token — see
 * src/lib/announcements/helpers.ts. Flips members.subscribed off and
 * mirrors the change into the Resend Audience so the weekly letter stops
 * too. GET on purpose: it has to work from a bare click in any mail app.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const memberId = url.searchParams.get("m") ?? "";
  const token = url.searchParams.get("t") ?? "";

  if (!verifyUnsubscribeToken(memberId, token)) {
    return page(
      "That link did not check out.",
      "The unsubscribe link looks incomplete or expired. Reply to any of our emails and we will take you off the list by hand.",
      400
    );
  }

  const [row] = await db
    .update(members)
    .set({ subscribed: false, updatedAt: new Date() })
    .where(eq(members.id, memberId))
    .returning({ email: members.email });

  if (!row) {
    return page(
      "That link did not check out.",
      "We could not find that subscription. Reply to any of our emails and we will take you off the list by hand.",
      404
    );
  }

  await syncMemberToAudience(row.email, false);

  return page(
    "You are unsubscribed.",
    "You will not get further emails from us. If you change your mind, sign up again at acts2028sheepdogsociety.com/join — or just reply and say so."
  );
}

function page(heading: string, bodyText: string, status = 200) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${heading} · Sheepdog Society</title>
</head>
<body style="margin:0;background:#F2EBDD;color:#1F2A2E;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:560px;margin:0 auto;padding:64px 24px;">
<p style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#C8932A;margin:0 0 12px;">&sect; Sheepdog Society</p>
<h1 style="font-size:32px;line-height:1.15;margin:0 0 16px;">${heading}</h1>
<p style="font-size:17px;line-height:1.7;margin:0 0 32px;">${bodyText}</p>
<p style="font-size:13px;color:#7a7a7a;margin:0;">Acts 20:28 &middot; <a href="https://www.acts2028sheepdogsociety.com" style="color:#7a7a7a;">acts2028sheepdogsociety.com</a></p>
</div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
