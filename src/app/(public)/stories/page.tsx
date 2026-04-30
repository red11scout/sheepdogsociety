export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/db";
import { testimonies, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { format } from "date-fns";
import { Icon } from "@/components/icons/Icon";

export const metadata = {
  title: "Stories — Sheepdog Society",
  description:
    "Real stories of transformation from brothers across the Sheepdog Society.",
};

export default async function StoriesPage() {
  const stories = await db
    .select({
      id: testimonies.id,
      title: testimonies.title,
      content: testimonies.content,
      createdAt: testimonies.createdAt,
      authorFirstName: users.firstName,
    })
    .from(testimonies)
    .leftJoin(users, eq(testimonies.userId, users.id))
    .where(eq(testimonies.isApproved, true))
    .orderBy(desc(testimonies.createdAt))
    .limit(20);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-bone text-iron">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Stories</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6rem)]">
            Wolves transformed.
            <br />
            <span className="text-brass">Sheepdogs sent.</span>
          </h1>
          <p className="mt-10 max-w-2xl font-pullquote text-xl italic leading-relaxed text-iron/70 md:text-2xl">
            Real stories from brothers across the Sheepdog Society.
          </p>
        </div>
      </section>

      {/* Stories grid */}
      <section className="bg-bone text-iron">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-28">
          {stories.length > 0 ? (
            <div className="grid gap-px bg-iron/10 md:grid-cols-2">
              {stories.map((story) => (
                <article
                  key={story.id}
                  className="group/c lift border-0 bg-bone p-10 transition-colors md:p-12"
                >
                  <div className="flex items-start justify-between gap-4">
                    <Icon
                      name="flame"
                      size={28}
                      strokeWidth={2}
                      className="text-brass"
                    />
                    <span className="section-mark text-iron/40">
                      {format(new Date(story.createdAt), "MMM yyyy")}
                    </span>
                  </div>
                  <h3 className="display-xl mt-10 text-2xl text-iron md:text-3xl">
                    {story.title}
                  </h3>
                  <p className="mt-4 line-clamp-5 text-base leading-relaxed text-iron/70">
                    {story.content.slice(0, 240)}
                    {story.content.length > 240 ? "..." : ""}
                  </p>
                  <div className="mt-8 flex items-center justify-between">
                    <span className="section-mark text-brass">
                      {story.authorFirstName || "A brother"}
                    </span>
                    <Icon
                      name="arrow-up-right"
                      size={16}
                      className="text-iron/30 transition-all group-hover/c:translate-x-0.5 group-hover/c:-translate-y-0.5 group-hover/c:text-brass"
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-iron/15 p-16 text-center">
              <Icon
                name="flame"
                size={48}
                strokeWidth={2}
                className="mx-auto text-brass"
              />
              <h3 className="display-xl mt-8 text-2xl text-iron md:text-3xl">
                Stories on the way.
              </h3>
              <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-iron/60">
                Brothers are writing them now.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center md:px-12 md:py-40">
          <h2 className="display-xl text-3xl text-bone md:text-5xl">
            Have a story?
          </h2>
          <p className="mx-auto mt-6 max-w-xl font-pullquote text-xl italic leading-relaxed text-stone md:text-2xl">
            Send it to us. We share what God has done.
          </p>
          <div className="mt-12">
            <Link
              href="/contact"
              className="lift inline-flex h-12 items-center gap-2 border border-bone bg-bone px-8 text-base font-medium text-iron transition-colors hover:bg-stone"
            >
              Share your story
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
