import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { geocodeAddress } from "@/lib/geocoding";

export const runtime = "nodejs";
export const maxDuration = 15;

const bodySchema = z.object({
  address: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  zipCode: z.string().max(20).optional(),
  countryCode: z.string().max(8).optional(),
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
    const r = await geocodeAddress(body);
    if (!r) {
      return NextResponse.json(
        { found: false, reason: "Mapbox returned no match for that address" },
        { status: 200 }
      );
    }
    return NextResponse.json({ found: true, ...r });
  } catch (err) {
    return NextResponse.json(
      { error: "Geocode failed", detail: err instanceof Error ? err.message.slice(0, 300) : "" },
      { status: 502 }
    );
  }
}
