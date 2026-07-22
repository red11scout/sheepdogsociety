import { describe, expect, it } from "vitest";
import {
  chunk,
  dedupeRecipients,
  unsubscribeToken,
  verifyUnsubscribeToken,
} from "./helpers";

const SECRET = "test-secret-for-unsubscribe-tokens";
const MEMBER_ID = "0b8f9c3a-1111-4222-8333-abcdefabcdef";

describe("unsubscribeToken", () => {
  it("round-trips: a generated token verifies", () => {
    const t = unsubscribeToken(MEMBER_ID, SECRET);
    expect(verifyUnsubscribeToken(MEMBER_ID, t, SECRET)).toBe(true);
  });

  it("is deterministic for the same member + secret", () => {
    expect(unsubscribeToken(MEMBER_ID, SECRET)).toBe(
      unsubscribeToken(MEMBER_ID, SECRET)
    );
  });

  it("rejects a tampered token", () => {
    const t = unsubscribeToken(MEMBER_ID, SECRET);
    const tampered = t.slice(0, -1) + (t.endsWith("a") ? "b" : "a");
    expect(verifyUnsubscribeToken(MEMBER_ID, tampered, SECRET)).toBe(false);
  });

  it("rejects a token minted for a different member", () => {
    const t = unsubscribeToken("some-other-member-id", SECRET);
    expect(verifyUnsubscribeToken(MEMBER_ID, t, SECRET)).toBe(false);
  });

  it("rejects a token minted with a different secret", () => {
    const t = unsubscribeToken(MEMBER_ID, "wrong-secret");
    expect(verifyUnsubscribeToken(MEMBER_ID, t, SECRET)).toBe(false);
  });

  it("rejects empty inputs and wrong-length tokens without throwing", () => {
    expect(verifyUnsubscribeToken("", "", SECRET)).toBe(false);
    expect(verifyUnsubscribeToken(MEMBER_ID, "short", SECRET)).toBe(false);
  });
});

describe("dedupeRecipients", () => {
  it("dedupes case-insensitively, first occurrence wins", () => {
    const out = dedupeRecipients([
      { memberId: "1", email: "A@x.com", firstName: "A" },
      { memberId: "2", email: "a@x.com", firstName: "B" },
      { memberId: "3", email: "b@x.com", firstName: "C" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].memberId).toBe("1");
    expect(out[1].email).toBe("b@x.com");
  });

  it("drops blank emails and trims the rest", () => {
    const out = dedupeRecipients([
      { memberId: "1", email: "  ", firstName: null },
      { memberId: "2", email: " c@x.com ", firstName: null },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].email).toBe("c@x.com");
  });
});

describe("chunk", () => {
  it("splits into batches of the given size", () => {
    const out = chunk([1, 2, 3, 4, 5], 2);
    expect(out).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns one batch when under the size", () => {
    expect(chunk([1, 2], 100)).toEqual([[1, 2]]);
  });

  it("handles empty input", () => {
    expect(chunk([], 100)).toEqual([]);
  });

  it("rejects a nonsensical size", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});
