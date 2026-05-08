import { notFound } from "next/navigation";
import { getEncouragement } from "@/server/encouragements";
import { EncouragementEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function EncouragementEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let row;
  try {
    row = await getEncouragement(id);
  } catch {
    return (
      <div className="px-8 py-10">
        <p className="text-sm text-stone/70">
          Could not load. Make sure migration 0002 has been applied.
        </p>
      </div>
    );
  }
  if (!row) notFound();

  const scriptures = Array.isArray(row.scriptures)
    ? (row.scriptures as { ref: string; note?: string }[])
    : [];

  return (
    <EncouragementEditor
      id={row.id}
      initial={{
        title: row.title,
        issueNumber: row.issueNumber,
        slug: row.slug,
        publishDate: row.publishDate ?? "",
        status: row.status,
        intro: row.intro ?? "",
        updates: row.updates ?? "",
        scriptures,
        guidance: row.guidance ?? "",
        notes: row.notes ?? "",
        coverImageUrl: row.coverImageUrl ?? "",
        coverImageAlt: row.coverImageAlt ?? "",
        theme: (row as { theme?: string | null }).theme ?? "",
        voice: (row as { voice?: string | null }).voice ?? "",
      }}
    />
  );
}
