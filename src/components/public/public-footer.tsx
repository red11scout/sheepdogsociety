import Link from "next/link";
import { BrandWordmark } from "@/components/public/brand-wordmark";

// Brief §3: footer with full Acts 20:28 (in larger Cormorant italic),
// 4-column nav, statement-of-faith link, copyright.
export function PublicFooter() {
  return (
    <footer className="border-t-2 border-stone bg-iron text-bone">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Full anchor scripture */}
        <div className="mb-16 max-w-3xl">
          <p className="font-pullquote italic text-2xl md:text-3xl leading-relaxed border-l-2 border-brass pl-8 text-bone">
            Be on guard for yourselves and for all the flock, among which the
            Holy Spirit has made you overseers, to shepherd the church of God
            which He purchased with His own blood.
          </p>
          <p className="mt-4 pl-8 font-body uppercase tracking-[0.18em] text-xs text-stone">
            — Acts 20:28
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <BrandWordmark size="md" className="text-bone" />
            <p className="mt-4 font-body text-sm text-stone leading-relaxed">
              Christian men learning to keep watch over their families, their
              churches, and themselves, under the authority of the Great
              Shepherd.
            </p>
          </div>

          <FooterColumn
            heading="Read"
            links={[
              { href: "/letter", label: "The Letter" },
              { href: "/letter/archive", label: "Archive" },
              { href: "/devotionals", label: "Devotionals" },
              { href: "/resources", label: "Resources" },
              { href: "/stories", label: "Stories" },
            ]}
          />

          <FooterColumn
            heading="Gather"
            links={[
              { href: "/groups", label: "Find a Group" },
              { href: "/groups/start", label: "Start a Group" },
              { href: "/events", label: "Events" },
              { href: "/how-we-gather", label: "How We Gather" },
              { href: "/get-started", label: "Get Started" },
            ]}
          />

          <FooterColumn
            heading="About"
            links={[
              { href: "/about", label: "Our Story" },
              { href: "/statement-of-faith", label: "Statement of Faith" },
              { href: "/partnerships", label: "Partnerships" },
              { href: "/giving", label: "Give" },
              { href: "/contact", label: "Contact" },
            ]}
          />
        </div>

        <div className="mt-16 border-t border-stone/30 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-body text-xs text-stone">
          <p>&copy; {new Date().getFullYear()} Acts 2028 Sheepdog Society. All rights reserved.</p>
          <p>
            <Link
              href="/subscribe"
              className="text-stone hover:text-brass transition-colors"
            >
              Subscribe
            </Link>
            <span className="mx-2 text-stone/40">·</span>
            <Link
              href="/feed.xml"
              className="text-stone hover:text-brass transition-colors"
            >
              RSS
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h3 className="mb-4 font-body uppercase tracking-[0.18em] text-xs text-brass">
        {heading}
      </h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="font-body text-sm text-stone hover:text-bone transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
