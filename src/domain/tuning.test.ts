import { describe, expect, it } from "vitest";
import { GHOST_ELROY2_SPEED, GHOST_HOUSE_EXIT_SPEED, GHOST_TUNNEL_SPEED_RATIO } from "./ghostSpeed";
import {
  BASE_CLYDE_RELEASE_PELLETS,
  BASE_ELROY1_DOTS_LEFT,
  BASE_ELROY2_DOTS_LEFT,
  BASE_FRUIT_SPAWN_THRESHOLDS,
  BASE_INKY_RELEASE_PELLETS,
  MAZE_BACKGROUND_COLOR,
  WALL_CORNER_RADIUS,
  WALL_STROKE_COLOR,
} from "./maze";
import { PLAYER_SPEED } from "./playfield";
import {
  DEFAULT_TUNING,
  diffFromDefault,
  effectiveGhostTilesPerSec,
  ghostBaseSpeedRatio,
  parseHexColor,
  parseTuningOverrides,
  resolveTuning,
  serializeTuningOverrides,
  speedLevelMultiplier,
} from "./tuning";

describe("DEFAULT_TUNING", () => {
  it("matches the gameplay constants it replaces", () => {
    expect(DEFAULT_TUNING.inkyReleasePellets).toBe(BASE_INKY_RELEASE_PELLETS);
    expect(DEFAULT_TUNING.clydeReleasePellets).toBe(BASE_CLYDE_RELEASE_PELLETS);
    expect(DEFAULT_TUNING.elroy1DotsLeft).toBe(BASE_ELROY1_DOTS_LEFT);
    expect(DEFAULT_TUNING.elroy2DotsLeft).toBe(BASE_ELROY2_DOTS_LEFT);
    expect([DEFAULT_TUNING.fruitThreshold1, DEFAULT_TUNING.fruitThreshold2]).toEqual(
      BASE_FRUIT_SPAWN_THRESHOLDS,
    );
    expect(DEFAULT_TUNING.wallColor).toBe(WALL_STROKE_COLOR);
    expect(DEFAULT_TUNING.wallThickness).toBe(1.5);
    expect(DEFAULT_TUNING.wallGlow).toBe(4);
    expect(DEFAULT_TUNING.wallGlowRadius).toBe(21);
    expect(DEFAULT_TUNING.wallCornerRadius).toBe(WALL_CORNER_RADIUS);
    expect(DEFAULT_TUNING.backgroundColor).toBe(MAZE_BACKGROUND_COLOR);
    expect(GHOST_TUNNEL_SPEED_RATIO).toBe(0.6);
    expect(GHOST_HOUSE_EXIT_SPEED).toBe(PLAYER_SPEED * 0.5);
    expect(GHOST_ELROY2_SPEED).toBe(PLAYER_SPEED * (85 / 80));
  });

  it("keeps the level speed ramps", () => {
    expect(speedLevelMultiplier(3)).toBeCloseTo(1.1);
    expect(ghostBaseSpeedRatio(1)).toBeCloseTo(0.8);
    expect(ghostBaseSpeedRatio(9)).toBe(1);
  });
});

describe("parseTuningOverrides", () => {
  it("round-trips serialized overrides", () => {
    const raw = serializeTuningOverrides({ playerSpeedTiles: 9, level1ChaseOnly: false });
    expect(parseTuningOverrides(raw)).toEqual({
      overrides: { playerSpeedTiles: 9, level1ChaseOnly: false },
      warning: null,
    });
  });

  it("drops unknown keys and wrong types, clamps and snaps ranges", () => {
    const raw = JSON.stringify({
      version: 1,
      overrides: {
        nope: 3,
        timerMax: 5000,
        eatDragMs: 103,
        level1ChaseOnly: "yes",
        wallColor: 0x1ff0000,
        deathHoldMs: "100",
      },
    });
    expect(parseTuningOverrides(raw).overrides).toEqual({
      timerMax: 999,
      eatDragMs: 105,
      wallColor: 0xffffff,
    });
  });

  it("warns and falls back on bad JSON or an unknown version", () => {
    expect(parseTuningOverrides("{").overrides).toEqual({});
    expect(parseTuningOverrides("{").warning).not.toBeNull();
    const old = parseTuningOverrides(JSON.stringify({ version: 0, overrides: { timerMax: 50 } }));
    expect(old.overrides).toEqual({});
    expect(old.warning).not.toBeNull();
    expect(parseTuningOverrides(null)).toEqual({ overrides: {}, warning: null });
  });
});

describe("resolveTuning / diffFromDefault", () => {
  it("fills defaults and diffs back to only the overrides", () => {
    expect(resolveTuning({})).toEqual(DEFAULT_TUNING);
    expect(diffFromDefault(DEFAULT_TUNING)).toEqual({});
    expect(diffFromDefault(resolveTuning({ chaseMs: 9000 }))).toEqual({ chaseMs: 9000 });
  });
});

describe("effectiveGhostTilesPerSec", () => {
  it("combines player speed, ghost ratio and level ramp", () => {
    expect(effectiveGhostTilesPerSec(DEFAULT_TUNING, 1)).toBeCloseTo(7.315 * 0.8);
    expect(effectiveGhostTilesPerSec(DEFAULT_TUNING, 3)).toBeCloseTo(7.315 * 0.9 * 1.1);
    const tuned = resolveTuning({ ghostRatioStart: 1.2, ghostRatioCap: 1.5 });
    expect(effectiveGhostTilesPerSec(tuned, 1)).toBeCloseTo(7.315 * 1.2);
  });
});

describe("parseHexColor", () => {
  it("accepts 6-digit hex with or without #", () => {
    expect(parseHexColor("#ff0000")).toBe(0xff0000);
    expect(parseHexColor(" 2121FF ")).toBe(0x2121ff);
    expect(parseHexColor("#fff")).toBeNull();
    expect(parseHexColor("zzzzzz")).toBeNull();
  });
});
