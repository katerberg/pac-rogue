import { describe, expect, it } from "vitest";
import {
  SETTINGS_FOCUS_COUNT,
  SETTINGS_FOCUS_GHOST_STYLE,
  resolveSettingsFocusIndex,
} from "./settingsFocus";

describe("resolveSettingsFocusIndex", () => {
  it("keeps the STYLE row after a style-change restart", () => {
    expect(resolveSettingsFocusIndex(SETTINGS_FOCUS_GHOST_STYLE)).toBe(SETTINGS_FOCUS_GHOST_STYLE);
  });

  it("defaults missing focus to the top row", () => {
    expect(resolveSettingsFocusIndex(undefined)).toBe(0);
  });

  it("rejects out-of-range and non-integer values", () => {
    expect(resolveSettingsFocusIndex(-1)).toBe(0);
    expect(resolveSettingsFocusIndex(SETTINGS_FOCUS_COUNT)).toBe(0);
    expect(resolveSettingsFocusIndex(1.5)).toBe(0);
  });
});
