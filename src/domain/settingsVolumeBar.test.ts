import { describe, expect, it } from "vitest";
import { AUDIO_LEVEL_MAX } from "./audioSettings";
import { BONUS_COLORS, BONUS_NEON_TRACK } from "./bonusBarFx";
import {
  settingsVolumeGlowFilter,
  settingsVolumeTube,
  settingsVolumeUsesNeonTube,
} from "./settingsVolumeBar";

const LAYOUT = { x: 10, y: 20, w: 220, h: 16 };

describe("settingsVolumeUsesNeonTube", () => {
  it("is neon/lined only", () => {
    expect(settingsVolumeUsesNeonTube("neon")).toBe(true);
    expect(settingsVolumeUsesNeonTube("lined")).toBe(true);
    expect(settingsVolumeUsesNeonTube("pixel")).toBe(false);
  });
});

describe("settingsVolumeTube", () => {
  it("maps level to fillFrac and uses bonus palette when enabled", () => {
    expect(settingsVolumeTube(0, LAYOUT, true)).toMatchObject({
      ...LAYOUT,
      fillFrac: 0,
      fillColor: BONUS_COLORS.fill,
      coreColor: BONUS_COLORS.highlight,
      frameColor: BONUS_COLORS.frame,
      trackColor: BONUS_NEON_TRACK,
    });
    expect(settingsVolumeTube(AUDIO_LEVEL_MAX, LAYOUT, true).fillFrac).toBe(1);
    expect(settingsVolumeTube(5, LAYOUT, true).fillFrac).toBe(0.5);
  });

  it("dims colors when the category is disabled but keeps fillFrac", () => {
    const tube = settingsVolumeTube(8, LAYOUT, false);
    expect(tube.fillFrac).toBeCloseTo(0.8, 5);
    expect(tube.fillColor).not.toBe(BONUS_COLORS.fill);
    expect(tube.frameColor).not.toBe(BONUS_COLORS.frame);
  });
});

describe("settingsVolumeGlowFilter", () => {
  it("matches the bonus bar glow gate", () => {
    expect(settingsVolumeGlowFilter("neon")).toEqual({ outerStrength: 7, distance: 18 });
    expect(settingsVolumeGlowFilter("lined")).toBeNull();
    expect(settingsVolumeGlowFilter("pixel")).toBeNull();
  });
});
