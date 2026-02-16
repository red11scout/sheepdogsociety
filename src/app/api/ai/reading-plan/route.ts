import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const readingPlanSchema = z.object({
  name: z.string(),
  description: z.string(),
  readings: z.array(
    z.object({
      day: z.number(),
      readings: z.array(z.string()),
    })
  ),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));
  if (
    !currentUser ||
    !["admin", "group_leader"].includes(currentUser.role)
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { theme, days, focusBooks } = body;

  if (!theme || typeof theme !== "string" || theme.trim().length === 0) {
    return Response.json({ error: "Theme is required" }, { status: 400 });
  }

  const dayCount = Math.min(Math.max(Number(days) || 7, 3), 90);

  const focusBooksNote =
    focusBooks && Array.isArray(focusBooks) && focusBooks.length > 0
      ? `\nFocus primarily on these books of the Bible: ${focusBooks.join(", ")}.`
      : "";

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    schema: readingPlanSchema,
    prompt: `Generate a ${dayCount}-day Bible reading plan on the theme: "${theme}"
${focusBooksNote}

Requirements:
- name: A descriptive plan name, 3-7 words
- description: A 1-2 sentence overview of the plan
- readings: An array of exactly ${dayCount} entries, each with:
  - day: integer from 1 to ${dayCount}
  - readings: array of 1-3 scripture references (e.g. "Genesis 1:1-31", "Psalm 23:1-6", "Romans 8:28-39")

Guidelines:
- Each day's readings should take approximately 15-20 minutes
- Follow a logical thematic progression through the plan
- Include diverse coverage: Old Testament, New Testament, Psalms, Proverbs, Prophets, Epistles
- All scripture references must be specific: Book Chapter:Verse-Verse format
- Build toward a climax or key insight in the final days
- The plan should work for men in a Bible study group setting`,
  });

  return Response.json({ draft: object });
}
