import { auth } from "@/auth";
import { db } from "@/db";
import { aiGenerations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { BRAND_VOICE, MODELS, withBrandVoice } from "@/lib/ai/prompts";

export const maxDuration = 60;

const MODEL = MODELS.default;
const PROMPT_VERSION = "improve.v2";

const ACTION_INSTRUCTIONS: Record<string, string> = {
  rephrase:
    "Rewrite this passage in the brand voice. Keep meaning. Cut filler. Same length or slightly shorter.",
  shorten:
    "Tighten this passage to roughly half its length without losing the central point. Use shorter sentences and stronger verbs.",
  expand:
    "Expand this passage by ~50%. Add a concrete image, an example, or a rhetorical move that lands the point. No filler.",
  "fix-grammar":
    "Fix grammar, punctuation, and obvious typos. Keep the voice. Do not rephrase.",
  pastoralize:
    "Rewrite to sound more pastoral — gentler, more inviting, less commanding. Same content.",
  "sharpen-verbs":
    "Replace every weak or generic verb with a stronger, more concrete one. Keep meaning, length, and structure. The result should read 10–20% punchier without changing what the passage says.",
};

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const body = (await req.json()) as { action?: string; text?: string };
  const action = body.action;
  const text = body.text?.trim();
  if (!action || !text || !ACTION_INSTRUCTIONS[action]) {
    return new Response("Bad request", { status: 400 });
  }
  const instruction = ACTION_INSTRUCTIONS[action];

  const userPrompt = withBrandVoice(`${instruction}

Original text:
"""
${text}
"""`);

  const result = streamText({
    model: anthropic(MODEL),
    system: BRAND_VOICE,
    prompt: userPrompt,
    onFinish: async ({ text: output, usage }) => {
      try {
        await db.insert(aiGenerations).values({
          type: "improve",
          prompt: userPrompt,
          promptVersion: `${PROMPT_VERSION}.${action}`,
          model: MODEL,
          output,
          inputTokens: usage?.inputTokens ?? null,
          outputTokens: usage?.outputTokens ?? null,
          userId,
        });
      } catch (err) {
        console.error("ai_generations log failed (improve)", err);
      }
    },
  });

  return result.toTextStreamResponse();
}
