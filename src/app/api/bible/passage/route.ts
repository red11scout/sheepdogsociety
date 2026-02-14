import { auth } from "@clerk/nextjs/server";
import { getPassage, type BibleTranslation } from "@/lib/bible";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reference = req.nextUrl.searchParams.get("ref");
  const translation =
    (req.nextUrl.searchParams.get("translation") as BibleTranslation) ?? "ESV";

  if (!reference) {
    return Response.json({ error: "Missing ref parameter" }, { status: 400 });
  }

  try {
    const passage = await getPassage(reference, translation);
    return Response.json(passage);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch passage";
    return Response.json({ error: message }, { status: 500 });
  }
}
