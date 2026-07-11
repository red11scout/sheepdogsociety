import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-compat", () => ({ auth: vi.fn() }));
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
  },
}));
vi.mock("ai", () => ({ generateObject: vi.fn() }));
vi.mock("@/lib/studio/get", () => ({ getStudioConfig: vi.fn() }));

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { generateObject } from "ai";
import { getStudioConfig } from "@/lib/studio/get";
import { recommendForPage, assistField } from "./studio-ai";

function mockAdmin() {
  vi.mocked(auth).mockResolvedValue({ userId: "u1" } as never);
  vi.mocked(db.select).mockReturnValue({
    from: () => ({ where: () => Promise.resolve([{ id: "u1", role: "admin" }]) }),
  } as never);
}

describe("recommendForPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStudioConfig).mockResolvedValue({ themeId: "pasture-iron", pages: {} });
  });

  it("returns ok:false when not signed in", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: undefined } as never);
    const result = await recommendForPage("about");
    expect(result.ok).toBe(false);
  });

  it("returns ok:false for an unknown pageId (no AI call made)", async () => {
    mockAdmin();
    const result = await recommendForPage("not-a-real-page");
    expect(result.ok).toBe(false);
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("returns suggestions and logs to ai_generations on success", async () => {
    mockAdmin();
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [{ what: "Tighten the mission paragraph.", why: "It runs long for mobile." }],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    } as never);
    const result = await recommendForPage("about");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].what).toContain("Tighten");
    }
    expect(db.insert).toHaveBeenCalled();
  });

  it("drops a suggestion whose 'why' contains banned language", async () => {
    mockAdmin();
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { what: "Rewrite the hero.", why: "It doesn't delve deep enough into the mission." },
          { what: "Shorten the culture list.", why: "Four items reads long on mobile." },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    } as never);
    const result = await recommendForPage("about");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].what).toContain("Shorten");
    }
  });
});

describe("assistField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok:false for an unknown key (no AI call made)", async () => {
    mockAdmin();
    const result = await assistField("not.a.real.key", "some text", "tighten");
    expect(result.ok).toBe(false);
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("returns a draft + why on success", async () => {
    mockAdmin();
    vi.mocked(generateObject).mockResolvedValue({
      object: { draft: "Shorter mission copy.", why: "Cut the repetition." },
      usage: { inputTokens: 80, outputTokens: 30 },
    } as never);
    const result = await assistField("about.mission.body", "Our mission is our mission to serve.", "tighten");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.draft).toBe("Shorter mission copy.");
  });

  it("rejects a draft containing banned language", async () => {
    mockAdmin();
    vi.mocked(generateObject).mockResolvedValue({
      object: { draft: "Let's delve into our mission.", why: "More engaging." },
      usage: { inputTokens: 80, outputTokens: 30 },
    } as never);
    const result = await assistField("about.mission.body", "Our mission.", "warm-up");
    expect(result.ok).toBe(false);
  });
});
