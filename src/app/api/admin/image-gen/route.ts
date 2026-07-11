import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateCoverImage, STYLE_FRAGMENTS, HARD_SUFFIX } from "@/server/letters/cover-image";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY missing from server env." },
      { status: 500 }
    );
  }

  const body = (await req.json()) as {
    prompt?: string;
    style?: string;
    aspectRatio?: "square" | "landscape" | "portrait";
    quality?: "draft" | "final";
    folder?: string;
    save?: boolean;
  };

  const promptInput = body.prompt?.trim();
  if (!promptInput) {
    return NextResponse.json({ error: "Empty prompt" }, { status: 400 });
  }

  const styleFragment = body.style ? STYLE_FRAGMENTS[body.style] ?? "" : "";
  const fullPrompt = `${promptInput}. ${styleFragment}${HARD_SUFFIX}`.replace(/\s+/g, " ").trim();

  // If save=true (default), delegate generation + Blob upload to the shared
  // helper and return the permanent URL.
  if (body.save !== false) {
    const result = await generateCoverImage({
      prompt: promptInput,
      style: body.style,
      aspectRatio: body.aspectRatio,
      quality: body.quality,
      folder: body.folder,
    });
    if (!result) {
      return NextResponse.json(
        { error: "Image generation failed." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      url: result.url,
      pathname: result.pathname,
      prompt: fullPrompt,
    });
  }

  // Otherwise return base64 inline (preview mode). Kept here rather than in
  // the helper because generateCoverImage always uploads to Blob, and
  // preview mode must not write to Blob — this replicates the pre-refactor
  // OpenAI-only call so the no-save response stays byte-identical.
  const size =
    body.aspectRatio === "landscape"
      ? "1536x1024"
      : body.aspectRatio === "portrait"
      ? "1024x1536"
      : "1024x1024";
  const quality = body.quality === "final" ? "high" : "low";

  let openaiRes: Response;
  try {
    openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: fullPrompt,
        size,
        quality,
        n: 1,
      }),
    });
  } catch (err) {
    console.error("OpenAI fetch error:", err);
    return NextResponse.json(
      { error: "Could not reach OpenAI." },
      { status: 502 }
    );
  }

  if (!openaiRes.ok) {
    const text = await openaiRes.text().catch(() => "");
    return NextResponse.json(
      { error: `OpenAI error: ${text || openaiRes.statusText}` },
      { status: openaiRes.status }
    );
  }

  const data = (await openaiRes.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const item = data.data?.[0];
  if (!item || (!item.b64_json && !item.url)) {
    return NextResponse.json(
      { error: "OpenAI returned no image." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    base64: item.b64_json,
    url: item.url,
    prompt: fullPrompt,
  });
}
