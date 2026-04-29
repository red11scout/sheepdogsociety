import { auth } from "@/auth";
import { db } from "@/db";
import { aiGenerations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";

export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5";
const PROMPT_VERSION = "improve.v1";

const ACTION_INSTRUCTIONS: Record<string, string> = {
  rephrase:
    "Rephrase this passage in Jeremy's voice. Keep meaning. Cut filler. Same length or slightly shorter.",
  shorten:
    "Cut this passage to roughly half its length without losing the central point. Use shorter sentences.",
  expand:
    "Expand this passage by ~50%. Add a concrete image, an example, or a rhetorical move that lands the point. No filler.",
  "fix-grammar":
    "Fix grammar, punctuation, and obvious typos. Keep the voice. Do not rephrase.",
  pastoralize:
    "Rewrite to sound more pastoral — gentler, more inviting, less commanding. Same content.",
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

  const userPrompt = `${instruction}

Original text:
"""
${text}
"""

Reply with ONLY the rewritten text — no preamble, no quotes around it, no explanation.`;

  const result = streamText({
    model: anthropic(MODEL),
    system: SYSTEM_PROMPT,
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
