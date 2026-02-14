import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, devotionals, scriptureOfDay } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { format } from "date-fns";

const devotionalSchema = z.object({
  title: z.string(),
  content: z.string(),
  prayerPrompt: z.string(),
  discussionQuestions: z.array(z.string()),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
  if (!currentUser || currentUser.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const date = body.date ?? format(new Date(), "yyyy-MM-dd");

  // Check if devotional already exists for this date
  const [existing] = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.date, date));

  if (existing) {
    return Response.json({ devotional: existing, alreadyExists: true });
  }

  // Get today's scripture of the day for context
  const [todayScripture] = await db
    .select()
    .from(scriptureOfDay)
    .where(eq(scriptureOfDay.date, date));

  const scriptureContext = todayScripture
    ? `Today's Scripture: ${todayScripture.reference}. Theme: ${todayScripture.theme ?? "Faith and Courage"}.`
    : "No specific scripture selected for today. Choose an appropriate passage.";

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    schema: devotionalSchema,
    prompt: `Write a daily devotional for men of faith for ${date}.

${scriptureContext}

Write in the style of Ernest Hemingway: direct sentences, active voice, spare and clean prose. Professional, polite, and warm. No flowery language. No clichés. Write like a man talking to men about things that matter.

Requirements:
- title: A short, strong title (3-6 words)
- content: A 200-350 word devotional that:
  - Opens with the scripture reference
  - Connects the verse to practical life — fatherhood, marriage, leadership, work, service, courage
  - Includes 2-3 specific scripture references
  - Ends with a clear, actionable application
- prayerPrompt: A 2-3 sentence prayer prompt (not the prayer itself — a guide for the reader's own prayer)
- discussionQuestions: 3 questions for small group discussion

The tone should be that of an experienced, trusted older brother in the faith — not preachy, not academic, not sentimental. Direct and honest.`,
  });

  const scriptureRef = todayScripture?.reference ?? "Proverbs 27:17";

  const [devotional] = await db
    .insert(devotionals)
    .values({
      date,
      title: object.title,
      content: object.content,
      scriptureReference: scriptureRef,
      scriptureText: todayScripture?.text ?? "",
      prayerPrompt: object.prayerPrompt,
      discussionQuestions: object.discussionQuestions,
      isApproved: false,
    })
    .returning();

  return Response.json({ devotional });
}
