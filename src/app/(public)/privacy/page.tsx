import Link from "next/link";
import type { Metadata } from "next";
import { Kicker } from "@/components/public/kicker";

export const metadata: Metadata = {
  title: "Privacy — Sheepdog Society",
  description:
    "What we collect, why we collect it, and what we will not do with it.",
};

const SECTIONS = [
  {
    heading: "What we collect",
    body: [
      "When you sign up for a group, the weekly Letter, or text reminders, we collect the information you give us: your name, email, optional phone number, ZIP code if you share it, and the notification preferences you choose.",
      "When you visit the site, our hosting provider logs basic technical information: IP address, browser, and the pages you load. This is standard for any web server and is used to keep the site running.",
      "We do not require an account. We do not track you across other sites. We do not sell ads.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "Your name and email let a group leader follow up with you. Your notification preferences tell us what to send and what not to send. Your ZIP helps us suggest groups near you.",
      "We send the weekly Letter to the email you give us. We send event reminders only if you check the box. We send SMS only after you confirm by replying YES.",
      "We will not contact you for things you did not ask for.",
    ],
  },
  {
    heading: "What we do not do",
    body: [
      "We do not sell or share mobile opt-in data or consent with third parties for marketing purposes.",
      "We do not sell or rent your email address. We do not run targeted ads. We do not share your data with anyone outside the ministry except the few service providers listed below, who handle email and text on our behalf.",
    ],
  },
  {
    heading: "Service providers",
    body: [
      "Email is sent through Resend. Text messages, when configured, are sent through Twilio. Files (resources, images) are stored on Vercel Blob. Maps are rendered by Mapbox. Each of these providers handles its slice of the work and is bound by its own privacy terms.",
      "Errors and performance metrics are sent to Sentry and Vercel Analytics, with personally identifiable information stripped where the platform permits.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You can unsubscribe from any email by clicking the link at the bottom. You can unsubscribe from text messages by replying STOP. You can ask us to delete your record entirely at the email below; we will confirm within seven days.",
      "If you change a preference (email yes, text no, or vice versa), you can do that from the link in any message we send.",
    ],
  },
  {
    heading: "Children",
    body: [
      "The site and its messages are not directed at children under thirteen. If you believe a child has signed up, please email us so we can remove the record.",
    ],
  },
  {
    heading: "Changes",
    body: [
      "We will update this page if how we handle data changes. The change date below tells you when this was last revised.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "Questions, requests, or corrections: hello@acts2028sheepdogsociety.com.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <section className="bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-24 md:px-12 md:py-32">
        <Kicker left="Privacy" />
        <h1 className="display-xl mt-10 text-display-lg">
          What we keep.
          <br />
          <em>What we will not do.</em>
        </h1>
        <p className="mt-8 font-pullquote text-lede italic text-muted-foreground">
          Plain English, not lawyer English. If something here seems unclear,
          email us and we will fix it.
        </p>

        <div className="mt-16 space-y-12">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="font-display text-2xl font-semibold md:text-3xl">
                {s.heading}
              </h2>
              <div className="mt-4 space-y-4">
                {s.body.map((p, i) => (
                  <p
                    key={i}
                    className="text-lg leading-relaxed text-muted-foreground"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-20 border-t border-foreground/15 pt-8">
          <p className="folio">
            Last revised · April 2026
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            See also the{" "}
            <Link
              href="/sms-terms"
              className="link-editorial"
            >
              SMS Terms
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
