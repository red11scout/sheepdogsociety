import Link from "next/link";
import { listSectionsAndResourcesForPublic } from "@/server/resources-admin";
import { Icon, type IconName } from "@/components/icons/Icon";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resources — Sheepdog Society",
  description:
    "Bible studies, leader guides, workout plans, and more. Curated for men in the brotherhood.",
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
    // graceful: render empty state
  }

  // Group items by section slug
  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    const key = item.category ?? "general";
    grouped[key] = grouped[key] ?? [];
    grouped[key].push(item);
  }

  const sectionsWithItems = sections.filter((s) => grouped[s.slug]?.length);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-bone text-iron">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Resources</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6rem)]">
            Take, read,
            <br />
            <span className="text-brass">use it Tuesday.</span>
          </h1>
          <p className="mt-10 max-w-2xl font-pullquote text-xl italic leading-relaxed text-iron/70 md:text-2xl">
            Studies, leader guides, workout plans, devotionals. Free. Download
            anything. Bring it to your group.
          </p>
        </div>
      </section>

      {/* Section nav (anchors) */}
      {sectionsWithItems.length > 1 && (
        <nav className="sticky top-16 z-20 border-b border-iron/10 bg-bone/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-6 md:px-12">
            <ul className="flex gap-1 overflow-x-auto py-3">
              {sectionsWithItems.map((s) => (
                <li key={s.slug}>
                  <a
                    href={`#${s.slug}`}
                    className="inline-flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-iron/60 transition-colors hover:text-brass"
                  >
                    <Icon
                      name={(s.icon as IconName) || "scroll"}
                      size={14}
                      className="text-brass"
                    />
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}

      {/* Sections */}
      <section className="bg-bone text-iron">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-24">
          {sectionsWithItems.length === 0 ? (
            <div className="border border-dashed border-iron/15 p-16 text-center">
              <Icon name="scroll" size={48} className="mx-auto text-brass" />
              <h2 className="display-xl mt-8 text-2xl text-iron md:text-3xl">
                The library is being filled.
              </h2>
              <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-iron/60">
                First studies and guides are being uploaded. Check back soon, or
                start a group with what you already have.
              </p>
            </div>
          ) : (
            sectionsWithItems.map((section) => {
              const sectionItems = grouped[section.slug] ?? [];
              return (
                <div
                  key={section.slug}
                  id={section.slug}
                  className="mb-20 scroll-mt-32 last:mb-0 md:mb-28"
                >
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <Icon
                          name={(section.icon as IconName) || "scroll"}
                          size={28}
                          className="text-brass"
                        />
                        <h2 className="display-xl text-3xl text-iron md:text-5xl">
                          {section.name}
                        </h2>
                      </div>
                      {section.description && (
                        <p className="mt-3 max-w-xl font-pullquote text-base italic text-iron/65 md:text-lg">
                          {section.description}
                        </p>
                      )}
                    </div>
                    <span className="section-mark text-iron/45">
                      {sectionItems.length}{" "}
                      {sectionItems.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <div className="hairline mt-8" />
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sectionItems.map((item) => (
                      <li key={item.id}>
                        <ResourceCard item={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center md:px-12 md:py-28">
          <h2 className="display-xl text-3xl md:text-5xl">
            Got something to share?
          </h2>
          <p className="mx-auto mt-6 max-w-md font-pullquote text-lg italic leading-relaxed text-stone">
            Send us a study or guide. If it helps the brotherhood, we will
            publish it.
          </p>
          <Link
            href="/contact"
            className="lift mt-10 inline-flex h-11 items-center gap-2 border border-bone bg-bone px-6 text-sm font-medium text-iron transition-colors hover:bg-stone"
          >
            Contribute a resource
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}

function ResourceCard({
  item,
}: {
  item: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    url: string | null;
    fileKey: string | null;
    level: string | null;
  };
}) {
  const downloadUrl = item.fileKey || item.url || "#";
  const isDownload = !!item.fileKey;
  return (
    <a
      href={downloadUrl}
      target={isDownload ? "_self" : "_blank"}
      rel={isDownload ? undefined : "noopener noreferrer"}
      download={isDownload || undefined}
      className="lift group/card flex h-full flex-col border border-iron/10 bg-bone p-6 transition-colors hover:border-brass"
    >
      <div className="flex items-start justify-between gap-3">
        <Icon
          name={isDownload ? "download" : "arrow-up-right"}
          size={18}
          className="text-brass"
        />
        {item.level && item.level !== "all" && (
          <span className="section-mark text-iron/40">{item.level}</span>
        )}
      </div>
      <h3 className="display-xl mt-6 text-lg text-iron md:text-xl">
        {item.title}
      </h3>
      {item.description && (
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-iron/70">
          {item.description}
        </p>
      )}
      <div className="mt-6 inline-flex items-center gap-2 section-mark text-brass">
        {isDownload ? "Download" : "Open"}
        <Icon
          name="arrow-right"
          size={12}
          className="transition-transform group-hover/card:translate-x-1"
        />
      </div>
    </a>
  );
}
