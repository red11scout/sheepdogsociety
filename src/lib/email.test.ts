import { afterEach, describe, expect, it } from "vitest";
import { notifyRecipients, SHEPHERD_EMAIL } from "./email";

const ORIGINAL = process.env.NOTIFY_EMAILS;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NOTIFY_EMAILS;
  else process.env.NOTIFY_EMAILS = ORIGINAL;
});

describe("notifyRecipients", () => {
  it("is shepherd@ alone when NOTIFY_EMAILS is unset", () => {
    delete process.env.NOTIFY_EMAILS;
    expect(notifyRecipients()).toEqual([SHEPHERD_EMAIL]);
  });

  it("appends trimmed extra addresses", () => {
    process.env.NOTIFY_EMAILS = " a@example.com , b@example.com";
    expect(notifyRecipients()).toEqual([SHEPHERD_EMAIL, "a@example.com", "b@example.com"]);
  });

  it("drops blanks, junk, and duplicates of shepherd@", () => {
    process.env.NOTIFY_EMAILS = `,not-an-email, ${SHEPHERD_EMAIL.toUpperCase()}, c@example.com,`;
    expect(notifyRecipients()).toEqual([SHEPHERD_EMAIL, "c@example.com"]);
  });
});
