export const dynamic = "force-dynamic";

import { db } from "@/db";
import { devotionals } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

export default async function DevotionalsPage() {
  const allDevotionals = await db
    .select()
    .from(devotionals)
    .orderBy(desc(devotionals.date))
    .limit(30);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayDevotional = allDevotionals.find((d) => d.date === today);
  const pastDevotionals = allDevotionals.filter((d) => d.date !== today);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Devotionals</h1>

      {todayDevotional ? (
        <Card className="border-bronze/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-bronze" />
              Today — {todayDevotional.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              {todayDevotional.scriptureReference}
            </p>
            <p className="whitespace-pre-line leading-relaxed">
              {todayDevotional.content}
            </p>
            {todayDevotional.prayerPrompt && (
              <div className="mt-4 rounded-lg bg-muted p-4">
                <p className="text-sm font-medium">Prayer</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {todayDevotional.prayerPrompt}
                </p>
              </div>
            )}
            {todayDevotional.discussionQuestions && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Discussion</p>
                <ul className="space-y-1">
                  {(todayDevotional.discussionQuestions as string[]).map(
                    (q, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {i + 1}. {q}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No devotional for today yet.
          </CardContent>
        </Card>
      )}

      {pastDevotionals.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Past Devotionals</h2>
          <div className="space-y-2">
            {pastDevotionals.map((d) => (
              <Link key={d.id} href={`/devotionals/${d.date}`}>
                <Card className="transition-colors hover:bg-secondary/30">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{d.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.scriptureReference}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{d.date}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
