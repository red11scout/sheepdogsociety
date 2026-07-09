import { describe, expect, it } from "vitest";
import {
  BOOKS,
  GENRES,
  booksByGenre,
  getBookBySlug,
  nextChapter,
  parseESVChapterText,
  parseReference,
  prevChapter,
  referenceToUrl,
} from "./books";

describe("BOOKS data", () => {
  it("has 66 books with unique slugs", () => {
    expect(BOOKS).toHaveLength(66);
    expect(new Set(BOOKS.map((b) => b.slug)).size).toBe(66);
  });

  it("totals 1,189 chapters", () => {
    expect(BOOKS.reduce((sum, b) => sum + b.chapters, 0)).toBe(1189);
  });

  it("runs Genesis to Revelation in canon order", () => {
    expect(BOOKS[0]).toMatchObject({ name: "Genesis", slug: "genesis", chapters: 50 });
    expect(BOOKS[18]).toMatchObject({ name: "Psalms", slug: "psalms", chapters: 150 });
    expect(BOOKS[65]).toMatchObject({ name: "Revelation", slug: "revelation", chapters: 22 });
  });

  it("slugs numbered and multi-word books", () => {
    expect(getBookBySlug("1-corinthians")).toMatchObject({ name: "1 Corinthians", chapters: 16 });
    expect(getBookBySlug("song-of-solomon")).toMatchObject({ name: "Song of Solomon", chapters: 8 });
    expect(getBookBySlug("nonsense")).toBeUndefined();
  });
});

describe("booksByGenre", () => {
  it("groups all 66 books into the 8 BibleProject genres, canon order", () => {
    const groups = booksByGenre();
    expect(groups.map((g) => g.genre)).toEqual([...GENRES]);
    expect(groups.map((g) => g.books.length)).toEqual([5, 12, 5, 5, 12, 5, 21, 1]);
  });

  it("keeps Acts with the Gospels (Luke-Acts, per the 8-eyebrow picker)", () => {
    const gospels = booksByGenre().find((g) => g.genre === "Gospels");
    expect(gospels?.books.map((b) => b.slug)).toEqual([
      "matthew",
      "mark",
      "luke",
      "john",
      "acts",
    ]);
  });

  it("puts Revelation alone under Apocalypse", () => {
    const apocalypse = booksByGenre().find((g) => g.genre === "Apocalypse");
    expect(apocalypse?.books.map((b) => b.name)).toEqual(["Revelation"]);
  });
});

describe("prevChapter / nextChapter", () => {
  it("walks within a book", () => {
    expect(nextChapter("genesis", 1)).toMatchObject({ book: { slug: "genesis" }, chapter: 2 });
    expect(prevChapter("genesis", 2)).toMatchObject({ book: { slug: "genesis" }, chapter: 1 });
  });

  it("crosses book boundaries", () => {
    expect(nextChapter("genesis", 50)).toMatchObject({ book: { slug: "exodus" }, chapter: 1 });
    expect(prevChapter("exodus", 1)).toMatchObject({ book: { slug: "genesis" }, chapter: 50 });
    expect(nextChapter("malachi", 4)).toMatchObject({ book: { slug: "matthew" }, chapter: 1 });
    expect(prevChapter("matthew", 1)).toMatchObject({ book: { slug: "malachi" }, chapter: 4 });
  });

  it("stops at the canon edges", () => {
    expect(prevChapter("genesis", 1)).toBeNull();
    expect(nextChapter("revelation", 22)).toBeNull();
  });

  it("returns null for unknown slugs", () => {
    expect(prevChapter("opinions", 1)).toBeNull();
    expect(nextChapter("opinions", 1)).toBeNull();
  });
});

