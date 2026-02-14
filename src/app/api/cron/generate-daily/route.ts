import { db } from "@/db";
import { devotionals, scriptureOfDay } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { format, addDays } from "date-fns";

const devotionalSchema = z.object({
  title: z.string(),
  content: z.string(),
  prayerPrompt: z.string(),
  discussionQuestions: z.array(z.string()),
});

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate for tomorrow
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  // Check if already exists
  const [existing] = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.date, tomorrow));

  if (existing) {
    return Response.json({ message: "Devotional already exists", date: tomorrow });
  }

  // Get scripture of the day for context
  const [scripture] = await db
    .select()
    .from(scriptureOfDay)
    .where(eq(scriptureOfDay.date, tomorrow));

  const scriptureContext = scripture
    ? `Tomorrow's Scripture: ${scripture.reference}. Theme: ${scripture.theme ?? "Faith"}.`
    : "Choose an appropriate passage for men of faith.";

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    schema: devotionalSchema,
    prompt: `Write a daily devotional for men of faith for ${tomorrow}.

${scriptureContext}

Write in the style of Ernest Hemingway: direct, spare, warm. 200-350 words. Include scripture references, practical application for men's lives, and discussion questions.

- title: 3-6 words
- content: 200-350 words
- prayerPrompt: 2-3 sentences guiding prayer
- discussionQuestions: 3 questions for small groups`,
  });

  const [devotional] = await db
    .insert(devotionals)
    .values({
      date: tomorrow,
      title: object.title,
      content: object.content,
      scriptureReference: scripture?.reference ?? "Proverbs 27:17",
      prayerPrompt: object.prayerPrompt,
      discussionQuestions: object.discussionQuestions,
      isApproved: false,
    })
    .returning();

  return Response.json({ devotional, date: tomorrow });
}
