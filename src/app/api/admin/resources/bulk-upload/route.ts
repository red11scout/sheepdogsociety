import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
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
import { generateFieldNotes } from "@/lib/resources/generate-field-notes";
import { uniqueResourceSlug } from "@/lib/resources/slug";

export const runtime = "nodejs";
// 300s (was 60): the per-file field-notes sonnet call stacks on top of
// categorize for multi-file uploads. Matches the retag route's precedent.
export const maxDuration = 300;

const MAX_BYTES = 25 * 1024 * 1024;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface FileResult {
  filename: string;
  ok: boolean;
  resourceId?: string;
  slug?: string;
  title?: string;
  error?: string;
  warnings?: string[];
}

/**
 * POST /api/admin/resources/bulk-upload
 *
 * Accepts multipart/form-data with:
 *   - file (one or many — repeat the field per file; the route processes each)
 *   - sectionId (uuid; required)
 *   - skipCategorize ("1" to skip the Claude pass, useful when uploading PDFs in bulk
 *     where you'll categorize later)
 *
 * For each file:
 *   1. Upload to Vercel Blob.
 *   2. If .docx, convert to HTML + plaintext via mammoth.
 *   3. If categorize is on AND we have body text, call Claude for tags + summary.
 *   4. Insert a resources row.
 *
 * Returns per-file results so the UI can show partial success.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Bad form data" }, { status: 400 });
  }

  const sectionId = (formData.get("sectionId") ?? "").toString();
  const skipCategorize = (formData.get("skipCategorize") ?? "") === "1";

  if (!sectionId) {
    return NextResponse.json({ error: "sectionId required" }, { status: 400 });
  }
  const [section] = await db
    .select()
    .from(resourceSections)
    .where(eq(resourceSections.id, sectionId));
  if (!section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const files = formData.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const results: FileResult[] = [];

  for (const file of files) {
    const filename = file.name;
    if (file.size > MAX_BYTES) {
      results.push({
        filename,
        ok: false,
        error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)`,
      });
      continue;
    }

    const isDocx =
      file.type === DOCX_MIME || /\.docx$/i.test(filename);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(filename);
    const isDoc = /\.doc$/i.test(filename) && !isDocx;

    if (!isDocx && !isPdf) {
      results.push({
        filename,
        ok: false,
        error: isDoc
          ? "Legacy .doc files aren't supported. Save as .docx and re-upload."
          : "Only .docx and .pdf are supported in bulk upload.",
      });
      continue;
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch {
      results.push({ filename, ok: false, error: "Could not read file" });
      continue;
    }

    // 1. Upload to Vercel Blob (always — gives us a permanent download URL).
    let blobUrl = "";
    try {
      const safeName = filename.replace(/[^\w.\-]/g, "_");
      const key = `resources/${section.slug}/${Date.now()}-${safeName}`;
      const blob = await put(key, buffer, {
        access: "public",
        addRandomSuffix: false,
        contentType: file.type || (isDocx ? DOCX_MIME : "application/pdf"),
      });
      blobUrl = blob.url;
    } catch (err) {
      console.error("Blob upload failed for", filename, err);
      results.push({
        filename,
        ok: false,
        error: "Upload to storage failed (check BLOB_READ_WRITE_TOKEN).",
      });
      continue;
    }

    // 2. Convert if .docx
    let bodyHtml = "";
    let bodyText = "";
    let warnings: string[] = [];
    let title = filename.replace(/\.(docx?|pdf)$/i, "").replace(/[_-]+/g, " ").trim();

    if (isDocx) {
      try {
        const converted = await convertDocxBuffer(buffer);
        bodyHtml = converted.html;
        bodyText = converted.text;
        warnings = converted.warnings;
        title = extractTitle(bodyHtml, title);
      } catch (err) {
        console.error("docx convert failed:", err);
        // Don't fail the whole row — we still have the file in Blob.
        warnings.push(
          `Document conversion failed: ${err instanceof Error ? err.message : "unknown"}. The file is available for download but no inline HTML was extracted.`
        );
      }
    }

    // 3. Categorize via Claude (only if we have body text and the admin opted in).
    let summary = "";
    let topics: string[] = [];
    let themes: string[] = [];
    let booksOfBible: string[] = [];
    let audience: "all" | "newcomer" | "leader" = "all";
    let aiCategorizedAt: Date | null = null;

    if (!skipCategorize && bodyText.length > 100) {
      try {
        const cat = await categorizeResource({
          title,
          bodyText,
          sectionName: section.name,
        });
        summary = cat.summary;
        topics = cat.topics;
        themes = cat.themes;
        booksOfBible = cat.booksOfBible;
        audience = cat.audience;
        aiCategorizedAt = new Date();

        try {
          await db.insert(aiGenerations).values({
            type: "draft",
            prompt: `Categorize: ${title}`.slice(0, 4000),
            promptVersion: CATEGORIZE_PROMPT_VERSION,
            model: "claude-haiku-4-5-20251001",
            output: JSON.stringify({ summary, topics, themes, booksOfBible }).slice(0, 4000),
            inputTokens: cat.tokensIn ?? null,
            outputTokens: cat.tokensOut ?? null,
            entityType: "resource",
            userId,
          });
        } catch (logErr) {
          console.error("ai_generations log failed:", logErr);
        }
      } catch (err) {
        console.error("categorize failed:", err);
        warnings.push(
          `AI categorization failed: ${err instanceof Error ? err.message : "unknown"}. You can re-run it later from the resource page.`
        );
      }
    }

    // 4. Insert row.
    let row;
    try {
      const slug = await uniqueResourceSlug(title || filename);
      const inserted = await db
        .insert(resources)
        .values({
          title,
          slug,
          description: summary || "",
          summary,
          bodyHtml,
          bodyText,
          type: "file",
          url: "",
          fileKey: blobUrl,
          sourceFilename: filename,
          sourceMime: file.type || (isDocx ? DOCX_MIME : "application/pdf"),
          uploadedBy: userId,
          sectionId,
          isPublic: true,
          category: section.slug,
          level: "all",
          audience,
          topics,
          themes,
          booksOfBible,
          estimatedMinutes: bodyText ? estimateReadingMinutes(bodyText) : null,
          aiCategorizedAt,
        })
        .returning({ id: resources.id, slug: resources.slug, title: resources.title });
      row = inserted[0];
    } catch (err) {
      console.error("resource insert failed:", err);
      results.push({
        filename,
        ok: false,
        error: "Database insert failed (the file is uploaded; nothing is rendered). Has migration 0006 been applied?",
      });
      continue;
    }

    // Field notes draft (spec §A-FN) — non-blocking; a failure leaves the
    // row at status 'none' for the section backfill or a manual draft.
    try {
      const notes = await generateFieldNotes({
        provider: null,
        bodyText,
        title,
        author: null,
        description: summary || "",
        summary,
      });
      if (notes) {
        await db
          .update(resources)
          .set({ fieldNotesHtml: notes.html, fieldNotesStatus: "draft", fieldNotesGeneratedAt: new Date() })
          .where(eq(resources.id, row.id));
      }
    } catch (err) {
      console.error("field-notes on upload failed", err);
    }

    results.push({
      filename,
      ok: true,
      resourceId: row.id,
      slug: row.slug,
      title: row.title,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  }

  return NextResponse.json({ results });
}
