import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Church, Users, Globe, GraduationCap, Dumbbell, Handshake } from "lucide-react";

export const metadata = {
  title: "Partnerships — SheepDog Society",
  description: "Partner with Sheepdog Society through your church, men's group, community, school, or athletic team.",
};

const partnerships = [
  {
    icon: Church,
    title: "Through a Church",
    desc: "Partner your church's men's ministry with the Sheepdog framework. We provide the structure, study guides, and support. Your church provides the men and the meeting space. It's a natural extension of what many churches already do.",
  },
  {
    icon: Users,
    title: "Existing Men's Group",
    desc: "Already have a men's group? Adopt the Sheepdog format — weekly Scripture study, peer-led discussions, Circle of Prayer. We'll help you integrate our resources and connect your group to the larger brotherhood.",
  },
  {
    icon: Globe,
    title: "Community Group",
    desc: "Start a community-based group outside of a church setting. Meet at a coffee shop, a park, a gym, or someone's home. All you need is two men and a Bible. We'll help you get started.",
  },
  {
    icon: GraduationCap,
    title: "School or College",
    desc: "Launch a Sheepdog group for young men at your school, college, or university. We're building the next generation — the Young Pups. Same principles, same format, tailored for younger men.",
  },
  {
    icon: Dumbbell,
    title: "Athletics",
    desc: "Incorporate faith-based study with your athletic team or fitness group. Train the body and the spirit. Many groups pair a workout with their weekly study — iron sharpening iron in every sense.",
  },
];

export default function PartnershipsPage() {
  return (
    <>
      <section className="bg-card px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Handshake className="mx-auto mb-4 h-10 w-10 text-bronze" />
          <h1 className="text-3xl font-bold sm:text-4xl">
            Partner with Sheepdog
          </h1>
          <p className="mt-2 text-muted-foreground">
            There are many ways to bring the Sheepdog brotherhood to your
            community.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {partnerships.map((p) => (
            <Card key={p.title}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="shrink-0 rounded-lg bg-bronze/10 p-3">
                    <p.icon className="h-6 w-6 text-bronze" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold">{p.title}</h2>
                    <p className="mt-1 text-muted-foreground">{p.desc}</p>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="mt-3"
                    >
                      <Link href="/contact">Learn More</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
