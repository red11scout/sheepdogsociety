import { describe, it, expect } from "vitest";
import { tidyTitleFromFilename } from "./title-from-filename";

describe("tidyTitleFromFilename", () => {
  it("strips the document extension", () => {
    expect(tidyTitleFromFilename("The Stoic Christian.docx")).toBe(
      "The Stoic Christian"
    );
    expect(tidyTitleFromFilename("Manning Your Post.pdf")).toBe(
      "Manning Your Post"
    );
    expect(tidyTitleFromFilename("The Man In The Arena.doc")).toBe(
      "The Man in the Arena"
    );
  });

  it("trims trailing whitespace before the extension", () => {
    expect(
      tidyTitleFromFilename("Doing What’s Right Because It’s Right .docx")
    ).toBe("Doing What’s Right Because It’s Right");
  });

  it("normalizes spaced dashes to a single en-dash separator", () => {
    expect(tidyTitleFromFilename("Finish Strong – Galatians 6.docx")).toBe(
      "Finish Strong – Galatians 6"
    );
    expect(
      tidyTitleFromFilename("Free Will and God’s Will — Choose This Day.docx")
    ).toBe("Free Will and God’s Will – Choose This Day");
    expect(tidyTitleFromFilename("Meek Defenders - 2nd amendment.docx")).toBe(
      "Meek Defenders – 2nd Amendment"
    );
  });

  it("treats a dash with a space on only one side as a separator", () => {
    expect(
      tidyTitleFromFilename("Series- Freedom in Giving.docx")
    ).toBe("Series – Freedom in Giving");
    expect(
      tidyTitleFromFilename(
        "4-week Series- Freedom in Giving – from Tithing to Grace.docx"
      )
    ).toBe("4-week Series – Freedom in Giving – from Tithing to Grace");
  });

  it("preserves real hyphens inside words", () => {
    expect(tidyTitleFromFilename("The Work-Life Balance Myth.docx")).toBe(
      "The Work-Life Balance Myth"
    );
    expect(tidyTitleFromFilename("Red-Pilled by Jesus.docx")).toBe(
      "Red-Pilled by Jesus"
    );
  });

  it("strips a redundant leading Men's Bible Study prefix", () => {
    expect(
      tidyTitleFromFilename(
        "Introduction for Men’s Bible Study- Leading the Way.docx"
      )
    ).toBe("Leading the Way");
    expect(
      tidyTitleFromFilename("Men's Bible Study: Why Men Should Not Be Idle.docx")
    ).toBe("Why Men Should Not Be Idle");
  });

  it("lowercases connector words mid-title but not at the edges", () => {
    expect(
      tidyTitleFromFilename("Not for Self, but for Others.docx")
    ).toBe("Not for Self, but for Others");
    expect(tidyTitleFromFilename("The Father’s Heart.docx")).toBe(
      "The Father’s Heart"
    );
  });

  it("title-cases ALL-CAPS and all-lowercase words, leaves mixed case", () => {
    expect(tidyTitleFromFilename("FROM WOLF TO SHEEPDOG.docx")).toBe(
      "From Wolf to Sheepdog"
    );
    expect(tidyTitleFromFilename("the exhaustion many men carry.docx")).toBe(
      "The Exhaustion Many Men Carry"
    );
    // Mixed-case tokens (numbers, apostrophes) survive.
    expect(
      tidyTitleFromFilename("The 5 Solas – Five Pillars Every Man Must Stand On.docx")
    ).toBe("The 5 Solas – Five Pillars Every Man Must Stand On");
  });

  it("collapses underscores and repeated spaces", () => {
    expect(tidyTitleFromFilename("The_Man_Who_Builds.docx")).toBe(
      "The Man Who Builds"
    );
    expect(tidyTitleFromFilename("Righteous   Anger.docx")).toBe(
      "Righteous Anger"
    );
  });

  it("handles a full path prefix", () => {
    expect(
      tidyTitleFromFilename("resources/bible-studies/1699-Sheepdogs of the Flock.docx")
    ).toBe("1699-Sheepdogs of the Flock");
  });
});
