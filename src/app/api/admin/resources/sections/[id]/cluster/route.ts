/**
 * POST /api/admin/resources/sections/[id]/cluster
 *
 * Bulk-assigns each resource in a section to one of 4-7 AI-generated
 * cluster labels (e.g. "Marriage & Family", "Trust & Surrender"). One
 * Claude call processes the whole section. Public /resources browser
 * groups cards under the cluster heading within the section.
 *
 * Idempotent: re-running overwrites previous cluster assignments.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { resources, users } from "@/db/schema";
import { resourceSections } from "@/db/schema-new";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { clusterResources } from "@/lib/resources/cluster";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [section] = await db
    .select()
    .from(resourceSections)
    .where(eq(resourceSections.id, id));
  if (!section)
    return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const rows = await db
    .select({
      id: resources.id,
      title: resources.title,
      summary: resources.summary,
      topics: resources.topics,
    })
    .from(resources)
    .where(and(eq(resources.sectionId, id), isNull(resources.deletedAt)));

  if (rows.length === 0) {
    return NextResponse.json({
      sectionName: section.name,
      labels: [],
      assignments: 0,
      message: "Section is empty.",
    });
  }

  let result;
  try {
    result = await clusterResources(
      section.name,
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary ?? "",
        topics: (r.topics as string[]) ?? [],
      }))
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Clustering failed",
        detail: err instanceof Error ? err.message.slice(0, 300) : "unknown",
      },
      { status: 502 }
    );
  }

  // Group assignments by cluster label so we can issue one UPDATE per
  // bucket instead of N updates. Much faster than a loop.
  const byCluster = new Map<string, string[]>();
  for (const a of result.assignments) {
    if (!byCluster.has(a.cluster)) byCluster.set(a.cluster, []);
    byCluster.get(a.cluster)!.push(a.id);
  }

  for (const [label, ids] of byCluster) {
    if (ids.length === 0) continue;
    await db
      .update(resources)
      .set({ cluster: label })
      .where(inArray(resources.id, ids));
  }

  return NextResponse.json({
    sectionName: section.name,
    labels: result.labels,
    assignments: result.assignments.length,
    bucketCounts: Object.fromEntries(
      Array.from(byCluster, ([label, ids]) => [label, ids.length])
    ),
  });
}
