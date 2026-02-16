import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const blogDraftSchema = z.object({
  title: z.string(),
  excerpt: z.string(),
  content: z.string(),
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
    !["admin", "group_leader", "asst_leader"].includes(currentUser.role)
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const topic = body.topic;

  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    return Response.json({ error: "Topic is required" }, { status: 400 });
  }

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    schema: blogDraftSchema,
    prompt: `Write a blog post for a men's Bible study community called Sheepdog Society. The topic is: "${topic}"

Write in the style of Ernest Hemingway: direct sentences, active voice, spare and clean prose. Professional, polite, and warm. No flowery language. No cliches. Write like a man talking to men about things that matter.

Requirements:
- title: A compelling title, 5-10 words
- excerpt: A 1-2 sentence summary, under 200 characters
- content: A 400-800 word blog post as HTML. Use ONLY these HTML tags:
  <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>, <hr>
  Do NOT use <h1> (the title is displayed separately).
  Include 2-3 scripture references woven naturally into the text.
  End with a clear call to action or reflection point.

The tone should be that of an experienced, trusted older brother in the faith — not preachy, not academic, not sentimental. Direct and honest.`,
  });

  return Response.json({ draft: object });
}
