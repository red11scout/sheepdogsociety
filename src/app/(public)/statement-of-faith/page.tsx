import { IssueKicker } from "@/components/public/issue-kicker";
import { ScriptureBand } from "@/components/public/scripture-band";

export const metadata = {
  title: "Statement of Faith — Acts 2028 Sheepdog Society",
  description:
    "What we believe. Orthodox, gospel-centered, not denominationally specific.",
};

// Brief §2 voice: steady, plainspoken, brotherly. Theological framing:
// orthodox, gospel-centered, not denominationally specific.
export default function StatementOfFaithPage() {
  return (
    <>
      <article className="px-6 pt-20 pb-16">
        <div className="mx-auto max-w-3xl">
          <IssueKicker parts={["Statement of Faith"]} />
          <h1 className="mt-3 font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            What we believe.
          </h1>
          <p className="mt-6 font-pullquote italic text-xl md:text-2xl text-olive leading-relaxed">
            Plain. Orthodox. Centered on the gospel.
          </p>

          <div className="mt-12 space-y-10 font-body text-[18px] leading-[1.65] text-iron">
            <Section title="The Bible">
              The Bible — Old and New Testaments — is the inspired, inerrant
              Word of God. It is our final authority for what we believe and
              how we live.
            </Section>
            <Section title="The Trinity">
              There is one God, eternally existing in three persons: Father,
              Son, and Holy Spirit.
            </Section>
            <Section title="Jesus Christ">
              Jesus Christ is fully God and fully man. He was conceived by the
              Holy Spirit, born of the virgin Mary, lived a sinless life, was
              crucified, died, and was buried. He rose bodily on the third day,
              ascended to the right hand of the Father, and will return to
              judge the living and the dead.
            </Section>
            <Section title="The Gospel">
              All people are sinners by nature and by choice. Salvation is by
              grace alone, through faith alone, in Christ alone — not by works
              or merit. Christ&apos;s death paid the penalty for sin; His
              resurrection secures eternal life for all who trust Him.
            </Section>
            <Section title="The Church">
              The Church is the body of Christ — local congregations of
              believers who gather around the Word, the sacraments, and prayer.
              We are a parachurch ministry that exists to serve the local
              church, not to replace it.
            </Section>
            <Section title="Men and Women">
              Men and women are equally made in the image of God and equally
              redeemed in Christ. We hold to historic Christian teaching on
              marriage, family, and the body.
            </Section>
            <Section title="What We Don't Take a Position On">
              Mode of baptism, eschatology, spiritual gifts, denomination, and
              a hundred other secondary matters where faithful Christians
              disagree. We meet around the things that have always united
              believers in Christ.
            </Section>
          </div>
        </div>
      </article>

      <ScriptureBand reference="Jude 3">
        Contend for the faith that was once for all delivered to the saints.
      </ScriptureBand>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-3">
        {title}
      </h2>
      <p>{children}</p>
    </section>
  );
}
