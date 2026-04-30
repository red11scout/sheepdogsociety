import { Icon } from "@/components/icons/Icon";

export const metadata = {
  title: "About — Sheepdog Society",
  description:
    "A brotherhood of men rooted in honorable Christian values, driven to be prepared in every aspect of life.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-bone text-iron">
        <div className="dotted-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ About &middot; The Watch</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6.5rem)]">
            A brotherhood,
            <br />
            <span className="text-brass">rooted and ready.</span>
          </h1>
          <p className="mt-10 max-w-2xl font-pullquote text-xl italic leading-relaxed text-iron/70 md:text-2xl">
            Men of faith, honorable values, prepared in every aspect of life. We
            protect our families. We sharpen each other. We follow Christ.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-iron text-bone">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-28 md:grid-cols-[2fr_3fr] md:gap-20 md:px-12 md:py-40">
          <div>
            <span className="section-mark">§ I &middot; Mission</span>
            <div className="hairline mt-3" />
            <h2 className="display-xl mt-8 text-4xl text-bone md:text-5xl">
              Our mission.
            </h2>
          </div>
          <p className="font-pullquote text-xl leading-relaxed text-stone md:text-2xl">
            We are a brotherhood of like-minded men, rooted in honorable
            Christian values, driven to be prepared in every aspect of life. We
            protect our faith, our families, ourselves, and anyone in need. We
            educate, communicate, and demonstrate faith through leadership and
            fellowship, with boldness, authority, strength, and grace.
          </p>
        </div>
      </section>

      {/* Foundation */}
      <section className="bg-bone text-iron">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ II &middot; Foundation</span>
            <div className="hairline flex-1" />
          </div>
          <div className="mt-10 grid gap-12 md:grid-cols-[2fr_3fr] md:gap-20">
            <h2 className="display-xl text-4xl md:text-6xl">
              Acts 20:28.
              <br />
              <span className="text-brass">The verse we live by.</span>
            </h2>
            <div className="space-y-6">
              <blockquote className="border-l-2 border-brass pl-6 font-pullquote text-2xl italic leading-relaxed text-iron md:text-3xl">
                Keep watch over yourselves and all the flock. Be shepherds of
                the church of God, which he bought with his own blood.
              </blockquote>
              <p className="section-mark text-brass">Acts 20:28 &middot; ESV</p>
              <p className="text-base leading-relaxed text-iron/70 md:text-lg">
                A call for every man to keep watch, shepherd, train, and be
                ready. We are called by Christ to be the shepherds over our
                flock, our church, our families, our wives, our kids. This is
                not a passive calling. It demands vigilance, courage, and
                faithfulness.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Model */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ III &middot; Leadership</span>
            <div className="hairline flex-1" />
          </div>
          <div className="mt-10 grid gap-12 md:grid-cols-[2fr_3fr] md:gap-20">
            <h2 className="display-xl text-4xl text-bone md:text-6xl">
              A starfish,
              <br />
              <span className="text-brass">not a spider.</span>
            </h2>
            <div className="space-y-6 text-base leading-relaxed text-stone md:text-lg">
              <p>
                Our leadership revolves around no single man. It revolves around
                Jesus Christ. We follow a decentralized model where every man is
                empowered and confident to lead.
              </p>
              <p>
                Cut a leg off a starfish, it grows back. That is us. No single
                point of failure. Every group stands on its own, connected by
                shared faith and shared mission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Believe */}
      <section className="bg-bone text-iron">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ IV &middot; What We Believe</span>
            <div className="hairline flex-1" />
          </div>
          <h2 className="display-xl mt-10 max-w-3xl text-4xl md:text-6xl">
            Three convictions.
          </h2>
          <div className="mt-16 grid gap-px bg-iron/10 md:grid-cols-3">
            {[
              {
                icon: "scroll" as const,
                roman: "I",
                title: "Scripture is our guide.",
                copy: "The Bible is our foundation. We study it, discuss it, and live it out together. Not as scholars, but as men seeking truth.",
              },
              {
                icon: "flame" as const,
                roman: "II",
                title: "Grace transforms.",
                copy: "By God's grace, wolves become sheepdogs. Our strength is redeemed, not to destroy, but to protect and serve.",
              },
              {
                icon: "brothers" as const,
                roman: "III",
                title: "Brotherhood sharpens.",
                copy: "Iron sharpens iron. We are stronger together, carrying burdens, challenging complacency, building each other up.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="spotlight lift bg-bone p-10 md:p-12"
              >
                <div className="flex items-center justify-between">
                  <Icon
                    name={item.icon}
                    size={44}
                    strokeWidth={2}
                    className="text-brass"
                  />
                  <span className="section-mark">§ {item.roman}</span>
                </div>
                <h3 className="display-xl mt-12 text-2xl md:text-3xl">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-xs text-base leading-relaxed text-iron/70">
                  {item.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Culture */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ V &middot; Our Culture</span>
            <div className="hairline flex-1" />
          </div>
          <h2 className="display-xl mt-10 max-w-3xl text-4xl text-bone md:text-6xl">
            How we hold the line.
          </h2>
          <ol className="mt-16 divide-y divide-stone/15 border-y border-stone/15">
            {[
              {
                roman: "I",
                heading: "Safe brotherhood.",
                copy: "What is shared stays confidential. This is a place where men can be real.",
              },
              {
                roman: "II",
                heading: "No conflict.",
                copy: "We steer away from controversy, complicated subjects, and church politics. We focus on everyday issues men face.",
              },
              {
                roman: "III",
                heading: "Christ-centered.",
                copy: "Every discussion points back to Jesus. He is our leader, our model, our hope.",
              },
              {
                roman: "IV",
                heading: "Keep it simple.",
                copy: "We want any man, young or old, to feel confident walking in and participating. No barriers.",
              },
            ].map((item) => (
              <li
                key={item.heading}
                className="grid grid-cols-[60px_1fr] gap-6 py-10 md:grid-cols-[80px_280px_1fr] md:gap-12 md:py-14"
              >
                <span className="section-mark text-brass md:pt-2">
                  § {item.roman}
                </span>
                <h3 className="display-xl col-span-1 text-2xl text-bone md:text-3xl">
                  {item.heading}
                </h3>
                <p className="col-span-2 text-base leading-relaxed text-stone md:col-span-1 md:text-lg">
                  {item.copy}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
