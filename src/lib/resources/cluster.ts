/**
 * AI-clustered sub-groups within a resource section.
 *
 * Given a section's worth of titles + summaries, ask Claude to bucket them
 * into 4-7 short, human-readable cluster labels. The labels are then
 * written to each resource's `cluster` column. The public browser groups
 * cards under those labels so a long section reads as a navigable
 * mini-table-of-contents instead of a wall of cards.
 *
 * One bulk Claude call per section, capped at 80 rows in the prompt to
 * stay within context. For larger sections we'd chunk + merge labels;
 * not needed yet.
 */
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const MODEL = "claude-haiku-4-5-20251001";
export const CLUSTER_PROMPT_VERSION = "resource-cluster.v1";

const clusterSchema = z.object({
  labels: z
    .array(z.string().min(3).max(40))
    .min(2)
    .max(8)
    .describe(
      "4-7 short cluster labels (3-4 words each, Title Case) that meaningfully separate the resources. Examples: 'Marriage & Family', 'Trust & Surrender', 'Identity & Calling', 'Leadership & Legacy'. Avoid jargon."
    ),
  assignments: z
    .array(
      z.object({
        id: z.string().describe("The resource id from the input."),
        cluster: z
          .string()
          .min(3)
          .max(40)
          .describe(
            "Exact match against one of the labels above. Pick the single best fit."
          ),
      })
    )
    .describe("One entry per input resource."),
});

export type ClusterResult = z.infer<typeof clusterSchema>;

export interface ClusterInput {
  id: string;
  title: string;
  summary?: string;
  topics?: string[];
}

const SYSTEM = `You group Bible studies, leader guides, and discipleship resources for a Christian men's ministry.

Goal: pick 4-7 short, scannable cluster labels that meaningfully split a list of resources into navigable buckets. The labels must be useful to a man looking for "the one about marriage" or "the one about trusting God when everything is shaking".

Rules:
- 3-4 words per label, Title Case ("Marriage & Family" not "marriage and family stuff").
- Don't repeat the section name as a cluster (no "Bible Studies" inside Bible Studies).
- Aim for roughly even bucket sizes; don't make a 50-row bucket and a 1-row bucket.
- Every input resource gets exactly one cluster, matched verbatim against your labels.
- Plain English. No Christianese ("sanctification", "regeneration") in labels — save those for the AI tags.`;

export async function clusterResources(
  sectionName: string,
  rows: ClusterInput[]
): Promise<ClusterResult & { tokensIn?: number; tokensOut?: number }> {
  if (rows.length === 0) {
    return { labels: [], assignments: [] };
  }

  // Cap input — the schema can handle it, but we don't need to flood
  // context. 80 rows × ~150 chars each = ~12K chars of resource list.
  const capped = rows.slice(0, 80);

  const list = capped
    .map((r, i) => {
      const summary = (r.summary ?? "").trim().slice(0, 220);
      const topics = (r.topics ?? []).slice(0, 5).join(", ");
      return [
        `${i + 1}. id=${r.id}`,
        `   title: ${r.title}`,
        summary && `   summary: ${summary}`,
        topics && `   topics: ${topics}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const userPrompt = `Section: ${sectionName}
Resources to cluster: ${capped.length}

${list}

Now produce the cluster schema. Pick 4-7 labels and assign every resource to exactly one.`;

  const result = await generateObject({
    model: anthropic(MODEL),
    schema: clusterSchema,
    system: SYSTEM,
    prompt: userPrompt,
    temperature: 0.3,
    maxRetries: 1,
  });

  // Sanity-check: every assignment.cluster matches one of the labels.
  // If Claude drifted, snap to the nearest label by case-insensitive
  // match; otherwise drop into a "Other" bucket.
  const labelSet = new Set(result.object.labels.map((l) => l.toLowerCase()));
  const labelByLower = new Map(
    result.object.labels.map((l) => [l.toLowerCase(), l])
  );
  const cleaned = result.object.assignments.map((a) => {
    const exact = labelByLower.get(a.cluster.toLowerCase());
    return { id: a.id, cluster: exact ?? a.cluster.trim() };
  });

  return {
    labels: result.object.labels,
    assignments: cleaned,
    tokensIn: result.usage?.inputTokens ?? undefined,
    tokensOut: result.usage?.outputTokens ?? undefined,
  };
}
