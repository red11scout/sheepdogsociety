import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { resources, users, aiGenerations } from "@/db/schema";
import { resourceSections } from "@/db/schema-new";
import { eq } from "drizzle-orm";
import {
  convertDocxBuffer,
  estimateReadingMinutes,
  extractTitle,
} from "@/lib/resources/convert";
import {
  CATEGORIZE_PROMPT_VERSION,
  categorizeResource,
} from "@/lib/resources/categorize";

export const runtime = "nodejs";
export const maxDuration = 60;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * POST /api/admin/resources/reextract
 * Body: { id: string, recategorize?: boolean }
 *
 * For a legacy resource that was uploaded as a bare file before the body
 * extraction pipeline existed: re-fetch the source from Vercel Blob, run it
 * through mammoth, populate body_html / body_text / estimated_minutes, and
 * (if recategorize is true and we got body text) re-run Claude categorize
 * to populate summary / topics / themes / books_of_bible / audience.
 *
 * Skips PDFs (mammoth only handles .docx). For PDFs you'd need to swap
 * mammoth for pdf-parse — out of scope for this iteration.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { id?: string; recategorize?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const [row] = await db
    .select({
      id: resources.id,
      title: resources.title,
      fileKey: resources.fileKey,
      sourceFilename: resources.sourceFilename,
      sourceMime: resources.sourceMime,
      sectionId: resources.sectionId,
    })
    .from(resources)
    .where(eq(resources.id, body.id));

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!row.fileKey) {
    return NextResponse.json(
      { error: "This resource has no source file (it's a link, not an upload)." },
      { status: 400 }
    );
  }

  // Heuristic: .docx by MIME or by URL extension. PDFs aren't supported here.
  const looksDocx =
    row.sourceMime === DOCX_MIME || /\.docx(\?|$)/i.test(row.fileKey);
  const looksPdf =
    row.sourceMime === "application/pdf" || /\.pdf(\?|$)/i.test(row.fileKey);
  if (!looksDocx) {
    return NextResponse.json(
      {
        error: looksPdf
          ? "PDF re-extraction isn't supported yet. Re-upload as .docx if you have it."
          : "Source file isn't a .docx, can't extract HTML.",
      },
      { status: 400 }
    );
  }

  // Pull the source file from Vercel Blob (or wherever fileKey points).
  let buffer: Buffer;
  try {
    const fetched = await fetch(row.fileKey);
    if (!fetched.ok) {
      return NextResponse.json(
        { error: `Could not fetch source file (HTTP ${fetched.status}).` },
        { status: 502 }
      );
    }
    buffer = Buffer.from(await fetched.arrayBuffer());
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to download source file.",
      },
      { status: 502 }
    );
  }

  let bodyHtml = "";
  let bodyText = "";
  let warnings: string[] = [];
  let extractedTitle = row.title;
  try {
    const converted = await convertDocxBuffer(buffer);
    bodyHtml = converted.html;
    bodyText = converted.text;
    warnings = converted.warnings;
    extractedTitle = extractTitle(bodyHtml, row.title);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `mammoth failed: ${err.message}`
            : "mammoth failed",
      },
      { status: 500 }
    );
  }

  const patch: Record<string, unknown> = {
    bodyHtml,
    bodyText,
    estimatedMinutes: bodyText ? estimateReadingMinutes(bodyText) : null,
  };

  let categorized: Awaited<ReturnType<typeof categorizeResource>> | null = null;
  if (body.recategorize !== false && bodyText.length > 100) {
    let sectionName: string | undefined;
    if (row.sectionId) {
      const [s] = await db
        .select({ name: resourceSections.name })
        .from(resourceSections)
        .where(eq(resourceSections.id, row.sectionId));
      sectionName = s?.name;
    }
    try {
      categorized = await categorizeResource({
        title: extractedTitle,
        bodyText,
        sectionName,
      });
      patch.summary = categorized.summary;
      patch.topics = categorized.topics;
      patch.themes = categorized.themes;
      patch.booksOfBible = categorized.booksOfBible;
      patch.audience = categorized.audience;
      patch.aiCategorizedAt = new Date();

      try {
        await db.insert(aiGenerations).values({
          type: "draft",
          prompt: `Re-extract + categorize: ${extractedTitle}`.slice(0, 4000),
          promptVersion: CATEGORIZE_PROMPT_VERSION,
          model: "claude-haiku-4-5-20251001",
          output: JSON.stringify(categorized).slice(0, 4000),
          inputTokens: categorized.tokensIn ?? null,
          outputTokens: categorized.tokensOut ?? null,
          entityType: "resource",
          userId,
        });
      } catch (logErr) {
        console.error("ai_generations log failed:", logErr);
      }
    } catch (err) {
      warnings.push(
        `Categorization failed: ${
          err instanceof Error ? err.message : "unknown"
        }. Body was still extracted; you can re-tag from the row.`
      );
    }
  }

  await db.update(resources).set(patch).where(eq(resources.id, row.id));

  return NextResponse.json({
    ok: true,
    title: extractedTitle,
    bodyTextLength: bodyText.length,
    estimatedMinutes: patch.estimatedMinutes ?? null,
    categorized: categorized
      ? {
          summary: categorized.summary,
          topics: categorized.topics,
          themes: categorized.themes,
          booksOfBible: categorized.booksOfBible,
          audience: categorized.audience,
        }
      : null,
    warnings,
  });
}
