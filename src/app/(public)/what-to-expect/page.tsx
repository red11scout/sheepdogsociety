import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icons/Icon";
import { Kicker } from "@/components/public/kicker";

export const metadata: Metadata = {
  title: "What to expect — Sheepdog Society",
  description:
    "No stage. No show. Men sit down, open the Word, speak plainly, pray, and leave with something to obey.",
};

const TABLE_RHYTHM = [
  {
    eyebrow: "1 · Sit",
    title: "Pull up a chair.",
    body: "We meet at a table. Coffee, sometimes breakfast. Fifteen minutes of plain talk before anyone opens a book. You do not need to know what to say. You do not need to have your life cleaned up. Come sit down.",
  },
  {
    eyebrow: "2 · Read",
    title: "Open the Word.",
    body: "We read scripture out loud, slowly. Whoever wants to read, reads. We do not lecture. We ask what the passage says, what it means, and what it asks of us this week.",
  },
  {
    eyebrow: "3 · Speak",
    title: "Tell the truth.",
    body: "Each man says one true thing about his week. A struggle. A win. A confession. A man who is willing to be honest will find brothers willing to carry it with him.",
  },
  {
    eyebrow: "4 · Pray",
    title: "Take it to the Lord.",
    body: "We pray for one another by name. Short prayers. Plain words. We trust the Lord with what we cannot fix.",
  },
  {
    eyebrow: "5 · Leave",
    title: "One thing to obey.",
    body: "Each man names one thing to do this week, in light of what we read. We hold each other to it without nagging. That is the watch.",
  },
] as const;

const FAQ = [
  {
    q: "Do I need to know the Bible?",
    a: "No. Most men in our groups did not know the Bible when they started. Reading it together is how we learn it.",
  },
  {
    q: "Can I just listen the first few times?",
    a: "Yes. Many men sit and listen for a month before they say a word. That is fine. Take your time.",
  },
  {
    q: "What do I bring?",
    a: "A Bible if you have one. We have spares. Bring nothing else. If your group meets at a coffee shop, bring a few dollars for your drink.",
  },
  {
    q: "How long does it last?",
    a: "Sixty to seventy-five minutes. Most groups start early so men can get to work afterward.",
  },
  {
    q: "Is this a Bible study or a support group?",
    a: "It is a Bible study. The brotherhood that grows out of it is a side effect of reading the Word together.",
  },
  {
    q: "What if I have not been to church in a long time?",
    a: "Welcome. Come anyway. There is no test at the door.",
  },
  {
    q: "What does it cost?",
    a: "Nothing. Coffee is on you.",
  },
  {
    q: "Is this affiliated with a denomination?",
    a: "No. We hold to the historic, orthodox Christian faith. We do not push a denominational line. If you have one, bring it; we will not ask you to leave it.",
  },
] as const;

export default function WhatToExpectPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-6 py-24 md:px-12 md:py-40">
          <Kicker left="Before you come" />
          <h1 className="display-xl mt-10 text-display-xl">
            Come hungry.
            <br />
            <em>Bring nothing else.</em>
          </h1>
          <p className="mt-10 max-w-2xl font-pullquote text-lede italic text-muted-foreground">
            You do not need to have your life in order. You do not need to know
            what to say. Come sit down. Listen. Open the Word with us.
          </p>
        </div>
      </section>

      {/* The rhythm of a table */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-6 py-24 md:px-12 md:py-32">
          <Kicker left="The rhythm" />
          <h2 className="display-xl mt-10 text-display-lg">
            Five things happen at a table.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Most groups follow this rhythm, in this order. It is simple on
            purpose. A man should be able to walk in the door and know what is
            coming.
          </p>

          <div className="mt-16 space-y-12 md:space-y-16">
            {TABLE_RHYTHM.map((step) => (
              <article
                key={step.eyebrow}
                className="grid gap-6 md:grid-cols-[200px_1fr] md:gap-12"
              >
                <Kicker left={step.eyebrow} />
                <div>
                  <h3 className="display-soft text-display-md">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Verse plate: the page's one dark interlude */}
      <section className="ember-band">
        <div className="mx-auto max-w-4xl px-6 py-24 md:px-12 md:py-32">
          <Kicker left="The Charge" />
          <p className="mt-12 section-mark">§ Acts 20:28</p>
          <blockquote className="mt-6 font-pullquote text-2xl italic leading-relaxed md:text-4xl">
            Pay careful attention to yourselves and to all the flock, in which
            the Holy Spirit has made you overseers, to care for the church of
            God, which he obtained with his own blood.
          </blockquote>
          <p className="mt-6 section-mark text-brass">
            Acts 20:28 · ESV
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-6 py-24 md:px-12 md:py-32">
          <Kicker left="Plain answers" />
          <h2 className="display-xl mt-10 text-display-lg">
            What men ask.
          </h2>

          <dl className="mt-16 divide-y divide-foreground/10 border-y border-foreground/15">
            {FAQ.map((item) => (
              <div key={item.q} className="py-8">
                <dt className="font-display text-xl font-semibold md:text-2xl">
                  {item.q}
                </dt>
                <dd className="mt-3 text-lg leading-relaxed text-muted-foreground">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-6 py-24 md:px-12 md:py-32">
          <Kicker left="Next step" />
          <h2 className="display-xl mt-10 text-display-lg">
            There is a chair.
            <br />
            <em>Sit in it.</em>
          </h2>
          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/groups"
              className="lift inline-flex h-12 items-center gap-3 bg-brass px-6 text-sm font-medium uppercase tracking-[0.18em] text-iron transition-colors hover:bg-gold"
            >
              Find a group near me
              <Icon name="arrow-right" size={16} />
            </Link>
            <Link
              href="/join?path=start"
              className="link-editorial inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em]"
            >
              Plant a group
              <Icon name="arrow-up-right" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
