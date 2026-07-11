export const dynamic = "force-dynamic";

import { Fragment } from "react";
import Link from "next/link";
import { db } from "@/db";
import { testimonies, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { format } from "date-fns";
import { Icon } from "@/components/icons/Icon";
import { Kicker } from "@/components/public/kicker";
import { getSiteTextMap } from "@/lib/site-text/get";
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge } from "@/lib/studio/config";

export const metadata = {
  title: "Stories — Sheepdog Society",
  description:
    "Real stories of transformation from brothers across the Sheepdog Society.",
};

async function getStories() {
  // try/catch added in Phase 2: this was the only public page that threw
  // on a DB hiccup instead of degrading (recon §8).
  try {
    return await db
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
  } catch {
    return [];
  }
}

export default async function StoriesPage() {
  const [stories, t, config] = await Promise.all([
    getStories(),
    getSiteTextMap(),
    getStudioConfig(),
  ]);

  const sections: Record<string, React.ReactNode> = {
    hero: (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 md:px-10 md:pt-24">
          <Kicker left="Stories" right="Told plain" />
          <h1 className="display-xl mt-10 text-display-xl">
            {t["stories.hero.headline1"]}
            <br />
            <em>{t["stories.hero.headline2"]}</em>
          </h1>
          <p className="mt-8 max-w-2xl font-pullquote text-lede italic text-muted-foreground">
            Real stories from brothers across the Sheepdog Society.
          </p>
        </div>
      </section>
    ),
    "stories-ledger": (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-6 pb-20 md:px-10 md:pb-28">
          {stories.length > 0 ? (
            <ul className="divide-y divide-foreground/10 border-y border-foreground/15">
              {stories.map((story) => (
                <li key={story.id} className="py-10">
                  <article>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="section-mark">
                        {story.authorFirstName || "A brother"}
                      </span>
                      <span className="folio">
                        {format(new Date(story.createdAt), "MMM yyyy")}
                      </span>
                    </div>
                    <h3 className="display-soft mt-4 text-2xl md:text-3xl">
                      {story.title}
                    </h3>
                    <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">
                      {story.content.slice(0, 240)}
                      {story.content.length > 240 ? "..." : ""}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border border-dashed border-foreground/15 p-16 text-center">
              <Icon name="flame" size={48} strokeWidth={2} className="mx-auto text-brass" />
              <h3 className="display-soft mt-8 text-2xl md:text-3xl">
                Stories on the way.
              </h3>
              <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-muted-foreground">
                Brothers are writing them now.
              </p>
            </div>
          )}
        </div>
      </section>
    ),
    cta: (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl border-t border-foreground/15 px-6 py-20 text-center md:px-10 md:py-28">
          <h2 className="display-xl text-display-md">{t["stories.cta.title"]}</h2>
          <p className="mx-auto mt-6 max-w-xl font-pullquote text-lede italic text-muted-foreground">
            Send it to us. We share what God has done.
          </p>
          <div className="mt-10">
            <Link
              href="/contact"
              className="lift inline-flex h-12 items-center gap-2 bg-foreground px-8 text-base font-medium text-background"
            >
              Share your story
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <>
      {renderMerge("stories", config)
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{sections[s.id]}</Fragment>
        ))}
    </>
  );
}
