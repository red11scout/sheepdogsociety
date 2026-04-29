import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { IssueKicker } from "@/components/public/issue-kicker";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ResourcePage({ params }: PageProps) {
  const { slug } = await params;
  let resource: typeof resources.$inferSelect | undefined;
  try {
    [resource] = await db
      .select()
      .from(resources)
      .where(and(eq(resources.id, slug), eq(resources.isPublic, true)))
      .limit(1);
  } catch {
    resource = undefined;
  }
  if (!resource) notFound();

  return (
    <article className="px-6 pt-16 pb-24">
      <div className="mx-auto max-w-3xl">
        <IssueKicker
          parts={[
            "Resource",
            resource.type,
            resource.category || null,
            resource.level && resource.level !== "all" ? resource.level : null,
          ]}
        />
        <h1 className="mt-4 font-display text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
          {resource.title}
        </h1>

        {resource.description ? (
          <p className="mt-8 font-body text-[19px] leading-[1.65] text-iron whitespace-pre-line">
            {resource.description}
          </p>
        ) : null}

        {resource.url ? (
          <div className="mt-10">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-iron px-7 py-3 font-body font-semibold text-bone hover:bg-navy transition-colors"
            >
              Open resource →
            </a>
          </div>
        ) : null}

        <footer className="mt-16 pt-8 border-t border-stone">
          <Link
            href="/resources"
            className="font-body text-sm text-brass hover:text-iron underline underline-offset-4"
          >
            ← All resources
          </Link>
        </footer>
      </div>
    </article>
  );
}
