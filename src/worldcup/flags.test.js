// src/worldcup/flags.test.js
import { describe, it, expect } from "vitest";
import { flagFor } from "./flags.js";

describe("flagFor", () => {
  it("maps ISO countries to flag emoji", () => {
    expect(flagFor("Qatar")).toBe("🇶🇦");
    expect(flagFor("Switzerland")).toBe("🇨🇭");
    expect(flagFor("Brazil")).toBe("🇧🇷");
    expect(flagFor("USA")).toBe("🇺🇸");
  });
  it("handles home nations with a subdivision flag", () => {
    expect(flagFor("England")).not.toBe("🏳️");
    expect([...flagFor("England")].length).toBeGreaterThan(2);
  });
  it("falls back to a white flag for unknown teams", () => {
    expect(flagFor("Atlantis")).toBe("🏳️");
  });
});
