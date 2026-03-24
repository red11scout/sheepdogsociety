import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Utensils, Calendar, Mountain, Users, Info } from "lucide-react";

export const metadata = {
  title: "How We Gather — SheepDog Society",
  description: "Weekly studies, monthly meals, quarterly gatherings, and annual camping — how Sheepdog Society men connect.",
};

export default function HowWeGatherPage() {
  return (
    <>
      <section className="bg-card px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Users className="mx-auto mb-4 h-10 w-10 text-bronze" />
          <h1 className="text-3xl font-bold sm:text-4xl">How We Gather</h1>
          <p className="mt-2 text-muted-foreground">
            Four rhythms of connection — weekly, monthly, quarterly, and
            annually.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Weekly */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-bronze/10 p-2.5">
                  <BookOpen className="h-6 w-6 text-bronze" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Weekly Studies</h2>
                  <p className="text-sm text-muted-foreground">The Core — Every Week</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                Small groups of 2-12 men meet weekly at a consistent time and place.
                This is the heartbeat of Sheepdog Society. Each man reads Scripture aloud.
                We discuss what God is showing us, challenge each other, and end with
                a Circle of Prayer.
              </p>
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                <li>- Group size: 2-12 men (ideal range)</li>
                <li>- Each man reads aloud from Scripture</li>
                <li>- Open discussion on real-life application</li>
                <li>- Every gathering ends with Circle of Prayer (COP)</li>
                <li>- Any man is welcome to lead</li>
              </ul>
            </CardContent>
          </Card>

          {/* Monthly */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-bronze/10 p-2.5">
                  <Utensils className="h-6 w-6 text-bronze" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Monthly Meals</h2>
                  <p className="text-sm text-muted-foreground">Break Bread Together — Every Month</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                Once a month, break bread with your brothers. Share a meal, deepen
                relationships, and connect beyond the study. You can combine with
                another local small group if you want to expand the fellowship.
              </p>
            </CardContent>
          </Card>

          {/* Quarterly */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-bronze/10 p-2.5">
                  <Calendar className="h-6 w-6 text-bronze" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Quarterly Gatherings</h2>
                  <p className="text-sm text-muted-foreground">All Groups Converge — Every Quarter</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                Four times a year, all local small groups gather for a convergence.
                These are bigger events with guest speakers, group leaders sharing
                stories, competitions, cookouts, and food trucks. A time to see the
                larger brotherhood and be reminded you&apos;re part of something bigger.
              </p>
            </CardContent>
          </Card>

          {/* Annual */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-bronze/10 p-2.5">
                  <Mountain className="h-6 w-6 text-bronze" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Annual Conference & Camping</h2>
                  <p className="text-sm text-muted-foreground">The Big Gathering — Every Year</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                Once a year, we head to the wilderness. Campfires under the stars.
                Stories of transformation. Teaching that goes deep. This is our
                annual retreat — time away from the noise to hear God clearly and
                bond with brothers from across the region.
              </p>
            </CardContent>
          </Card>

          {/* Group Size Guidelines */}
          <Card className="border-bronze/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Info className="h-5 w-5 text-bronze" />
                <h3 className="font-bold">Group Size Guidelines</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Ideal size: 2-12 men.</strong>{" "}
                  Small enough for real conversation, large enough for iron to sharpen iron.
                </li>
                <li>
                  <strong className="text-foreground">If you routinely get over 12, split into two groups.</strong>{" "}
                  Don&apos;t split because you had 20 show up one weekend — split when it&apos;s consistently over 12.
                </li>
                <li>
                  <strong className="text-foreground">During a split,</strong>{" "}
                  apply for a new location and identify new leadership. This creates more leaders and extends the brotherhood.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
