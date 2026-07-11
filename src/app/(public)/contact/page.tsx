import { Fragment } from "react";
import { Kicker } from "@/components/public/kicker";
import { getSiteTextMap } from "@/lib/site-text/get";
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge } from "@/lib/studio/config";
import ContactForm from "@/components/public/contact-form";

export const metadata = {
  title: "Contact — Sheepdog Society",
  description: "Get in touch with Sheepdog Society. We read every note.",
};

export default async function ContactPage() {
  const [t, config] = await Promise.all([getSiteTextMap(), getStudioConfig()]);

  const sections: Record<string, React.ReactNode> = {
    hero: (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <Kicker left="Contact" />
          <h1 className="display-xl mt-10 max-w-4xl text-display-xl">
            {t["contact.hero.headline1"]}
            <br />
            <em>{t["contact.hero.headline2"]}</em>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-muted-foreground">
            {t["contact.hero.paragraph"]}{" "}
            <a
              href="mailto:shepherd@acts2028sheepdogsociety.com"
              className="link-editorial font-medium text-foreground"
            >
              shepherd@acts2028sheepdogsociety.com
            </a>
            . It reaches the same watch.
          </p>
        </div>
      </section>
    ),
    form: <ContactForm />,
  };

  return (
    <>
      {renderMerge("contact", config)
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{sections[s.id]}</Fragment>
        ))}
    </>
  );
}
