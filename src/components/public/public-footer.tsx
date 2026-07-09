import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/icons/Icon";
import { NewsletterForm } from "./newsletter-form";
import { ScriptureMarquee } from "@/components/motion/ScriptureMarquee";

/**
 * Broadsheet footer. The crest bookends the page (single, centered,
 * ~40px, opacity-80 — MASTER.md), then three link columns + the Letter
 * signup, then the colophon line.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-foreground/15 bg-background text-foreground">
      <ScriptureMarquee />
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        {/* Crest bookend */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={48}
            className="h-12 w-10 opacity-80"
          />
          <p className="brand-wordmark text-2xl">Sheepdog Society</p>
          <p className="folio">Keep watch over yourselves and all the flock</p>
          <Link
            href="/acts-20-28"
            className="link-editorial mt-1 inline-flex items-center gap-1.5 text-sm text-foreground/80"
          >
            Read the verse
            <Icon name="arrow-up-right" size={13} />
          </Link>
        </div>

        <div className="mt-14 grid gap-12 md:grid-cols-12">
          <div className="md:col-span-3">
            <h3 className="folio">Get involved</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link href="/join" className="text-foreground/80 transition-colors hover:text-brass">
                  Join
                </Link>
              </li>
              <li>
                <Link href="/groups" className="text-foreground/80 transition-colors hover:text-brass">
                  Find a group
                </Link>
              </li>
              <li>
                <Link
                  href="/join?path=start"
                  className="text-foreground/80 transition-colors hover:text-brass"
                >
                  Start a group
                </Link>
              </li>
              {/* "Give" link hidden for now — uncomment when the giving flow is ready
              <li>
                <Link href="/giving" className="text-foreground/80 transition-colors hover:text-brass">
                  Give
                </Link>
              </li>
              */}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h3 className="folio">On the record</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link href="/letter" className="text-foreground/80 transition-colors hover:text-brass">
                  The Letter
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-foreground/80 transition-colors hover:text-brass">
                  Gatherings
                </Link>
              </li>
              <li>
                <Link href="/stories" className="text-foreground/80 transition-colors hover:text-brass">
                  Stories
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-foreground/80 transition-colors hover:text-brass">
                  Resources
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="folio">The society</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link href="/about" className="text-foreground/80 transition-colors hover:text-brass">
                  About
                </Link>
              </li>
              <li>
                <Link href="/how-we-gather" className="text-foreground/80 transition-colors hover:text-brass">
                  How we gather
                </Link>
              </li>
              <li>
                <Link href="/what-to-expect" className="text-foreground/80 transition-colors hover:text-brass">
                  What to expect
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-foreground/80 transition-colors hover:text-brass">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-foreground/80 transition-colors hover:text-brass">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="folio">The Letter</h3>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              A weekly word for men of faith. Delivered Sunday mornings before
              the day starts.
            </p>
            <div className="mt-5">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="hairline mt-16" />
        <div className="mt-8 flex flex-col-reverse items-start gap-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Sheepdog Society. All rights
            reserved. &middot;{" "}
            <Link href="/privacy" className="link-editorial">
              Privacy
            </Link>{" "}
            &middot;{" "}
            <Link href="/sms-terms" className="link-editorial">
              SMS terms
            </Link>
          </p>
          <p className="folio">Forth as sheepdogs &middot; Glory to God</p>
        </div>
      </div>
    </footer>
  );
}
