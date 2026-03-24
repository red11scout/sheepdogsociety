import Link from "next/link";
import Image from "next/image";
import { NewsletterForm } from "./newsletter-form";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Sheepdog Society"
                width={32}
                height={32}
                className="rounded"
              />
              <span className="font-bold">SheepDog Society</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Men of faith standing guard, protecting the flock, living with
              purpose. Acts 20:28.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Get Involved
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/get-started" className="text-muted-foreground hover:text-foreground">
                  New to Sheepdog
                </Link>
              </li>
              <li>
                <Link href="/locations" className="text-muted-foreground hover:text-foreground">
                  Find a Location
                </Link>
              </li>
              <li>
                <Link href="/locations/request" className="text-muted-foreground hover:text-foreground">
                  Start a Group
                </Link>
              </li>
              <li>
                <Link href="/giving" className="text-muted-foreground hover:text-foreground">
                  Give
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Resources
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-foreground">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/stories" className="text-muted-foreground hover:text-foreground">
                  Stories
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Stay Updated
            </h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Get the Yarn — our newsletter for the brotherhood.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} SheepDog Society. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
