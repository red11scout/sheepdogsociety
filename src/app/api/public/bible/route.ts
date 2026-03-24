import { NextResponse } from "next/server";
import { getPassage } from "@/lib/bible";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const translation = searchParams.get("translation") ?? "ESV";

  if (!ref) {
    return NextResponse.json({ error: "ref is required" }, { status: 400 });
  }

  try {
    const result = await getPassage(ref, translation);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Bible API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch passage", detail: String(error) },
      { status: 500 }
    );
  }
}
