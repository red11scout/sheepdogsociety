export const dynamic = "force-dynamic";

import { db } from "@/db";
import { devotionals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

export default async function DevotionalDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  const [devotional] = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.date, date));

  if (!devotional) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-bronze" />
            {devotional.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {devotional.date} — {devotional.scriptureReference}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-line leading-relaxed">
            {devotional.content}
          </p>

          {devotional.prayerPrompt && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Prayer</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {devotional.prayerPrompt}
              </p>
            </div>
          )}

          {devotional.discussionQuestions && (
            <div>
              <p className="text-sm font-medium mb-2">Discussion Questions</p>
              <ul className="space-y-2">
                {(devotional.discussionQuestions as string[]).map((q, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {i + 1}. {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
