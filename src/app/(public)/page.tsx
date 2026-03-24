import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  Users,
  Heart,
  BookOpen,
  MapPin,
  Calendar,
  Utensils,
  Mountain,
} from "lucide-react";

export const metadata = {
  title: "SheepDog Society — Stand Guard. Protect the Flock.",
  description:
    "A brotherhood of men rooted in faith, gathering weekly to study Scripture, sharpen one another, and live out Acts 20:28.",
};

export default function PublicHomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background to-card px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 lg:flex-row">
          <div className="flex-1 space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-bronze/30 bg-bronze/10 px-3 py-1 text-sm text-bronze">
              <Shield className="h-3.5 w-3.5" />
              Transformed by Grace
            </span>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Stand Guard.
              <br />
              Protect the Flock.
              <br />
              Live with Purpose.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              We are men of faith who embrace the protector calling. We stand
              between wolves and sheep. We guard what matters. We live ready.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/get-started">Join the Brotherhood</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/locations">Find a Location</Link>
              </Button>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Sheepdog Society Shield"
              width={400}
              height={400}
              className="h-48 w-48 drop-shadow-xl sm:h-64 sm:w-64 lg:h-[400px] lg:w-[400px]"
              priority
            />
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-card px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold">
            Brothers of the Sheepdog Society, Welcome!
          </h2>
          <p className="mt-4 text-muted-foreground">
            We gather as men who recognize a hard truth: every one of us was
            born a sinner. But by His sovereign grace, through the power of the
            Gospel, He transforms wolves into sheepdogs under the Great
            Shepherd, Jesus Christ.
          </p>
        </div>
      </section>

      {/* Foundation */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-bronze/30 bg-bronze/10 px-3 py-1 text-sm text-bronze">
            Our Foundation
          </span>
          <h2 className="mt-4 text-3xl font-bold">Acts 20:28</h2>
          <blockquote className="mt-6 border-l-4 border-bronze pl-6 text-left font-scripture text-lg italic">
            &ldquo;Keep watch over yourselves and all the flock of which the
            Holy Spirit has made you overseers. Be shepherds of the church of
            God, which he bought with his own blood.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* Why We Exist */}
      <section className="bg-card px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold">Why We Exist</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            To be transformed wolves turned sheepdogs, living out Acts 20:28
            with fearless faith.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <Shield className="mb-3 h-10 w-10 text-bronze" />
                <h3 className="text-lg font-bold">Protect</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We guard our faith, families, and communities against
                  spiritual and physical threats.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <Users className="mb-3 h-10 w-10 text-bronze" />
                <h3 className="text-lg font-bold">Fellowship</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We sharpen one another through brotherhood, training, and
                  shared burdens.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <Heart className="mb-3 h-10 w-10 text-bronze" />
                <h3 className="text-lg font-bold">Serve</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We lead with sacrificial love as protectors, providers, and
                  under-shepherds.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How We Gather */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold">How We Gather</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {[
              {
                icon: BookOpen,
                title: "Weekly Studies",
                freq: "Every Week",
                desc: "We meet weekly to dig deep into Scripture. Small groups. Hard questions. Real answers. Men challenging men to grow.",
              },
              {
                icon: Utensils,
                title: "Monthly Meals",
                freq: "Every Month",
                desc: "Once a month, we break bread together. Good food. Good fellowship. Time to connect beyond the study.",
              },
              {
                icon: Calendar,
                title: "Quarterly Gatherings",
                freq: "Every Quarter",
                desc: "Four times a year, we gather the whole brotherhood. Worship. Teaching. Vision casting.",
              },
              {
                icon: Mountain,
                title: "Annual Camping",
                freq: "Every Year",
                desc: "Once a year, we head to the wilderness. Campfires. Stars. Stories. Time away from the noise to hear God clearly.",
              },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-bronze/10 p-2">
                      <item.icon className="h-5 w-5 text-bronze" />
                    </div>
                    <div>
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {item.freq}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-card to-background px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-scripture text-2xl font-bold italic text-bronze">
            Let&apos;s go forth as sheepdogs under the Shepherd of God — fierce,
            faithful, and forever His.
          </h2>
          <p className="mt-4 text-lg font-bold">Glory to God!</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/get-started">Join the Brotherhood</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/blog">Read the Yarn</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/locations">
                <MapPin className="mr-2 h-4 w-4" />
                Find a Location
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
