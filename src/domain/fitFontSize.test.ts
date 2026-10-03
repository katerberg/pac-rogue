import { describe, expect, it } from "vitest";
import { fitFontSize } from "./fitFontSize";

describe("fitFontSize", () => {
  it("keeps the preferred size when the longest word fits", () => {
    expect(fitFontSize("Speed Up", 300, 32)).toBe(32);
  });

  it("shrinks in whole glyph steps for long words", () => {
    expect(fitFontSize("Remote Transference", 300, 32)).toBe(24);
  });

  it("fits the longest upgrade word into the store panel and purchase modal", () => {
    expect(fitFontSize("Remote Transference", 168 - 16, 16)).toBe(8);
    expect(fitFontSize("Remote Transference", 340 - 40, 32)).toBe(24);
  });

  it("never drops below one glyph", () => {
    expect(fitFontSize("Supercalifragilisticexpialidocious", 100, 32)).toBe(8);
  });
});
