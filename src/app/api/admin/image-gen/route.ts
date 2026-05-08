import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60;

const HARD_SUFFIX =
  ". Natural and candid, never staged or stock-photo. Reverent and dignified, suitable for a Christian audience. No crosses or religious iconography unless explicitly requested. No stereotypical imagery. No text, lettering, watermarks, or signatures anywhere in the image.";

const STYLE_FRAGMENTS: Record<string, string> = {
  documentary: "Documentary photography, natural lighting, candid composition.",
  cinematic: "Cinematic golden-hour photography, shallow depth of field, warm tones.",
  engraving: "Black ink wood engraving, fine cross-hatching, classical biblical illustration, high contrast, no color.",
  oil: "Oil painting, painterly brushwork, muted earth tones.",
  editorial: "Modern editorial photography, clean composition, neutral palette.",
  topographic: "Vintage topographic map illustration, sepia line art, weathered paper texture.",
};

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

  // If save=true, upload to Blob and return permanent URL.
  if (body.save !== false) {
    let buffer: ArrayBuffer;
    if (item.b64_json) {
      buffer = Buffer.from(item.b64_json, "base64").buffer as ArrayBuffer;
    } else if (item.url) {
      const r = await fetch(item.url);
      buffer = await r.arrayBuffer();
    } else {
      return NextResponse.json({ error: "No image data" }, { status: 502 });
    }
    const folder = body.folder ?? "ai-images";
    const key = `${folder}/${Date.now()}.png`;
    try {
      const blob = await put(key, buffer, {
        access: "public",
        addRandomSuffix: false,
        contentType: "image/png",
      });
      return NextResponse.json({
        url: blob.url,
        pathname: blob.pathname,
        prompt: fullPrompt,
      });
    } catch (err) {
      console.error("Blob upload (gen) failed:", err);
      return NextResponse.json(
        { error: "Saved to OpenAI but Blob upload failed." },
        { status: 500 }
      );
    }
  }

  // Otherwise return base64 inline (preview mode)
  return NextResponse.json({
    base64: item.b64_json,
    url: item.url,
    prompt: fullPrompt,
  });
}
