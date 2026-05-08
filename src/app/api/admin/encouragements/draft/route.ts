import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, aiGenerations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { findVoice } from "@/lib/ai/voices";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5";
const PROMPT_VERSION = "encouragement-draft.v1";

const draftSchema = z.object({
  intro: z
    .string()
    .min(60)
    .describe(
      "60-100 word warm pastoral opening that hooks the reader on the theme. No em-dashes when commas work."
    ),
  scriptures: z
    .array(
      z.object({
        ref: z
          .string()
          .min(3)
          .describe('Bible reference in standard form, e.g. "Romans 5:3-4". Real verses only.'),
        note: z
          .string()
          .min(10)
          .describe("One sentence on why this verse fits the theme."),
      })
    )
    .min(2)
    .max(3),
  guidance: z
    .string()
    .min(150)
    .describe(
      "200-280 word pastoral teaching anchored in one of the scriptures above. End with one specific concrete pastoral move."
    ),
  notes: z
    .string()
    .min(40)
    .describe('60-90 word "Notes from the Watch" closing. Personal, brief, signed warmly.'),
});

type Draft = z.infer<typeof draftSchema>;

const bodySchema = z.object({
  theme: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  voiceId: z.string().min(1).max(40),
  voiceFreeform: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Bad request", detail: err instanceof Error ? err.message : "" },
      { status: 400 }
    );
  }

  const voice = findVoice(body.voiceId);
  const voiceAddendum =
    voice?.systemAddendum ??
    (body.voiceFreeform
      ? `Write in the voice the admin describes here: "${body.voiceFreeform}". Honor every brand-voice and scripture rule above.`
      : "");

  const system = `${SYSTEM_PROMPT}\n\n${voiceAddendum}`.trim();

  const userPrompt = `Draft this week's encouragement for the Sheepdog Society.

Theme: ${body.theme}
Working title: ${body.title}

Return four sections that flow together:
- intro: a 60-100 word opening that names something a man recognizes in his own week, then pivots to the theme.
- scriptures: 2 to 3 references that genuinely anchor the theme. Use real verse references only. Add a one-sentence note for each on why it fits.
- guidance: a 200-280 word pastoral teaching that leans on one of the scriptures above. Land with one specific, concrete pastoral move the brother can do this week.
- notes: a 60-90 word "Notes from the Watch" closing — personal, brief, warm.

Honor every voice rule. No em-dashes when commas work. Never invent verse text — references only. Never put words in any named theologian's mouth; this is original prose in the spirit of the voice.`;

  let draft: Draft;
  try {
    const result = await generateObject({
      model: anthropic(MODEL),
      schema: draftSchema,
      system,
      prompt: userPrompt,
      temperature: 0.6,
      maxRetries: 1,
    });
    draft = result.object;

    // Best-effort logging. Don't block the user on log failure.
    try {
      await db.insert(aiGenerations).values({
        type: "draft",
        prompt: userPrompt.slice(0, 4000),
        promptVersion: PROMPT_VERSION,
        model: MODEL,
        output: JSON.stringify(draft).slice(0, 8000),
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        entityType: "encouragement",
        userId,
      });
    } catch (logErr) {
      console.error("ai_generations log failed:", logErr);
    }
  } catch (err) {
    console.error("encouragement draft failed:", err);
    return NextResponse.json(
      {
        error: "Draft failed",
        detail:
          err instanceof Error
            ? err.message.slice(0, 400)
            : "The model returned something unusable. Try again.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { draft, voiceId: body.voiceId },
    { headers: { "Cache-Control": "no-store" } }
  );
}
