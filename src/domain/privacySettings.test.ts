import { describe, expect, it } from "vitest";
import { parsePrivacySettings } from "./privacySettings";

describe("parsePrivacySettings", () => {
  it("shares run stats by default and on corrupt values", () => {
    expect(parsePrivacySettings(null)).toEqual({ shareRunStats: true });
    expect(parsePrivacySettings("{oops")).toEqual({ shareRunStats: true });
    expect(parsePrivacySettings(JSON.stringify({ shareRunStats: "no" }))).toEqual({
      shareRunStats: true,
    });
  });

  it("keeps an opt-out", () => {
    expect(parsePrivacySettings(JSON.stringify({ shareRunStats: false }))).toEqual({
      shareRunStats: false,
    });
  });
});
