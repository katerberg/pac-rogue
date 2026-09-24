import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import {
  GHOST_ELROY1_SPEED,
  GHOST_ELROY2_SPEED,
  resolveGhostSpeed,
  resolveGhostSpeedForKind,
} from "./ghostSpeed";
import { PLAYER_SPEED } from "./playfield";

describe("ghostSpeed", () => {
  it("uses level-ramped base, Elroy, and tunnel speeds", () => {
    expect(resolveGhostSpeed(50, false, 1)).toBeCloseTo(PLAYER_SPEED * 0.8);
    expect(resolveGhostSpeed(50, false, 5)).toBeCloseTo(PLAYER_SPEED);
    expect(resolveGhostSpeed(20, false, 1)).toBeCloseTo(GHOST_ELROY1_SPEED);
    expect(resolveGhostSpeed(10, false, 1)).toBeCloseTo(GHOST_ELROY2_SPEED);
    expect(resolveGhostSpeed(10, true, 1)).toBeCloseTo(PLAYER_SPEED * 0.4);
    expect(resolveGhostSpeed(10, true, 5)).toBeCloseTo(PLAYER_SPEED * 0.5);
    expect(GHOST_ELROY1_SPEED).toBeCloseTo(PLAYER_SPEED);
  });

  it("applies Elroy only to Blinky, unaffected by level", () => {
    expect(resolveGhostSpeedForKind(GHOST_KIND.blinky, 10, false, 1)).toBeCloseTo(
      GHOST_ELROY2_SPEED,
    );
    expect(resolveGhostSpeedForKind(GHOST_KIND.pinky, 10, false, 1)).toBeCloseTo(
      PLAYER_SPEED * 0.8,
    );
    expect(resolveGhostSpeedForKind(GHOST_KIND.inky, 10, false, 3)).toBeCloseTo(PLAYER_SPEED * 0.9);
    expect(resolveGhostSpeedForKind(GHOST_KIND.clyde, 10, false, 5)).toBeCloseTo(PLAYER_SPEED);
    expect(resolveGhostSpeedForKind(GHOST_KIND.pinky, 10, true, 1)).toBeCloseTo(PLAYER_SPEED * 0.4);
  });
});
