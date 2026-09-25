import { describe, expect, it } from "vitest";
import {
  AUDIO_LEVEL_MAX,
  AUDIO_SETTINGS_VERSION,
  categoryForSfx,
  clampLevel,
  defaultAudioSettings,
  effectiveVolume,
  parseAudioSettings,
  serializeAudioSettings,
} from "./audioSettings";

describe("defaultAudioSettings", () => {
  it("defaults both categories on at max level", () => {
    expect(defaultAudioSettings()).toEqual({
      version: AUDIO_SETTINGS_VERSION,
      musicEnabled: true,
      musicLevel: AUDIO_LEVEL_MAX,
      sfxEnabled: true,
      sfxLevel: AUDIO_LEVEL_MAX,
    });
  });
});

describe("clampLevel", () => {
  it("clamps and rounds to 0..10", () => {
    expect(clampLevel(-1)).toBe(0);
    expect(clampLevel(11)).toBe(10);
    expect(clampLevel(4.6)).toBe(5);
    expect(clampLevel(Number.NaN)).toBe(10);
  });
});

describe("effectiveVolume", () => {
  it("scales manifest volume by level/10 when enabled", () => {
    expect(effectiveVolume(0.5, true, 10)).toBe(0.5);
    expect(effectiveVolume(0.5, true, 5)).toBe(0.25);
    expect(effectiveVolume(0.3, true, 0)).toBe(0);
  });

  it("returns 0 when disabled regardless of level", () => {
    expect(effectiveVolume(0.5, false, 10)).toBe(0);
    expect(effectiveVolume(0.5, false, 5)).toBe(0);
  });
});

describe("categoryForSfx", () => {
  it("maps music tracks to music and everything else to sfx", () => {
    expect(categoryForSfx("gameplayMusic")).toBe("music");
    expect(categoryForSfx("menuMusic")).toBe("music");
    expect(categoryForSfx("pelletMunch")).toBe("sfx");
    expect(categoryForSfx("death")).toBe("sfx");
  });
});

describe("parseAudioSettings / serializeAudioSettings", () => {
  it("round-trips valid settings", () => {
    const settings = {
      version: AUDIO_SETTINGS_VERSION,
      musicEnabled: false,
      musicLevel: 3,
      sfxEnabled: true,
      sfxLevel: 7,
    } as const;
    expect(parseAudioSettings(serializeAudioSettings(settings))).toEqual(settings);
  });

  it("falls back to defaults for null, corrupt, or wrong version", () => {
    const defaults = defaultAudioSettings();
    expect(parseAudioSettings(null)).toEqual(defaults);
    expect(parseAudioSettings("{broken")).toEqual(defaults);
    expect(parseAudioSettings(JSON.stringify({ version: 99 }))).toEqual(defaults);
  });

  it("clamps out-of-range levels on parse", () => {
    const parsed = parseAudioSettings(
      JSON.stringify({
        version: AUDIO_SETTINGS_VERSION,
        musicEnabled: true,
        musicLevel: 99,
        sfxEnabled: false,
        sfxLevel: -4,
      }),
    );
    expect(parsed.musicLevel).toBe(10);
    expect(parsed.sfxLevel).toBe(0);
    expect(parsed.sfxEnabled).toBe(false);
  });
});