describe("parseReference", () => {
  it("parses plain book + chapter", () => {
    expect(parseReference("john 3")).toMatchObject({ book: { slug: "john" }, chapter: 3 });
    expect(parseReference("Genesis 1")).toMatchObject({ book: { slug: "genesis" }, chapter: 1 });
  });

  it("parses abbreviations and squeezed forms", () => {
    expect(parseReference("1 cor 13")).toMatchObject({ book: { slug: "1-corinthians" }, chapter: 13 });
    expect(parseReference("1cor13")).toMatchObject({ book: { slug: "1-corinthians" }, chapter: 13 });
    expect(parseReference("ps23")).toMatchObject({ book: { slug: "psalms" }, chapter: 23 });
    expect(parseReference("Ps. 23")).toMatchObject({ book: { slug: "psalms" }, chapter: 23 });
    expect(parseReference("mt 5")).toMatchObject({ book: { slug: "matthew" }, chapter: 5 });
    expect(parseReference("1 kgs 8")).toMatchObject({ book: { slug: "1-kings" }, chapter: 8 });
    expect(parseReference("sos 2")).toMatchObject({ book: { slug: "song-of-solomon" }, chapter: 2 });
    expect(parseReference("jas 3")).toMatchObject({ book: { slug: "james" }, chapter: 3 });
    expect(parseReference("1 jn 4")).toMatchObject({ book: { slug: "1-john" }, chapter: 4 });
  });

  it("resolves conventional abbreviations where prefixes are ambiguous", () => {
    expect(parseReference("phil 2")).toMatchObject({ book: { slug: "philippians" }, chapter: 2 });
    expect(parseReference("phlm 1")).toMatchObject({ book: { slug: "philemon" }, chapter: 1 });
  });

  it("defaults to chapter 1 on a bare book", () => {
    expect(parseReference("john")).toMatchObject({ book: { slug: "john" }, chapter: 1 });
    expect(parseReference("jude")).toMatchObject({ book: { slug: "jude" }, chapter: 1 });
    expect(parseReference("gen")).toMatchObject({ book: { slug: "genesis" }, chapter: 1 });
  });

  it("captures a verse when given", () => {
    expect(parseReference("john 3:16")).toMatchObject({ book: { slug: "john" }, chapter: 3, verse: 16 });
    expect(parseReference("acts 20:28")).toMatchObject({ book: { slug: "acts" }, chapter: 20, verse: 28 });
    expect(parseReference("john 3 16")).toMatchObject({ chapter: 3, verse: 16 });
  });

  it("omits verse from the result when the input has none", () => {
    expect(parseReference("romans 8")).not.toHaveProperty("verse");
  });

  it("rejects out-of-range chapters", () => {
    expect(parseReference("john 22")).toBeNull(); // John has 21
    expect(parseReference("obadiah 2")).toBeNull(); // Obadiah has 1
    expect(parseReference("genesis 0")).toBeNull();
  });

  it("rejects ambiguous prefixes, unknown books, and junk", () => {
    expect(parseReference("ju 3")).toBeNull(); // Judges? Jude?
    expect(parseReference("xyz 3")).toBeNull();
    expect(parseReference("")).toBeNull();
    expect(parseReference("   ")).toBeNull();
    expect(parseReference("3")).toBeNull();
  });
});

describe("referenceToUrl", () => {
  it("builds reader URLs with verse anchors", () => {
    expect(referenceToUrl("John 3:16")).toBe("/bible/john/3#v16");
    expect(referenceToUrl("1 Corinthians 13:4")).toBe("/bible/1-corinthians/13#v4");
    expect(referenceToUrl("Song of Solomon 2:1")).toBe("/bible/song-of-solomon/2#v1");
  });

  it("omits the anchor without a verse", () => {
    expect(referenceToUrl("Romans 8")).toBe("/bible/romans/8");
  });

  it("returns null for unparseable references", () => {
    expect(referenceToUrl("The Shack 3:16")).toBeNull();
  });
});

describe("parseESVChapterText", () => {
  const GENESIS_1_OPENING = [
    "  [1] In the beginning, God created the heavens and the earth. [2] The earth was without form and void, and darkness was over the face of the deep. And the Spirit of God was hovering over the face of the waters.",
    "",
    '  [3] And God said, "Let there be light," and there was light. [4] And God saw that the light was good. And God separated the light from the darkness.',
  ].join("\n");

  it("splits blank-line paragraphs and inline [N] markers into segments", () => {
    const paragraphs = parseESVChapterText(GENESIS_1_OPENING);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].segments).toEqual([
      {
        verse: 1,
        text: "In the beginning, God created the heavens and the earth.",
      },
      {
        verse: 2,
        text: "The earth was without form and void, and darkness was over the face of the deep. And the Spirit of God was hovering over the face of the waters.",
      },
    ]);
    expect(paragraphs[1].segments.map((s) => s.verse)).toEqual([3, 4]);
    expect(paragraphs[1].segments[0].text).toBe(
      'And God said, "Let there be light," and there was light.'
    );
  });

  const PSALM_23_OPENING = [
    "    A Psalm of David.",
    "",
    "  [1] The LORD is my shepherd; I shall not want.",
    "  [2] He makes me lie down in green pastures.",
    "He leads me beside still waters.",
    "  [3] He restores my soul.",
  ].join("\n");

  it("keeps untagged lead text (psalm superscriptions) as a verse-null segment", () => {
    const paragraphs = parseESVChapterText(PSALM_23_OPENING);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].segments).toEqual([{ verse: null, text: "A Psalm of David." }]);
  });

  it("collapses line breaks inside a stanza to spaces (documented poetry simplification)", () => {
    const paragraphs = parseESVChapterText(PSALM_23_OPENING);
    expect(paragraphs[1].segments).toEqual([
      { verse: 1, text: "The LORD is my shepherd; I shall not want." },
      { verse: 2, text: "He makes me lie down in green pastures. He leads me beside still waters." },
      { verse: 3, text: "He restores my soul." },
    ]);
  });

  it("strips a defensive trailing (ESV) tag", () => {
    expect(parseESVChapterText("[1] Jesus wept. (ESV)")).toEqual([
      { segments: [{ verse: 1, text: "Jesus wept." }] },
    ]);
  });

  it("returns [] for empty input", () => {
    expect(parseESVChapterText("")).toEqual([]);
    expect(parseESVChapterText("\n\n  \n")).toEqual([]);
  });
});
