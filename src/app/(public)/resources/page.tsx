import { listSectionsAndResourcesForPublic } from "@/server/resources-admin";
import { ResourcesBrowser } from "./browser";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resources — Sheepdog Society",
  description:
    "Bible studies, leader guides, sermon studies, leadership material. Free. Search by topic, theme, or book of the Bible. Read on any device, print, or download.",
};

export default async function ResourcesPage() {
  let sections: Awaited<
    ReturnType<typeof listSectionsAndResourcesForPublic>
  >["sections"] = [];
  let items: Awaited<
    ReturnType<typeof listSectionsAndResourcesForPublic>
  >["items"] = [];
  try {
    const data = await listSectionsAndResourcesForPublic();
    sections = data.sections;
    items = data.items;
  } catch {
    // Migration may not be applied yet — render empty state.
  }

  return (
    <ResourcesBrowser
      sections={sections.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description ?? "",
        icon: s.icon ?? "scroll",
      }))}
      items={items.map((i) => ({
        id: i.id,
        title: i.title,
        slug: i.slug,
        summary: i.summary ?? "",
        description: i.description ?? "",
        url: i.url ?? "",
        fileKey: i.fileKey ?? "",
        type: i.type,
        provider: (i.provider as "youtube" | "amazon" | "web" | "file" | null) ?? null,
        thumbnailUrl: i.thumbnailUrl ?? null,
        author: i.author ?? null,
        durationSeconds: i.durationSeconds ?? null,
        category: i.category ?? "",
        sectionId: i.sectionId ?? "",
        audience: (i.audience as "all" | "newcomer" | "leader") ?? "all",
        topics: (i.topics ?? []) as string[],
        themes: (i.themes ?? []) as string[],
        booksOfBible: (i.booksOfBible ?? []) as string[],
        estimatedMinutes: i.estimatedMinutes ?? null,
        hasBody: i.hasBody,
      }))}
    />
  );
}
