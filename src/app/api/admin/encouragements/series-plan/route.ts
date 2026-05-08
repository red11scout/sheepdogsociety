import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, aiGenerations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  generateLetterSeries,
  SERIES_PLAN_PROMPT_VERSION,
} from "@/lib/ai/letter-series";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  title: z.string().min(1).max(160),
  theme: z.string().min(1).max(160),
  voiceId: z.string().min(1).max(40),
  voiceFreeform: z.string().max(2000).optional(),
  totalCount: z.number().int().min(2).max(12),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Bad request", detail: err instanceof Error ? err.message : "" },
      { status: 400 }
    );
  }

  let plan;
  try {
    plan = await generateLetterSeries(body);
  } catch (err) {
    console.error("series plan failed:", err);
    return NextResponse.json(
      {
        error: "AI plan failed",
        detail: err instanceof Error ? err.message.slice(0, 400) : "",
      },
      { status: 502 }
    );
  }

  // Best-effort logging.
  try {
    await db.insert(aiGenerations).values({
      type: "draft",
      prompt: `Series: ${body.title}`.slice(0, 4000),
      promptVersion: SERIES_PLAN_PROMPT_VERSION,
      model: "claude-sonnet-4-5",
      output: JSON.stringify(plan).slice(0, 8000),
      inputTokens: plan.tokensIn ?? null,
      outputTokens: plan.tokensOut ?? null,
      entityType: "letter_series",
      userId,
    });
  } catch (logErr) {
    console.error("ai_generations log failed:", logErr);
  }

  return NextResponse.json({ plan: { letters: plan.letters } });
}
