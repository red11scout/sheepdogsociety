import { Card, CardContent } from "@/components/ui/card";
import { Shield, BookOpen, Heart, Users } from "lucide-react";

export const metadata = {
  title: "About — SheepDog Society",
  description: "Learn about Sheepdog Society — our mission, leadership model, and what we believe.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-card px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-bronze" />
          <h1 className="text-3xl font-bold sm:text-4xl">
            About Sheepdog Society
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            A brotherhood of men rooted in honorable Christian values, driven to
            be prepared in every aspect of life.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-xl font-bold">Our Mission</h2>
              <p className="text-muted-foreground">
                We are a brotherhood and network of like-minded men, rooted in
                honorable Christian values and moral codes, driven to be prepared
                in every aspect of life. We protect our faith, our families,
                ourselves, and anyone in need. We educate, communicate, and
                demonstrate faith through leadership and fellowship — with
                boldness, authority, strength, and grace.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Acts 20:28 */}
      <section className="bg-card px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold">Our Foundation: Acts 20:28</h2>
          <blockquote className="mx-auto mt-6 max-w-2xl border-l-4 border-bronze pl-6 text-left font-scripture text-lg italic">
            &ldquo;Keep watch over yourselves and all the flock of which the
            Holy Spirit has made you overseers. Be shepherds of the church of
            God, which he bought with his own blood.&rdquo;
          </blockquote>
          <p className="mt-6 text-muted-foreground">
            Acts 20:28 is a call for all men to keep watch, shepherd, train, and
            be ready — as we are all called by Christ to be the shepherds over
            our flock, our church, our families, our wives, our kids. This is
            not a passive calling. It demands vigilance, courage, and
            faithfulness.
          </p>
        </div>
      </section>

      {/* Leadership Model */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-bold">
            Leadership: A Starfish, Not a Spider
          </h2>
          <p className="text-center text-muted-foreground">
            Our leadership revolves around no single man — it revolves around
            Jesus Christ. We follow a decentralized model where every man is
            empowered and confident to lead. If you cut off a leg of a starfish,
            it grows back. That&apos;s us. No single point of failure. Every
            group stands on its own, connected by shared faith and mission.
          </p>
        </div>
      </section>

      {/* What We Believe */}
      <section className="bg-card px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-2xl font-bold">
            What We Believe
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <BookOpen className="mb-3 h-10 w-10 text-bronze" />
                <h3 className="font-bold">Scripture Is Our Guide</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  The Bible is our foundation. We study it, discuss it, and live
                  it out together — not as scholars, but as men seeking truth.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <Heart className="mb-3 h-10 w-10 text-bronze" />
                <h3 className="font-bold">Grace Transforms</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  By God&apos;s grace, wolves become sheepdogs. Our strength is
                  redeemed — not to destroy, but to protect and serve.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <Users className="mb-3 h-10 w-10 text-bronze" />
                <h3 className="font-bold">Brotherhood Sharpens</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Iron sharpens iron. We are stronger together — carrying
                  burdens, challenging complacency, building each other up.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-2xl font-bold">Our Culture</h2>
          <div className="space-y-3 text-left text-muted-foreground">
            <p>
              <strong className="text-foreground">Safe brotherhood.</strong> What
              is shared stays confidential. This is a place where men can be
              real.
            </p>
            <p>
              <strong className="text-foreground">No conflict.</strong> We steer
              away from controversy, complicated subjects, and church politics.
              We focus on everyday issues men face.
            </p>
            <p>
              <strong className="text-foreground">Christ-centered.</strong> Every
              discussion points back to Jesus. He is our leader, our model, our
              hope.
            </p>
            <p>
              <strong className="text-foreground">Keep it simple.</strong> We
              want any man — young or old — to feel confident walking in and
              participating. No barriers.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
