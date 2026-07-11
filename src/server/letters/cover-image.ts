import { put } from "@vercel/blob";

// Appended to every prompt sent to OpenAI, regardless of style. Keeps output
// safe, dignified, and free of stray text/watermarks for a Christian audience.
export const HARD_SUFFIX =
  ". Natural and candid, never staged or stock-photo. Reverent and dignified, suitable for a Christian audience. No crosses or religious iconography unless explicitly requested. No stereotypical imagery. No text, lettering, watermarks, or signatures anywhere in the image.";

// Re-exported so callers (e.g. the admin image-gen route) can validate an
// incoming `style` key without duplicating the fragment list.
export const STYLE_FRAGMENTS: Record<string, string> = {
  documentary: "Documentary photography, natural lighting, candid composition.",
  cinematic: "Cinematic golden-hour photography, shallow depth of field, warm tones.",
  engraving: "Black ink wood engraving, fine cross-hatching, classical biblical illustration, high contrast, no color.",
  oil: "Oil painting, painterly brushwork, muted earth tones.",
  editorial: "Modern editorial photography, clean composition, neutral palette.",
  topographic: "Vintage topographic map illustration, sepia line art, weathered paper texture.",
  broadsheet:
    "Editorial broadsheet documentary photograph, muted Pasture & Iron palette (bone, iron, brass, olive), natural morning light, honest working men's textures (timber, canvas, leather, field), no text, no faces in sharp focus, grain like a printed newspaper photo",
};

export interface GenerateCoverImageInput {
  prompt: string;
  style?: string;
  aspectRatio?: "landscape" | "portrait" | "square";
  quality?: "draft" | "final";
  folder?: string;
}

export interface GenerateCoverImageResult {
  url: string;
  pathname: string;
}

/**
 * Generates a cover image with OpenAI's gpt-image-1 and uploads it to Vercel
 * Blob. Never throws — returns null on any failure (missing API key, OpenAI
 * error, Blob error) and logs the cause via console.error. Callers are
 * responsible for their own auth/admin gating; this helper does none.
 */
export async function generateCoverImage(
  input: GenerateCoverImageInput
): Promise<GenerateCoverImageResult | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("generateCoverImage: OPENAI_API_KEY missing from server env.");
    return null;
  }

  const promptInput = input.prompt.trim();
  if (!promptInput) {
    console.error("generateCoverImage: empty prompt");
    return null;
  }

  const styleFragment = input.style ? STYLE_FRAGMENTS[input.style] ?? "" : "";
  const fullPrompt = `${promptInput}. ${styleFragment}${HARD_SUFFIX}`.replace(/\s+/g, " ").trim();

  const size =
    input.aspectRatio === "landscape"
      ? "1536x1024"
      : input.aspectRatio === "portrait"
      ? "1024x1536"
      : "1024x1024";
  const quality = input.quality === "final" ? "high" : "low";

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
    console.error("generateCoverImage: OpenAI fetch error:", err);
    return null;
  }

  if (!openaiRes.ok) {
    const text = await openaiRes.text().catch(() => "");
    console.error(`generateCoverImage: OpenAI error: ${text || openaiRes.statusText}`);
    return null;
  }

  const data = (await openaiRes.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const item = data.data?.[0];
  if (!item || (!item.b64_json && !item.url)) {
    console.error("generateCoverImage: OpenAI returned no image.");
    return null;
  }

  let buffer: ArrayBuffer;
  if (item.b64_json) {
    buffer = Buffer.from(item.b64_json, "base64").buffer as ArrayBuffer;
  } else if (item.url) {
    const r = await fetch(item.url);
    buffer = await r.arrayBuffer();
  } else {
    console.error("generateCoverImage: no image data");
    return null;
  }

  const folder = input.folder ?? "ai-images";
  const key = `${folder}/${Date.now()}.png`;
  try {
    const blob = await put(key, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/png",
    });
    return { url: blob.url, pathname: blob.pathname };
  } catch (err) {
    console.error("generateCoverImage: Blob upload failed:", err);
    return null;
  }
}
