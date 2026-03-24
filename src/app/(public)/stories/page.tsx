export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/db";
import { testimonies, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, User } from "lucide-react";
import { format } from "date-fns";

export const metadata = {
  title: "Stories — SheepDog Society",
  description: "Real stories of transformation from Sheepdog Society brothers.",
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
      <section className="bg-card px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-bronze" />
          <h1 className="text-3xl font-bold sm:text-4xl">Stories</h1>
          <p className="mt-2 text-muted-foreground">
            Real stories of transformation from brothers in the Sheepdog
            Society.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl">
          {stories.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {stories.map((story) => (
                <Card key={story.id}>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold">{story.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-4">
                      {story.content.slice(0, 200)}
                      {story.content.length > 200 ? "..." : ""}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>
                        {story.authorFirstName || "A brother"}
                      </span>
                      <span>·</span>
                      <span>
                        {format(new Date(story.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-bold">No stories yet</h3>
              <p className="mt-1 text-muted-foreground">
                Be the first to share your story of transformation.
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              Have a story to share? Sign in to submit your testimony.
            </p>
            <Button asChild variant="outline" className="mt-3">
              <Link href="/sign-in">Share Your Story</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
