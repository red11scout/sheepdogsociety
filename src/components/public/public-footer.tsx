import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/icons/Icon";
import { NewsletterForm } from "./newsletter-form";
import { ScriptureMarquee } from "@/components/motion/ScriptureMarquee";

export function PublicFooter() {
  return (
    <footer className="bg-background text-foreground">
      <ScriptureMarquee />
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-28">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="space-y-5 md:col-span-4">
            <Link
              href="/"
              className="flex items-center gap-3"
              aria-label="Sheepdog Society home"
            >
              <Image
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                className="rounded-none"
              />
              <div className="leading-tight">
                <div className="display-xl text-base text-foreground">
                  Sheepdog Society
                </div>
                <div className="section-mark text-[0.625rem] text-brass">
                  Acts 20:28
                </div>
              </div>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-stone">
              Men of faith standing guard, protecting the flock, living with
              purpose.
            </p>
            <Link
              href="/acts-20-28"
              className="group inline-flex items-center gap-2 section-mark text-brass transition-opacity hover:opacity-70"
            >
              Read the verse
              <Icon
                name="arrow-up-right"
                size={14}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>

          <div className="md:col-span-2">
            <h3 className="section-mark text-stone/60">Get involved</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link
                  href="/get-started"
                  className="text-foreground/80 transition-colors hover:text-brass"
                >
                  New here
                </Link>
              </li>
              <li>
                <Link
                  href="/locations"
                  className="text-foreground/80 transition-colors hover:text-brass"
                >
                  Find a group
                </Link>
              </li>
              <li>
                <Link
                  href="/locations/request"
                  className="text-foreground/80 transition-colors hover:text-brass"
                >
                  Start a group
                </Link>
              </li>
              {/* "Give" link hidden for now — uncomment when the giving flow is ready
              <li>
                <Link
                  href="/giving"
                  className="text-foreground/80 transition-colors hover:text-brass"
                >
                  Give
                </Link>
              </li>
              */}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="section-mark text-stone/60">Resources</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-foreground/80 transition-colors hover:text-brass"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/how-we-gather"
                  className="text-foreground/80 transition-colors hover:text-brass"
                >
                  How we gather
                </Link>
              </li>
              <li>
                <Link
                  href="/stories"
                  className="text-foreground/80 transition-colors hover:text-brass"
                >
                  Stories
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-foreground/80 transition-colors hover:text-brass"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-foreground/80 transition-colors hover:text-brass"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="section-mark text-stone/60">The Letter</h3>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-stone">
              A weekly word for men of faith. Delivered Sunday mornings before
              the day starts.
            </p>
            <div className="mt-5">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="hairline mt-16 bg-stone/15" />
        <div className="mt-8 flex flex-col-reverse items-start gap-3 text-xs text-stone/60 md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Sheepdog Society. All rights
            reserved.
          </p>
          <p className="section-mark">Forth as sheepdogs &middot; Glory to God</p>
        </div>
      </div>
    </footer>
  );
}
