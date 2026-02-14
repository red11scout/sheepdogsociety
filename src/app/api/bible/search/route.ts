import { auth } from "@clerk/nextjs/server";
import { searchBible, type BibleTranslation } from "@/lib/bible";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q");
  const translation =
    (req.nextUrl.searchParams.get("translation") as BibleTranslation) ?? "ESV";

  if (!query) {
    return Response.json({ error: "Missing q parameter" }, { status: 400 });
  }

  try {
    const results = await searchBible(query, translation);
    return Response.json(results);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Search failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
