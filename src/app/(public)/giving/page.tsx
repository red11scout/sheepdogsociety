import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, CreditCard, Mail, Handshake } from "lucide-react";

export const metadata = {
  title: "Give — SheepDog Society",
  description: "Support the Sheepdog Society mission. Learn why we give and how you can partner with us.",
};

export default function GivingPage() {
  return (
    <>
      <section className="bg-card px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Heart className="mx-auto mb-4 h-10 w-10 text-bronze" />
          <h1 className="text-3xl font-bold sm:text-4xl">Give</h1>
          <p className="mt-2 text-muted-foreground">
            Support the mission. Fuel the brotherhood.
          </p>
        </div>
      </section>

      {/* Why We Give */}
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold">Why We Give</h2>
          <p className="text-muted-foreground">
            Sheepdog Society is free for every man who walks through the door.
            Always has been, always will be. But keeping this brotherhood running
            — study guides, technology, events, camping trips — takes resources.
            When you give, you&apos;re investing in the spiritual growth of men
            across the country. You&apos;re funding study materials that help
            brothers dig into Scripture. You&apos;re supporting the events that
            bring us together. Every dollar goes directly toward the mission:
            equipping men to stand guard, protect the flock, and live with
            purpose.
          </p>
          <blockquote className="mt-6 border-l-4 border-bronze pl-4 font-scripture italic text-muted-foreground">
            &ldquo;Each of you should give what you have decided in your heart
            to give, not reluctantly or under compulsion, for God loves a
            cheerful giver.&rdquo; — 2 Corinthians 9:7
          </blockquote>
        </div>
      </section>

      {/* Ways to Give */}
      <section className="bg-card px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold">Ways to Give</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <CreditCard className="mb-3 h-10 w-10 text-bronze" />
                <h3 className="font-bold">Give Online</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Secure one-time or recurring giving through our online
                  platform.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <a href="#give-online">Give Now</a>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <Mail className="mb-3 h-10 w-10 text-bronze" />
                <h3 className="font-bold">Give by Mail</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Send a check to our mailing address. Contact us for details.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/contact">Contact Us</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <Handshake className="mb-3 h-10 w-10 text-bronze" />
                <h3 className="font-bold">Partner With Us</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Become a Sheepdog Partner with ongoing monthly support.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <a href="#give-partner">Learn More</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-2xl font-bold">Sheepdog Partners</h2>
          <p className="text-muted-foreground">
            Our partners are churches, organizations, and individuals who
            believe in the Sheepdog mission and support it through prayer,
            resources, and financial giving. Interested in partnering?
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/contact">Become a Partner</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
