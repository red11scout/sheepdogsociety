"use server";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { resources, users, aiGenerations } from "@/db/schema";
import { resourceSections } from "@/db/schema-new";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  CATEGORIZE_PROMPT_VERSION,
  categorizeResource,
} from "@/lib/resources/categorize";
import { uniqueResourceSlug } from "@/lib/resources/slug";
import type { Provider } from "@/lib/resources/enrich";

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") throw new Error("Forbidden");
  return userId;
}

export interface CreateLinkResourceInput {
  sectionId: string;
  // From the enrichment step
  url: string;
  provider: Provider;
  title: string;
  summary?: string; // pre-filled from OG description; admin can edit
  thumbnailUrl?: string | null;
  author?: string | null;
  embedHtml?: string | null;
  durationSeconds?: number | null;
  adminNotes?: string;
  // Companion (Book Studies)
  companionUrl?: string;
  companionFileKey?: string;
  companionLabel?: string;
}

/**
 * Create a single link-based resource (sermon URL, generic web link).
 * AI categorize runs against (title + summary + admin_notes) since there's
 * no body text to mine. Skips silently if categorize fails — admin can
 * re-tag from the row.
 */
export async function createLinkResource(input: CreateLinkResourceInput) {
  const userId = await requireAdmin();

  const [section] = await db
    .select()
    .from(resourceSections)
    .where(eq(resourceSections.id, input.sectionId));
  if (!section) throw new Error("Section not found");

  // Categorize from the metadata we have. Skip if we have nothing meaningful.
  const seed = [input.title, input.summary, input.adminNotes]
    .filter(Boolean)
    .join("\n\n");

  let summary = input.summary ?? "";
  let topics: string[] = [];
  let themes: string[] = [];
  let booksOfBible: string[] = [];
  let audience: "all" | "newcomer" | "leader" = "all";
  let aiCategorizedAt: Date | null = null;

  if (seed.trim().length > 30) {
    try {
      const cat = await categorizeResource({
        title: input.title,
        bodyText: seed,
        sectionName: section.name,
      });
      // Only overwrite the summary if the admin didn't provide one.
      if (!input.summary) summary = cat.summary;
      topics = cat.topics;
      themes = cat.themes;
      booksOfBible = cat.booksOfBible;
      audience = cat.audience;
      aiCategorizedAt = new Date();

      try {
        await db.insert(aiGenerations).values({
          type: "draft",
          prompt: `Link enrich: ${input.title}`.slice(0, 4000),
          promptVersion: CATEGORIZE_PROMPT_VERSION,
          model: "claude-haiku-4-5-20251001",
          output: JSON.stringify({ summary, topics, themes, booksOfBible }).slice(
            0,
            4000
          ),
          inputTokens: cat.tokensIn ?? null,
          outputTokens: cat.tokensOut ?? null,
          entityType: "resource",
          userId,
        });
      } catch (logErr) {
        console.error("ai_generations log failed:", logErr);
      }
    } catch (err) {
      console.error("categorize failed for link resource:", err);
      // Continue — admin can tag from the row.
    }
  }

  const slug = await uniqueResourceSlug(input.title);

  const [row] = await db
    .insert(resources)
    .values({
      title: input.title,
      slug,
      description: summary,
      summary,
      url: input.url,
      type: input.provider === "youtube" ? "video" : "link",
      provider: input.provider,
      embedHtml: input.embedHtml ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      author: input.author ?? null,
      durationSeconds: input.durationSeconds ?? null,
      adminNotes: input.adminNotes ?? "",
      companionUrl: input.companionUrl ?? null,
      companionFileKey: input.companionFileKey ?? null,
      companionLabel: input.companionLabel ?? null,
      uploadedBy: userId,
      sectionId: input.sectionId,
      isPublic: true,
      category: section.slug,
      level: "all",
      audience,
      topics,
      themes,
      booksOfBible,
      aiCategorizedAt,
    })
    .returning({ id: resources.id, slug: resources.slug });

  revalidatePath("/admin/resources");
  revalidatePath("/resources");
  return row;
}
