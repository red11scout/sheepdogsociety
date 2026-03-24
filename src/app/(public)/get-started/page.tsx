import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  DollarSign,
  Users,
  HandHeart,
  Heart,
  Cross,
  MapPin,
  MessageCircle,
} from "lucide-react";

export const metadata = {
  title: "Get Started — SheepDog Society",
  description:
    "New to Sheepdog Society? Learn about our core principles, what to expect, and how to join a group near you.",
};

const principles = [
  {
    icon: DollarSign,
    title: "Free of Charge",
    desc: "Always free. No dues, no fees, no cost. This is a gift of brotherhood.",
  },
  {
    icon: Users,
    title: "Open to All Men",
    desc: "Every man is welcome regardless of background, denomination, or where he is in his walk.",
  },
  {
    icon: HandHeart,
    title: "Peer Led",
    desc: "No hierarchy. Any man can lead. We sharpen each other as equals before God.",
  },
  {
    icon: Heart,
    title: "Ends with Circle of Prayer",
    desc: "Every gathering closes with a COP — a Circle of Prayer where we lift each other up.",
  },
  {
    icon: Cross,
    title: "Christ-Centered",
    desc: "Jesus is our leader and foundation. Scripture is our guide. The Gospel is our hope.",
  },
];

export default function GetStartedPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-card px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-bronze" />
          <h1 className="text-3xl font-bold sm:text-4xl">
            New to Sheepdog Society?
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Welcome, brother. Sheepdog Society is a brotherhood of men gathering
            weekly in small groups to study Scripture, sharpen one another, and
            live out our calling as protectors of the faith.
          </p>
        </div>
      </section>

      {/* 5 Core Principles */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Our 5 Core Principles
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((p) => (
              <Card key={p.title}>
                <CardContent className="p-5">
                  <p.icon className="mb-2 h-8 w-8 text-bronze" />
                  <h3 className="font-bold">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="bg-card px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold">
            What to Expect
          </h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bronze/10 text-bronze font-bold">
                1
              </div>
              <div>
                <h3 className="font-bold">Weekly Study</h3>
                <p className="text-sm text-muted-foreground">
                  Groups of 2-12 men meet weekly at a set time and place. Each
                  man reads aloud from Scripture. We discuss, challenge, and
                  encourage one another.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bronze/10 text-bronze font-bold">
                2
              </div>
              <div>
                <h3 className="font-bold">Communication via Signal</h3>
                <p className="text-sm text-muted-foreground">
                  Groups use the Signal app for secure, private communication
                  between meetings. Share prayer requests, coordinate, and stay
                  connected.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bronze/10 text-bronze font-bold">
                3
              </div>
              <div>
                <h3 className="font-bold">Circle of Prayer (COP)</h3>
                <p className="text-sm text-muted-foreground">
                  Every gathering ends with men standing together in prayer.
                  This is where burdens are shared and lifted. Confidential.
                  Sacred. Powerful.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Join */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-2xl font-bold">How to Join</h2>
          <p className="mb-8 text-muted-foreground">
            It&apos;s simple. No application. No interview. Just show up.
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <MapPin className="mx-auto h-8 w-8 text-bronze" />
              <h3 className="font-bold">Find a Location</h3>
              <p className="text-sm text-muted-foreground">
                Use our map to find a group near you.
              </p>
            </div>
            <div className="space-y-2">
              <Users className="mx-auto h-8 w-8 text-bronze" />
              <h3 className="font-bold">Show Up</h3>
              <p className="text-sm text-muted-foreground">
                Come as you are. No prep required. Just be present.
              </p>
            </div>
            <div className="space-y-2">
              <MessageCircle className="mx-auto h-8 w-8 text-bronze" />
              <h3 className="font-bold">Be Yourself</h3>
              <p className="text-sm text-muted-foreground">
                Be honest. Be real. This is a safe place for men.
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/locations">Find a Location</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/locations/request">Start a Group</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
