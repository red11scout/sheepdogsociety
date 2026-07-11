import { put } from "@vercel/blob";

// Appended to every prompt sent to OpenAI, regardless of style. Keeps output
// safe, dignified, and free of stray text/watermarks for a Christian audience.
const HARD_SUFFIX =
  ". Natural and candid, never staged or stock-photo. Reverent and dignified, suitable for a Christian audience. No crosses or religious iconography unless explicitly requested. No stereotypical imagery. No text, lettering, watermarks, or signatures anywhere in the image.";

// Style fragments keyed by the `style` input; an unknown or missing style
// contributes no fragment. Module-private: composeImagePrompt is the only
// consumer, and callers pass style keys as plain strings.
const STYLE_FRAGMENTS: Record<string, string> = {
  documentary: "Documentary photography, natural lighting, candid composition.",
  cinematic: "Cinematic golden-hour photography, shallow depth of field, warm tones.",
  engraving: "Black ink wood engraving, fine cross-hatching, classical biblical illustration, high contrast, no color.",
  oil: "Oil painting, painterly brushwork, muted earth tones.",
  editorial: "Modern editorial photography, clean composition, neutral palette.",
  topographic: "Vintage topographic map illustration, sepia line art, weathered paper texture.",
  broadsheet:
    "Editorial broadsheet documentary photograph, muted Pasture & Iron palette (bone, iron, brass, olive), natural morning light, honest working men's textures (timber, canvas, leather, field), no text, no faces in sharp focus, grain like a printed newspaper photo",
};

/**
 * Builds the final prompt string sent to OpenAI: base prompt + style
 * fragment + HARD_SUFFIX, whitespace-collapsed. Shared by generateCoverImage
 * and the admin image-gen route's no-save (preview) branch so the formula
 * lives in exactly one place.
 */
export function composeImagePrompt(prompt: string, style?: string): string {
  const styleFragment = style ? STYLE_FRAGMENTS[style] ?? "" : "";
  return `${prompt}. ${styleFragment}${HARD_SUFFIX}`.replace(/\s+/g, " ").trim();
}

export interface GenerateCoverImageInput {
  prompt: string;
  style?: string;
  aspectRatio?: "landscape" | "portrait" | "square";
  quality?: "draft" | "final";
  folder?: string;
}

// Discriminated result so callers can surface WHY generation failed instead
// of a single generic error. `reason` is a short human string suitable for
// direct admin display (see each failure site below for the exact wording).
export type GenerateCoverImageResult =
  | { ok: true; url: string; pathname: string }
  | { ok: false; reason: string };

/**
 * Generates a cover image with OpenAI's gpt-image-1 and uploads it to Vercel
 * Blob. Never throws — returns { ok: false, reason } on any failure (missing
 * API key, OpenAI error, Blob error) and logs the cause via console.error.
 * Callers are responsible for their own auth/admin gating; this helper does
 * none.
 */
export async function generateCoverImage(
  input: GenerateCoverImageInput
): Promise<GenerateCoverImageResult> {
  if (!process.env.OPENAI_API_KEY) {
    const reason = "OPENAI_API_KEY missing from server env.";
    console.error(`generateCoverImage: ${reason}`);
    return { ok: false, reason };
  }

  const promptInput = input.prompt.trim();
  if (!promptInput) {
    const reason = "Empty prompt.";
    console.error(`generateCoverImage: ${reason}`);
    return { ok: false, reason };
  }

  const fullPrompt = composeImagePrompt(promptInput, input.style);

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
    const reason = `OpenAI error: ${err instanceof Error ? err.message : "could not reach OpenAI."}`;
    return { ok: false, reason };
  }

  if (!openaiRes.ok) {
    const text = await openaiRes.text().catch(() => "");
    const reason = `OpenAI error: ${text || openaiRes.statusText}`;
    console.error(`generateCoverImage: ${reason}`);
    return { ok: false, reason };
  }

  // Response parsing and the url-branch download can both throw (bad
  // JSON, network drop mid-body); the "never throws" contract means they
  // must resolve to a failure result like every other failure path.
  let buffer: ArrayBuffer;
  try {
    const data = (await openaiRes.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const item = data.data?.[0];
    if (!item || (!item.b64_json && !item.url)) {
      const reason = "OpenAI returned no image.";
      console.error(`generateCoverImage: ${reason}`);
      return { ok: false, reason };
    }

    if (item.b64_json) {
      buffer = Buffer.from(item.b64_json, "base64").buffer as ArrayBuffer;
    } else if (item.url) {
      const r = await fetch(item.url);
      if (!r.ok) {
        const reason = `OpenAI error: image download failed (${r.statusText}).`;
        console.error(`generateCoverImage: ${reason}`);
        return { ok: false, reason };
      }
      buffer = await r.arrayBuffer();
    } else {
      const reason = "OpenAI returned no image.";
      console.error(`generateCoverImage: ${reason}`);
      return { ok: false, reason };
    }
  } catch (err) {
    console.error("generateCoverImage: failed to read OpenAI response:", err);
    const reason = `OpenAI error: ${err instanceof Error ? err.message : "failed to read response."}`;
    return { ok: false, reason };
  }

  const folder = input.folder ?? "ai-images";
  const key = `${folder}/${Date.now()}.png`;
  try {
    const blob = await put(key, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/png",
    });
    return { ok: true, url: blob.url, pathname: blob.pathname };
  } catch (err) {
    console.error("generateCoverImage: Blob upload failed:", err);
    return { ok: false, reason: "Saved to OpenAI but Blob upload failed." };
  }
}
