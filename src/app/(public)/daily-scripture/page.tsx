export const dynamic = "force-dynamic";

import { db } from "@/db";
import { scriptureOfDay, devotionals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { format } from "date-fns";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Calendar,
  MessageSquareQuote,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export const metadata = {
  title: "Daily Scripture — SheepDog Society",
  description:
    "Start each day grounded in God's Word. Daily scripture readings, devotionals, and discussion questions for men of faith.",
};

export default async function DailyScripturePage() {
  const today = format(new Date(), "yyyy-MM-dd");

  const [todayScripture] = await db
    .select()
    .from(scriptureOfDay)
    .where(eq(scriptureOfDay.date, today));

  const [todayDevotional] = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.date, today));

  const recentScriptures = await db
    .select()
    .from(scriptureOfDay)
    .orderBy(desc(scriptureOfDay.date))
    .limit(14);

  // Filter out today from the recent list for the grid
  const pastScriptures = recentScriptures.filter((s) => s.date !== today);

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:px-6">
      {/* Hero Section */}
      <div className="text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-bronze/30 bg-bronze/10 px-4 py-1.5 text-sm text-bronze">
          <BookOpen className="h-4 w-4" />
          Daily Scripture
        </div>
        <h1 className="text-3xl font-bold sm:text-4xl">
          Today&apos;s Word
        </h1>
        <p className="mt-2 text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Today's Scripture */}
      {todayScripture ? (
        <Card className="border-bronze/30">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-bronze sm:text-2xl">
                {todayScripture.reference}
              </h2>
              <Badge variant="secondary">{todayScripture.translation}</Badge>
            </div>

            {todayScripture.text && (
              <blockquote className="border-l-4 border-bronze/40 pl-4 font-scripture text-lg italic leading-[1.8] sm:pl-6 sm:text-xl">
                {todayScripture.text}
              </blockquote>
            )}

            {todayScripture.theme && (
              <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-bronze" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Theme
                  </p>
                  <p className="mt-1">{todayScripture.theme}</p>
                </div>
              </div>
            )}

            {todayScripture.reflection && (
              <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
                <MessageSquareQuote className="mt-0.5 h-5 w-5 shrink-0 text-bronze" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Reflection
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {todayScripture.reflection}
                  </p>
                </div>
              </div>
            )}

            {todayScripture.seriesName && (
              <p className="text-sm text-muted-foreground">
                Part of the{" "}
                <span className="font-medium text-foreground">
                  {todayScripture.seriesName}
                </span>{" "}
                series
                {todayScripture.dayInSeries != null &&
                  ` — Day ${todayScripture.dayInSeries}`}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-bronze/50" />
            <h2 className="text-lg font-semibold">
              Today&apos;s scripture is being prepared
            </h2>
            <p className="mt-2 max-w-md mx-auto text-muted-foreground">
              Check back soon. In the meantime, open your Bible to wherever
              God leads you today. His Word never returns void.
            </p>
            <p className="mt-4 font-scripture italic text-muted-foreground">
              &ldquo;Your word is a lamp to my feet and a light to my
              path.&rdquo; &mdash; Psalm 119:105
            </p>
          </CardContent>
        </Card>
      )}

      {/* Today's Devotional */}
      {todayDevotional && (
        <>
          <Separator />
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Today&apos;s Devotional</h2>

            <Card>
              <CardContent className="space-y-5 p-6 sm:p-8">
                <h3 className="text-xl font-bold">{todayDevotional.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {todayDevotional.scriptureReference}
                </p>
                <p className="whitespace-pre-line leading-relaxed">
                  {todayDevotional.content}
                </p>

                {todayDevotional.prayerPrompt && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Prayer Prompt
                    </p>
                    <p className="leading-relaxed text-muted-foreground">
                      {todayDevotional.prayerPrompt}
                    </p>
                  </div>
                )}

                {todayDevotional.discussionQuestions &&
                  (todayDevotional.discussionQuestions as string[]).length >
                    0 && (
                    <div>
                      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Discussion Questions
                      </p>
                      <ol className="space-y-2">
                        {(todayDevotional.discussionQuestions as string[]).map(
                          (q, i) => (
                            <li
                              key={i}
                              className="flex gap-3 text-muted-foreground"
                            >
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bronze/10 text-xs font-semibold text-bronze">
                                {i + 1}
                              </span>
                              <span className="leading-relaxed">{q}</span>
                            </li>
                          )
                        )}
                      </ol>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Past 14 Days */}
      {pastScriptures.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="mb-4 text-2xl font-bold">Recent Scriptures</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {pastScriptures.map((s) => {
                const dateObj = new Date(s.date + "T12:00:00");
                return (
                  <Link
                    key={s.id}
                    href={`/daily-scripture?date=${s.date}`}
                    className="group"
                  >
                    <Card className="h-full transition-colors hover:border-bronze/30">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-center">
                          <span className="text-xs font-medium uppercase text-muted-foreground">
                            {format(dateObj, "MMM")}
                          </span>
                          <span className="text-lg font-bold leading-tight">
                            {format(dateObj, "d")}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-bronze">
                            {s.reference}
                          </p>
                          {s.theme && (
                            <p className="truncate text-sm text-muted-foreground">
                              {s.theme}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
