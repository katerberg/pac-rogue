import { describe, expect, it } from "vitest";
import { GLOW_HALO_PEAK_ALPHA, glowHaloStepAlpha } from "./glowHalo";

describe("glowHaloStepAlpha", () => {
  it("fades quadratically from near peak at the edge toward zero at the reach", () => {
    expect(glowHaloStepAlpha(0, 4)).toBe(GLOW_HALO_PEAK_ALPHA);
    expect(glowHaloStepAlpha(1, 4)).toBeCloseTo(GLOW_HALO_PEAK_ALPHA * 0.64);
    expect(glowHaloStepAlpha(4, 4)).toBeCloseTo(GLOW_HALO_PEAK_ALPHA * 0.04);
    expect(glowHaloStepAlpha(2, 4)).toBeLessThan(glowHaloStepAlpha(1, 4));
  });
});
