import { NextRequest, NextResponse } from "next/server";
import { draftMode } from "next/headers";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Toggles Next's draftMode cookie so the draft branches in
// getStudioConfig()/getSiteTextMap() take over for this admin's browser.
// GET (no query): enable + send them to the live homepage to preview.
// GET ?off=1: disable + send them back to the studio editor.
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const off = req.nextUrl.searchParams.get("off");
  const dm = await draftMode();
  if (off) {
    dm.disable();
  } else {
    dm.enable();
  }

  return NextResponse.redirect(new URL(off ? "/admin/studio" : "/", req.url));
}
