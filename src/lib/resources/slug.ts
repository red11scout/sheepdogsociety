import { db } from "@/db";
import { resources } from "@/db/schema";
import { eq } from "drizzle-orm";

export function slugifyResource(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/\.(docx?|pdf)$/i, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 70) || "resource"
  );
}

export async function uniqueResourceSlug(base: string): Promise<string> {
  const seed = slugifyResource(base);
  let slug = seed;
  let suffix = 1;
  while (true) {
    const [existing] = await db
      .select({ id: resources.id })
      .from(resources)
      .where(eq(resources.slug, slug));
    if (!existing) return slug;
    suffix += 1;
    slug = `${seed}-${suffix}`;
  }
}
