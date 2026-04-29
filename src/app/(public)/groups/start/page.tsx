import Link from "next/link";
import { IssueKicker } from "@/components/public/issue-kicker";
import { ScriptureBand } from "@/components/public/scripture-band";

export const metadata = {
  title: "Start a Group — Acts 2028 Sheepdog Society",
  description:
    "Three or four men, a Bible, a regular time, a place. We'll help you start a group in your town.",
};

export default function StartGroupPage() {
  return (
    <>
      <section className="px-6 pt-20 pb-16">
        <div className="mx-auto max-w-3xl">
          <IssueKicker parts={["Start a Group"]} />
          <h1 className="mt-3 font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            Three men, a Bible, a regular time.
          </h1>
          <p className="mt-6 font-pullquote italic text-xl md:text-2xl text-olive leading-relaxed">
            That&apos;s the whole thing. We&apos;ll help with the rest.
          </p>

          <ol className="mt-12 space-y-8 font-body text-[18px] leading-relaxed">
            <Step n={1} title="Find two or three men">
              Friends from your church, your neighborhood, your work. Men who
              are willing to read a passage on Sunday and talk about it on
              Tuesday.
            </Step>
            <Step n={2} title="Pick a regular time and place">
              Same time every week. The diner before work. Someone&apos;s living
              room after dinner. A church classroom on a Saturday morning.
            </Step>
            <Step n={3} title="Read the same passage every week">
              We&apos;ll send you a guide each Friday. Read it before you meet.
              Spend most of your time on the text — what it says, what it
              means, how to live it.
            </Step>
            <Step n={4} title="Tell us where you are">
              We&apos;ll add your group to the map so other men in your town can
              find it. Send a note to{" "}
              <Link
                href="mailto:beargodwin@gmail.com?subject=Starting%20a%20Sheepdog%20Society%20group"
                className="text-brass underline underline-offset-4"
              >
                beargodwin@gmail.com
              </Link>
              .
            </Step>
          </ol>
        </div>
      </section>

      <ScriptureBand reference="Hebrews 10:24-25">
        Let us consider how to stir up one another to love and good works, not
        neglecting to meet together, as is the habit of some, but encouraging
        one another, and all the more as you see the Day drawing near.
      </ScriptureBand>
    </>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[3rem_1fr] gap-6">
      <span className="font-display text-3xl font-semibold text-brass">
        {String(n).padStart(2, "0")}
      </span>
      <div>
        <h3 className="font-display text-2xl font-semibold tracking-tight">
          {title}
        </h3>
        <p className="mt-2 text-olive">{children}</p>
      </div>
    </li>
  );
}
