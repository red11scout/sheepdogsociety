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
import { scrubAiPayload } from "@/lib/ai/scrub";
import { friendlyZodError } from "@/lib/api/zod-error";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "claude-sonnet-4-5";
const PROMPT_VERSION = "encouragement-draft.v1";

// Anthropic structured output rejects array min/maxItems entirely. Zero
// size/length constraints in the schema; everything is enforced in the
// prompt + post-response validation block further down.
const draftSchema = z.object({
  intro: z
    .string()
    .describe(
      "60-100 word warm pastoral opening that hooks the reader on the theme. No em-dashes when commas work."
    ),
  scriptures: z.array(
    z.object({
      ref: z
        .string()
        .describe('Bible reference in standard form, e.g. "Romans 5:3-4". Real verses only.'),
      note: z
        .string()
        .describe("One sentence on why this verse fits the theme."),
    })
  ),
  guidance: z
    .string()
    .describe(
      "200-280 word pastoral teaching anchored in one of the scriptures above. End with one specific concrete pastoral move."
    ),
  notes: z
    .string()
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
      { error: "Bad request", detail: friendlyZodError(err) },
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
- scriptures: EXACTLY 2 or 3 references that genuinely anchor the theme. Use real verse references only. Each gets a one-sentence note (10+ words) on why it fits. Never fewer than 2, never more than 3.
- guidance: a 200-280 word pastoral teaching that leans on one of the scriptures above. Land with one specific, concrete pastoral move the brother can do this week.
- notes: a 60-90 word "Notes from the Watch" closing — personal, brief, warm.

Honor every voice rule. No em-dashes when commas work. Never invent verse text — references only. Never put words in any named theologian's mouth; this is original prose in the spirit of the voice.`;

  // Two-attempt loop. The model sometimes returns 1 scripture or short
  // sections on the first pass. One silent retry hides those misses
  // from the admin. If both attempts fail validation, surface the last
  // error so the admin can adjust theme/voice.
  let draft: Draft | null = null;
  let lastError = "";
  let totalIn = 0;
  let totalOut = 0;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateObject({
        model: anthropic(MODEL),
        schema: draftSchema,
        system,
        prompt: userPrompt,
        temperature: attempt === 1 ? 0.6 : 0.45, // tighter on retry
        maxRetries: 1,
      });
      totalIn += result.usage?.inputTokens ?? 0;
      totalOut += result.usage?.outputTokens ?? 0;

      // Post-response validation. The schema can't enforce array bounds
      // (Anthropic structured-output rejects min/maxItems), so we
      // re-check here.
      if (result.object.scriptures.length < 2 || result.object.scriptures.length > 3) {
        lastError = `Draft came back with ${result.object.scriptures.length} scriptures, need 2 to 3. Try again.`;
        console.warn(`draft attempt ${attempt} failed validation: ${lastError}`);
        continue;
      }
      if (result.object.intro.length < 40 || result.object.guidance.length < 100 || result.object.notes.length < 30) {
        lastError = "Draft came back too short. Try again.";
        console.warn(`draft attempt ${attempt} failed validation: ${lastError}`);
        continue;
      }

      // Scrub em-dashes and hashtags belt-and-braces — system prompt forbids
      // them but the model still slips them in.
      draft = scrubAiPayload(result.object);
      break;
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : "The model returned something unusable.";
      console.error(`encouragement draft attempt ${attempt} failed:`, err);
    }
  }

  if (!draft) {
    return NextResponse.json(
      { error: "Draft failed", detail: lastError.slice(0, 400) || "Try again." },
      { status: 502 }
    );
  }

  // Best-effort logging. Don't block the user on log failure.
  try {
    await db.insert(aiGenerations).values({
      type: "draft",
      prompt: userPrompt.slice(0, 4000),
      promptVersion: PROMPT_VERSION,
      model: MODEL,
      output: JSON.stringify(draft).slice(0, 8000),
      inputTokens: totalIn || null,
      outputTokens: totalOut || null,
      entityType: "encouragement",
      userId,
    });
  } catch (logErr) {
    console.error("ai_generations log failed:", logErr);
  }

  return NextResponse.json(
    { draft, voiceId: body.voiceId },
    { headers: { "Cache-Control": "no-store" } }
  );
}
