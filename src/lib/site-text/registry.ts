export interface SiteTextEntry {
  key: string;
  /** Plain-English name Jeremy sees, e.g. "Homepage — Hero headline (line 1)" */
  label: string;
  group: "Homepage" | "About";
  defaultValue: string;
  /** true → textarea; false → single-line input */
  multiline: boolean;
}

/** Curated editable copy. Spec §B.1: homepage 5W1H sections + About page
 *  copy ONLY. Scripture quotes are never keys. Structural labels (the
 *  folio "Who it's for" headings, roman numerals, icons) stay in code.
 *  `as const satisfies` keeps SiteTextKey a literal union so a typo'd
 *  t["home.hero.headlin1"] lookup fails tsc instead of rendering blank. */
export const SITE_TEXT_KEYS = [
  // ── Homepage ──────────────────────────────────────────────
  { key: "home.hero.headline1", label: "Hero headline — line 1", group: "Homepage", multiline: false,
    defaultValue: "Find your" },
  { key: "home.hero.headline2", label: "Hero headline — line 2 (italic)", group: "Homepage", multiline: false,
    defaultValue: "brothers." },
  { key: "home.hero.paragraph", label: "Hero paragraph", group: "Homepage", multiline: true,
    defaultValue:
      "A brotherhood of Christian men, anchored in Acts 20:28. We meet weekly around Scripture, tell each other the truth, and stand watch over one another. You have walked alone long enough." },
  { key: "home.what.who", label: "What this is — Who it's for", group: "Homepage", multiline: true,
    defaultValue:
      "Men. Fathers, sons, new believers, worn-out saints. If you are a man, there is a seat." },
  { key: "home.what.happens", label: "What this is — What happens", group: "Homepage", multiline: true,
    defaultValue:
      "A weekly table. Scripture read plain. Straight talk. Prayer. One hour that orders the rest of the week." },
  { key: "home.what.why", label: "What this is — Why it exists", group: "Homepage", multiline: true,
    defaultValue:
      "God did not build men to walk alone. Acts 20:28 says keep watch. We keep it together." },
  { key: "home.what.where_fallback", label: "What this is — When & where (shown only when no meeting rhythms exist)", group: "Homepage", multiline: true,
    defaultValue:
      "Tables gather weekly across Georgia. New ones are forming now." },
  { key: "home.what.start", label: "What this is — How to start", group: "Homepage", multiline: true,
    defaultValue:
      "Pick a group. Show up once. Keep showing up. That is the whole program." },
  { key: "home.join.headline1", label: "Join section — headline line 1", group: "Homepage", multiline: false,
    defaultValue: "There is a chair." },
  { key: "home.join.headline2", label: "Join section — headline line 2 (italic)", group: "Homepage", multiline: false,
    defaultValue: "Sit in it." },
  { key: "home.join.button", label: "Join section — button label", group: "Homepage", multiline: false,
    defaultValue: "Join the brotherhood" },
  { key: "home.meta.title", label: "Search result — page title", group: "Homepage", multiline: false,
    defaultValue: "Sheepdog Society — Acts 20:28" },
  { key: "home.meta.description", label: "Search result — page description", group: "Homepage", multiline: true,
    defaultValue:
      "A brotherhood of Christian men anchored in Acts 20:28. Weekly tables around Scripture. Find your group, read the Letter, take a seat." },
  { key: "home.meta.social_title", label: "Link preview — title (texts and social shares)", group: "Homepage", multiline: false,
    defaultValue: "Sheepdog Society — Find your brothers." },
  { key: "home.meta.social_description", label: "Link preview — description (texts and social shares)", group: "Homepage", multiline: true,
    defaultValue:
      "A brotherhood of Christian men anchored in Acts 20:28. Weekly tables around Scripture." },
  // ── About ─────────────────────────────────────────────────
  { key: "about.hero.headline1", label: "About hero — headline line 1", group: "About", multiline: false,
    defaultValue: "A brotherhood," },
  { key: "about.hero.headline2", label: "About hero — headline line 2 (italic)", group: "About", multiline: false,
    defaultValue: "rooted and ready." },
  { key: "about.hero.paragraph", label: "About hero — paragraph", group: "About", multiline: true,
    defaultValue:
      "Men of faith, honorable values, prepared in every aspect of life. We protect our families. We sharpen each other. We follow Christ." },
  { key: "about.mission.body", label: "Mission — body", group: "About", multiline: true,
    defaultValue:
      "We are a brotherhood of like-minded men, rooted in honorable Christian values, driven to be prepared in every aspect of life. We protect our faith, our families, ourselves, and anyone in need. We educate, communicate, and demonstrate faith through leadership and fellowship, with boldness, authority, strength, and grace." },
  { key: "about.foundation.body", label: "Foundation — paragraph under the verse", group: "About", multiline: true,
    defaultValue:
      "A call for every man to keep watch, shepherd, train, and be ready. We are called by Christ to be the shepherds over our flock, our church, our families, our wives, our kids. This is not a passive calling. It demands vigilance, courage, and faithfulness." },
  { key: "about.leadership.p1", label: "Leadership — first paragraph", group: "About", multiline: true,
    defaultValue:
      "Our leadership revolves around no single man. It revolves around Jesus Christ. We follow a decentralized model where every man is empowered and confident to lead." },
  { key: "about.leadership.p2", label: "Leadership — second paragraph", group: "About", multiline: true,
    defaultValue:
      "Cut a leg off a starfish, it grows back. That is us. No single point of failure. Every group stands on its own, connected by shared faith and shared mission." },
  { key: "about.believe.1.title", label: "Conviction I — title", group: "About", multiline: false,
    defaultValue: "Scripture is our guide." },
  { key: "about.believe.1.copy", label: "Conviction I — copy", group: "About", multiline: true,
    defaultValue:
      "The Bible is our foundation. We study it, discuss it, and live it out together. Not as scholars, but as men seeking truth." },
  { key: "about.believe.2.title", label: "Conviction II — title", group: "About", multiline: false,
    defaultValue: "Grace transforms." },
  { key: "about.believe.2.copy", label: "Conviction II — copy", group: "About", multiline: true,
    defaultValue:
      "By God's grace, wolves become sheepdogs. Our strength is redeemed, not to destroy, but to protect and serve." },
  { key: "about.believe.3.title", label: "Conviction III — title", group: "About", multiline: false,
    defaultValue: "Brotherhood sharpens." },
  { key: "about.believe.3.copy", label: "Conviction III — copy", group: "About", multiline: true,
    defaultValue:
      "Iron sharpens iron. We are stronger together, carrying burdens, challenging complacency, building each other up." },
  { key: "about.culture.1.heading", label: "Culture I — heading", group: "About", multiline: false,
    defaultValue: "Safe brotherhood." },
  { key: "about.culture.1.copy", label: "Culture I — copy", group: "About", multiline: true,
    defaultValue:
      "What is shared stays confidential. This is a place where men can be real." },
  { key: "about.culture.2.heading", label: "Culture II — heading", group: "About", multiline: false,
    defaultValue: "No conflict." },
  { key: "about.culture.2.copy", label: "Culture II — copy", group: "About", multiline: true,
    defaultValue:
      "We steer away from controversy, complicated subjects, and church politics. We focus on everyday issues men face." },
  { key: "about.culture.3.heading", label: "Culture III — heading", group: "About", multiline: false,
    defaultValue: "Christ-centered." },
  { key: "about.culture.3.copy", label: "Culture III — copy", group: "About", multiline: true,
    defaultValue:
      "Every discussion points back to Jesus. He is our leader, our model, our hope." },
  { key: "about.culture.4.heading", label: "Culture IV — heading", group: "About", multiline: false,
    defaultValue: "Keep it simple." },
  { key: "about.culture.4.copy", label: "Culture IV — copy", group: "About", multiline: true,
    defaultValue:
      "We want any man, young or old, to feel confident walking in and participating. No barriers." },
  { key: "about.meta.title", label: "About — search result title", group: "About", multiline: false,
    defaultValue: "About — Sheepdog Society" },
  { key: "about.meta.description", label: "About — search result description", group: "About", multiline: true,
    defaultValue:
      "A brotherhood of men rooted in honorable Christian values, driven to be prepared in every aspect of life." },
] as const satisfies readonly SiteTextEntry[];

export type SiteTextKey = (typeof SITE_TEXT_KEYS)[number]["key"];

export const SITE_TEXT_DEFAULTS = Object.fromEntries(
  SITE_TEXT_KEYS.map((e) => [e.key, e.defaultValue])
) as Record<SiteTextKey, string>;
