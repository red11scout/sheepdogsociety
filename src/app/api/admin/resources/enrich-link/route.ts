import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { enrichLink } from "@/lib/resources/enrich";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  url: z.string().min(4).max(2000),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Bad request", detail: err instanceof Error ? err.message : "" },
      { status: 400 }
    );
  }

  try {
    const enriched = await enrichLink(body.url);
    return NextResponse.json({ enriched });
  } catch (err) {
    console.error("enrich-link failed:", err);
    return NextResponse.json(
      {
        error: "Enrichment failed",
        detail:
          err instanceof Error ? err.message.slice(0, 300) : "unknown",
      },
      { status: 502 }
    );
  }
}
