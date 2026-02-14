import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, scriptureOfDay } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

const scriptureSchema = z.object({
  scriptures: z.array(
    z.object({
      date: z.string(),
      reference: z.string(),
      reflection: z.string(),
    })
  ),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can generate
  const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
  if (!currentUser || currentUser.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const theme = body.theme ?? "Faith and Courage";
  const month = body.month ?? format(new Date(), "yyyy-MM");

  // Get all days in the target month
  const monthStart = startOfMonth(new Date(`${month}-01`));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    schema: scriptureSchema,
    prompt: `Generate a daily scripture selection for each day of ${format(monthStart, "MMMM yyyy")} (${days.length} days).

Theme for this month: "${theme}"

For each day provide:
- date: in YYYY-MM-DD format
- reference: a specific Bible verse or short passage (e.g., "Proverbs 27:17", "Romans 8:28-30")
- reflection: a 1-2 sentence reflection connecting the verse to the theme. Write in the style of Ernest Hemingway — direct, spare, warm.

Requirements:
- Cover a diverse range of books: Old Testament, New Testament, Psalms, Proverbs, Prophets, Epistles
- Each selection should connect to the monthly theme
- Reflections should be practical and applicable to men's daily lives — fatherhood, marriage, leadership, service, courage
- Keep reflections under 50 words

The dates should be: ${days.map((d) => format(d, "yyyy-MM-dd")).join(", ")}`,
  });

  // Store in database
  for (const scripture of object.scriptures) {
    await db
      .insert(scriptureOfDay)
      .values({
        date: scripture.date,
        reference: scripture.reference,
        reflection: scripture.reflection,
        theme,
        translation: "ESV",
        isApproved: false,
      })
      .onConflictDoNothing();
  }

  return Response.json({
    count: object.scriptures.length,
    month,
    theme,
  });
}
