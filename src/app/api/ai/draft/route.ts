import { auth } from "@/auth";
import { db } from "@/db";
import { aiGenerations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";

export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5";
const PROMPT_VERSION = "draft.v1";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = (await req.json()) as {
    seed?: string;
    tone?: "Pastoral" | "Reflective" | "Bold";
    length?: "Short" | "Medium" | "Long";
  };
  const seed = body.seed?.trim();
  if (!seed) {
    return new Response("Missing seed", { status: 400 });
  }
  const tone = body.tone ?? "Pastoral";
  const length = body.length ?? "Medium";

  const lengthHint =
    length === "Short" ? "~300 words" : length === "Long" ? "~1000 words" : "~600 words";

  const userPrompt = `Draft a weekly letter for The Letter — Acts 2028 Sheepdog Society's editorial newsletter. ${lengthHint}.

Tone: ${tone}.

Jeremy's seed thought:
"${seed}"

Structure (no need to label):
- Opening note (~150 words, signed warmth)
- Main essay (1-3 short H2 sections)
- One scripture pull-out — use {{VERSE: book chapter:verse}} placeholder (e.g. {{VERSE: Romans 5:3-4}}). Do NOT write verse text.
- "This Week's Practice" — one concrete step.
- Sign-off line.

Constraints from style guide are in the system prompt. Trust the reader. Cut anything that sounds like a megachurch.`;

  const result = streamText({
    model: anthropic(MODEL),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    onFinish: async ({ text, usage }) => {
      try {
        await db.insert(aiGenerations).values({
          type: "draft",
          prompt: userPrompt,
          promptVersion: PROMPT_VERSION,
          model: MODEL,
          output: text,
          inputTokens: usage?.inputTokens ?? null,
          outputTokens: usage?.outputTokens ?? null,
          userId,
        });
      } catch (err) {
        console.error("ai_generations log failed (draft)", err);
      }
    },
  });

  return result.toTextStreamResponse();
}
