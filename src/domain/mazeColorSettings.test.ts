import { describe, expect, it } from "vitest";
import {
  MAZE_COLOR_INDEX_MAX,
  MAZE_COLOR_OPTIONS,
  MAZE_COLOR_SETTINGS_VERSION,
  clampMazeColorIndex,
  defaultMazeColorSettings,
  mazeColorForIndex,
  parseMazeColorSettings,
  serializeMazeColorSettings,
} from "./mazeColorSettings";

describe("defaultMazeColorSettings", () => {
  it("defaults to the first color option", () => {
    expect(defaultMazeColorSettings()).toEqual({
      version: MAZE_COLOR_SETTINGS_VERSION,
      colorIndex: 0,
    });
  });
});

describe("MAZE_COLOR_OPTIONS", () => {
  it("has 4 distinct colors", () => {
    expect(MAZE_COLOR_OPTIONS).toHaveLength(4);
    expect(new Set(MAZE_COLOR_OPTIONS.map((option) => option.color)).size).toBe(4);
  });
});

describe("clampMazeColorIndex", () => {
  it("clamps and rounds to the valid option range", () => {
    expect(clampMazeColorIndex(-1)).toBe(0);
    expect(clampMazeColorIndex(99)).toBe(MAZE_COLOR_INDEX_MAX);
    expect(clampMazeColorIndex(1.6)).toBe(2);
    expect(clampMazeColorIndex(Number.NaN)).toBe(0);
  });
});

describe("mazeColorForIndex", () => {
  it("resolves the option color for a clamped index", () => {
    expect(mazeColorForIndex(0)).toBe(MAZE_COLOR_OPTIONS[0]!.color);
    expect(mazeColorForIndex(99)).toBe(MAZE_COLOR_OPTIONS[MAZE_COLOR_INDEX_MAX]!.color);
  });
});

describe("parseMazeColorSettings / serializeMazeColorSettings", () => {
  it("round-trips valid settings", () => {
    const settings = { version: MAZE_COLOR_SETTINGS_VERSION, colorIndex: 2 } as const;
    expect(parseMazeColorSettings(serializeMazeColorSettings(settings))).toEqual(settings);
  });

  it("falls back to defaults for null, corrupt, or wrong version", () => {
    const defaults = defaultMazeColorSettings();
    expect(parseMazeColorSettings(null)).toEqual(defaults);
    expect(parseMazeColorSettings("{broken")).toEqual(defaults);
    expect(parseMazeColorSettings(JSON.stringify({ version: 99 }))).toEqual(defaults);
  });

  it("clamps out-of-range color index on parse", () => {
    const parsed = parseMazeColorSettings(
      JSON.stringify({ version: MAZE_COLOR_SETTINGS_VERSION, colorIndex: 99 }),
    );
    expect(parsed.colorIndex).toBe(MAZE_COLOR_INDEX_MAX);
  });
});
