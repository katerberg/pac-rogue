import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import {
  GHOST_ELROY1_SPEED,
  GHOST_ELROY2_SPEED,
  GHOST_SPEED,
  GHOST_TUNNEL_SPEED,
  resolveGhostSpeed,
  resolveGhostSpeedForKind,
} from "./ghostSpeed";
import { PLAYER_SPEED } from "./playfield";

describe("ghostSpeed", () => {
  it("uses base, Elroy, and tunnel speeds", () => {
    expect(resolveGhostSpeed(50, false)).toBeCloseTo(GHOST_SPEED);
    expect(resolveGhostSpeed(20, false)).toBeCloseTo(GHOST_ELROY1_SPEED);
    expect(resolveGhostSpeed(10, false)).toBeCloseTo(GHOST_ELROY2_SPEED);
    expect(resolveGhostSpeed(10, true)).toBeCloseTo(GHOST_TUNNEL_SPEED);
    expect(GHOST_ELROY1_SPEED).toBeCloseTo(PLAYER_SPEED);
  });

  it("applies Elroy only to Blinky", () => {
    expect(resolveGhostSpeedForKind(GHOST_KIND.blinky, 10, false)).toBeCloseTo(GHOST_ELROY2_SPEED);
    expect(resolveGhostSpeedForKind(GHOST_KIND.pinky, 10, false)).toBeCloseTo(GHOST_SPEED);
    expect(resolveGhostSpeedForKind(GHOST_KIND.clyde, 10, false)).toBeCloseTo(GHOST_SPEED);
    expect(resolveGhostSpeedForKind(GHOST_KIND.pinky, 10, true)).toBeCloseTo(GHOST_TUNNEL_SPEED);
  });
});
