import { afterEach, describe, expect, it, vi } from "vitest";
import { localParse, verifyReference } from "./verify-reference";

afterEach(() => vi.unstubAllGlobals());

describe("localParse", () => {
  it("accepts real references and rejects fakes without network", () => {
    expect(localParse("John 15:5")).toBe("parses");
    expect(localParse("Psalm 23")).toBe("parses");
    expect(localParse("Hesitations 3:16")).toBe("invalid");
    expect(localParse("John 99")).toBe("invalid"); // chapter out of range
  });
});

describe("verifyReference", () => {
  it("invalid locally never touches the network", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await verifyReference("Hesitations 3:16")).toBe("invalid");
    expect(spy).not.toHaveBeenCalled();
  });
  it("ESV empty passages means invalid", async () => {
    vi.stubEnv("ESV_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ passages: [] }), { status: 200 })));
    expect(await verifyReference("John 15:5")).toBe("invalid");
  });
  it("ESV non-200 or missing key means unavailable, never a throw", async () => {
    vi.stubEnv("ESV_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 503 })));
    expect(await verifyReference("John 15:5")).toBe("unavailable");
    vi.stubEnv("ESV_API_KEY", "");
    expect(await verifyReference("John 15:5")).toBe("unavailable");
  });
  it("ESV passage present means valid", async () => {
    vi.stubEnv("ESV_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ passages: ["Abide in me..."] }), { status: 200 })));
    expect(await verifyReference("John 15:5")).toBe("valid");
  });
});
