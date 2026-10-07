import { describe, expect, it } from "vitest";
import { fitFontSize } from "./fitFontSize";

describe("fitFontSize", () => {
  it("keeps the preferred size when the longest word fits", () => {
    expect(fitFontSize("Speed Up", 300, 32, "pixel")).toBe(32);
  });

  it("shrinks in whole glyph steps for long words", () => {
    expect(fitFontSize("Remote Transference", 300, 32, "pixel")).toBe(24);
  });

  it("fits a long upgrade name inside the choice card", () => {
    expect(fitFontSize("Remote Transference", 214, 22, "pixel")).toBe(16);
  });

  it("never drops below one glyph for pixel", () => {
    expect(fitFontSize("Supercalifragilisticexpialidocious", 100, 32, "pixel")).toBe(8);
  });

  it("defaults to the pixel path when style is omitted", () => {
    expect(fitFontSize("Remote Transference", 214, 22)).toBe(16);
  });

  it("neon title fit stays at or above the 16 floor and at or below preferred", () => {
    const size = fitFontSize("Turn Tuning+", 214, 22, "neon");
    expect(size).toBeGreaterThanOrEqual(16);
    expect(size).toBeLessThanOrEqual(22);
  });

  it("neon long titles at choice width do not fall below the title floor", () => {
    expect(fitFontSize("Remote Transference", 214, 22, "neon")).toBeGreaterThanOrEqual(16);
  });

  it("neon panel titles (preferred 16) floor at 8", () => {
    const size = fitFontSize("Supercalifragilisticexpialidocious", 100, 16, "neon");
    expect(size).toBe(8);
  });
});
