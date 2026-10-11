import { describe, expect, it } from "vitest";
import { SETTINGS_FOCUS_COUNT, resolveSettingsFocusIndex } from "./settingsFocus";

describe("resolveSettingsFocusIndex", () => {
  it("keeps a valid STYLE-row index after a style-change restart", () => {
    expect(resolveSettingsFocusIndex(3)).toBe(3);
  });

  it("keeps the SHARE RUN STATS and BACK rows, the last two", () => {
    expect(SETTINGS_FOCUS_COUNT).toBe(6);
    expect(resolveSettingsFocusIndex(4)).toBe(4);
    expect(resolveSettingsFocusIndex(5)).toBe(5);
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
