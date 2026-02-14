export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, scriptureOfDay, devotionals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Heart, Shield } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser) redirect("/sign-in");
  if (currentUser.status === "pending") redirect("/pending");

  const today = format(new Date(), "yyyy-MM-dd");

  const [todayScripture] = await db
    .select()
    .from(scriptureOfDay)
    .where(eq(scriptureOfDay.date, today));

  const [todayDevotional] = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.date, today));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {currentUser.firstName || "brother"}.
        </h1>
        <p className="mt-1 text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {todayScripture && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-bronze" />
              Scripture of the Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-scripture text-lg italic">
              {todayScripture.text}
            </p>
            <p className="mt-2 text-sm font-medium text-bronze">
              — {todayScripture.reference} ({todayScripture.translation})
            </p>
            {todayScripture.reflection && (
              <p className="mt-3 text-muted-foreground">
                {todayScripture.reflection}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {todayDevotional && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-bronze" />
              {todayDevotional.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">{todayDevotional.content}</p>
            {todayDevotional.prayerPrompt && (
              <div className="mt-4 rounded-lg bg-muted p-4">
                <p className="text-sm font-medium">Prayer</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {todayDevotional.prayerPrompt}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!todayScripture && !todayDevotional && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Shield className="h-12 w-12 text-primary" />
            <h2 className="text-xl font-bold">Sheepdog Society</h2>
            <p className="text-muted-foreground">
              Iron sharpens iron. Stand guard. Walk in faith.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
