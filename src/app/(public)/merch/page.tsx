import { IssueKicker } from "@/components/public/issue-kicker";

export const metadata = {
  title: "Merch — Acts 2028 Sheepdog Society",
  description:
    "Heritage-quality goods marked with Acts 20:28. Coming soon.",
};

// Brief Phase 5: mock-up only. Read from merchandise items in DB once seeded.
// Wire commerce in a future phase if the ministry decides to monetize.
const sampleItems = [
  {
    name: "Heritage Tee — Iron",
    description:
      "Charcoal short-sleeve. Acts 20:28 in small caps over the heart. American-made, heavyweight cotton.",
    price: "$32",
  },
  {
    name: "Field Notebook — Bone",
    description:
      "Pocket-sized lined notebook for sermon notes and prayer lists. 96 pages. Made in Tennessee.",
    price: "$18",
  },
  {
    name: "Brass Lapel Pin",
    description:
      "Quiet, no logo. The reference and the call: Acts 20:28.",
    price: "$12",
  },
];

export default function MerchPage() {
  return (
    <article className="px-6 pt-20 pb-24">
      <div className="mx-auto max-w-5xl">
        <IssueKicker parts={["Merch", "Coming soon"]} />
        <h1 className="mt-3 font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
          Heritage goods.
        </h1>
        <p className="mt-6 font-pullquote italic text-xl md:text-2xl text-olive max-w-3xl leading-relaxed">
          Made well. Made to last. Marked with Acts 20:28.
        </p>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {sampleItems.map((item) => (
            <article key={item.name} className="space-y-4">
              <div className="aspect-[4/5] bg-stone/30 border border-stone/60 relative">
                <span className="absolute top-3 right-3 bg-iron text-bone font-body text-xs uppercase tracking-[0.18em] px-2 py-1">
                  Coming soon
                </span>
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight">
                  {item.name}
                </h3>
                <p className="mt-1 font-body text-sm text-olive leading-relaxed">
                  {item.description}
                </p>
                <p className="mt-3 font-body text-base text-iron">{item.price}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </article>
  );
}
