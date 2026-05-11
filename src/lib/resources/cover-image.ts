/**
 * Generate an AI cover image for a resource and save it to Vercel Blob.
 *
 * Uses OpenAI gpt-image-1. Prompt is built from the resource title +
 * summary + section context, with a hard suffix that enforces the
 * Sheepdog Society visual style (reverent, dignified, no cheesy
 * Christian iconography, no text). Saved to `resources/covers/<id>.png`
 * on Blob and the URL returned.
 *
 * Quality default is "low" — good enough for a card thumbnail and 4-5x
 * cheaper than "high". Bump to "high" for hero placements.
 */
import { put } from "@vercel/blob";

const HARD_SUFFIX =
  ". Reverent and dignified, suitable for a Christian men's ministry. Editorial photography or fine-art illustration, never stock-photo or staged. No crosses or stained glass unless explicitly requested. No text, lettering, watermarks, signatures, or logos anywhere in the image. Composition leaves room for a card title overlay below.";

const STYLE_DEFAULT =
  "Documentary photography, golden-hour natural lighting, shallow depth of field, warm earth-tone palette (sepia, brass, deep navy).";

export interface BuildPromptInput {
  title: string;
  summary?: string | null;
  sectionName?: string | null;
  cluster?: string | null;
}

export function buildCoverPrompt({
  title,
  summary,
  sectionName,
  cluster,
}: BuildPromptInput): string {
  // Strip leading "Men's Bible Study:" / "Bible Study:" boilerplate so
  // the image generator focuses on the actual subject.
  const cleanTitle = title
    .replace(/^["']?(?:men[''']s\s+)?bible\s+study\s*[:\-—]?\s*/i, "")
    .replace(/^["']?bible\s+study\s+for\s+men[''']?s\s+group\s*[:\-—]?\s*/i, "")
    .replace(/[""']/g, "")
    .trim();

  const subject = cleanTitle || title;
  const ctx = [sectionName, cluster].filter(Boolean).join(" — ");
  const summaryFragment = summary
    ? ` The piece explores ${summary.slice(0, 220).trim()}`
    : "";

  return [
    `A cover image for "${subject}"${ctx ? ` (${ctx})` : ""}.`,
    summaryFragment,
    STYLE_DEFAULT,
    HARD_SUFFIX,
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface GenerateCoverOptions {
  resourceId: string;
  prompt: string;
  /** "low" = ~$0.011/img, "high" = ~$0.04/img. Default low. */
  quality?: "low" | "high";
  /** "landscape" (1536x1024) is the default — matches the 4:3 card aspect. */
  size?: "landscape" | "portrait" | "square";
}

export interface GenerateCoverResult {
  url: string;
  prompt: string;
}

export async function generateCoverImage(
  opts: GenerateCoverOptions
): Promise<GenerateCoverResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY missing from server env.");
  }

  const size =
    opts.size === "portrait"
      ? "1024x1536"
      : opts.size === "square"
      ? "1024x1024"
      : "1536x1024";

  const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: opts.prompt,
      size,
      quality: opts.quality ?? "low",
      n: 1,
    }),
  });

  if (!openaiRes.ok) {
    const text = await openaiRes.text().catch(() => "");
    throw new Error(`OpenAI: ${text || openaiRes.statusText}`);
  }

  const data = (await openaiRes.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const item = data.data?.[0];
  if (!item || (!item.b64_json && !item.url)) {
    throw new Error("OpenAI returned no image data.");
  }

  let buffer: ArrayBuffer;
  if (item.b64_json) {
    buffer = Buffer.from(item.b64_json, "base64").buffer as ArrayBuffer;
  } else {
    const r = await fetch(item.url!);
    buffer = await r.arrayBuffer();
  }

  // Stable per-resource path so re-generating overwrites cleanly.
  // (Vercel Blob de-duplicates by path; addRandomSuffix:false keeps it
  // predictable.)
  const key = `resources/covers/${opts.resourceId}-${Date.now()}.png`;
  const blob = await put(key, buffer, {
    access: "public",
    addRandomSuffix: false,
    contentType: "image/png",
  });

  return { url: blob.url, prompt: opts.prompt };
}
