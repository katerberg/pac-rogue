import { beforeEach, describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import { GHOST_DIR } from "./ghostPath";
import { CLYDE_SHY_TILES, SPUNKY_AGGRO_TILES, WARDY_STRIKE_TILES } from "./ghostTarget";
import {
  clipSegmentToRect,
  easeToward,
  inkyReticleGoalPx,
  LEARN_PATH_MAX_STEPS,
  playerAnchoredReticleGoalPx,
  predictGhostPath,
  targetDerivation,
} from "./learnOverlay";
import { activateLayout, TILE_SIZE } from "./maze";

beforeEach(() => {
  activateLayout("mazeSmall");
});

describe("predictGhostPath", () => {
  it("walks the mid corridor to the target", () => {
    const path = predictGhostPath({
      start: { col: 4, row: 7 },
      facing: GHOST_DIR.right,
      targetAt: () => ({ col: 23, row: 7 }),
    });
    expect(path[0]).toEqual({ col: 4, row: 7 });
    expect(path.at(-1)).toEqual({ col: 23, row: 7 });
    expect(path.every((tile) => tile.row === 7)).toBe(true);
  });

  it("never reverses and stops at maxSteps", () => {
    const path = predictGhostPath({
      start: { col: 13, row: 7 },
      facing: GHOST_DIR.right,
      targetAt: () => ({ col: 4, row: 7 }),
      maxSteps: 5,
    });
    expect(path[1]).toEqual({ col: 14, row: 7 });
    expect(path).toHaveLength(6);
  });
});

describe("predictGhostPath with a target that changes along the path", () => {
  it("follows the target resolved at each tile, not the one from the start", () => {
    const start = { col: 10, row: 1 };
    const farA = { col: 0, row: 0 };
    const farB = { col: 27, row: 24 };
    const fixed = predictGhostPath({
      start,
      facing: GHOST_DIR.left,
      targetAt: () => farA,
      maxSteps: 16,
    });
    const switching = predictGhostPath({
      start,
      facing: GHOST_DIR.left,
      targetAt: (tile) => (tile.col <= 7 ? farB : farA),
      maxSteps: 16,
    });
    expect(switching).not.toEqual(fixed);
    expect(switching.slice(0, 5)).toEqual(fixed.slice(0, 5));
  });
});

describe("predictGhostPath loops", () => {
  it("ends once a tile is reached again heading the same way, not on the first revisit", () => {
    const path = predictGhostPath({
      start: { col: 7, row: 9 },
      facing: GHOST_DIR.down,
      targetAt: () => ({ col: 13, row: 10 }),
    });
    expect(path.length).toBeLessThan(LEARN_PATH_MAX_STEPS);
  });

  it("keeps going through a tile it crosses a second time from another direction", () => {
    const path = predictGhostPath({
      start: { col: 10, row: 1 },
      facing: GHOST_DIR.right,
      targetAt: () => ({ col: 14, row: -3 }),
    });
    const keys = path.map((tile) => `${tile.col},${tile.row}`);
    expect(new Set(keys).size).toBeLessThan(keys.length);
  });
});

describe("targetDerivation", () => {
  const input = {
    player: { col: 10, row: 13 },
    playerFacing: GHOST_DIR.up,
    blinky: { col: 4, row: 4 },
    target: { col: 10, row: 9 },
  };

  it("draws nothing extra for Blinky", () => {
    expect(targetDerivation(GHOST_KIND.blinky, input)).toEqual({ kind: "none" });
  });

  it("links player to target for Pinky", () => {
    expect(targetDerivation(GHOST_KIND.pinky, input)).toEqual({
      kind: "segment",
      from: input.player,
      to: input.target,
    });
  });

  it("pivots Inky two tiles ahead of the player", () => {
    expect(targetDerivation(GHOST_KIND.inky, input)).toEqual({
      kind: "inky",
      blinky: input.blinky,
      pivot: { col: 10, row: 11 },
      target: input.target,
    });
  });

  it("circles the player at Clyde's shy radius", () => {
    expect(targetDerivation(GHOST_KIND.clyde, input)).toEqual({
      kind: "circle",
      center: input.player,
      radiusTiles: CLYDE_SHY_TILES,
    });
  });

  it("draws the Wardy's strike band and the player-to-rim ray", () => {
    expect(targetDerivation(GHOST_KIND.wardy, input)).toEqual({
      kind: "rim",
      from: input.player,
      to: input.target,
      insetTiles: WARDY_STRIKE_TILES + 1,
    });
  });

  it("circles the player at Spunky's aggro radius", () => {
    expect(targetDerivation(GHOST_KIND.spunky, input)).toEqual({
      kind: "circle",
      center: input.player,
      radiusTiles: SPUNKY_AGGRO_TILES,
    });
  });
});

describe("clipSegmentToRect", () => {
  const rect = { left: 0, top: 0, right: 100, bottom: 50 };

  it("keeps a segment fully inside", () => {
    const seg = { x1: 10, y1: 10, x2: 90, y2: 40 };
    expect(clipSegmentToRect(seg, rect)).toEqual(seg);
  });

  it("trims a segment that leaves the rect", () => {
    expect(clipSegmentToRect({ x1: 50, y1: 25, x2: 150, y2: 25 }, rect)).toEqual({
      x1: 50,
      y1: 25,
      x2: 100,
      y2: 25,
    });
  });

  it("drops a segment fully outside", () => {
    expect(clipSegmentToRect({ x1: -20, y1: 60, x2: 120, y2: 80 }, rect)).toBeNull();
  });
});

describe("easeToward", () => {
  const goal = { x: 100, y: 50 };

  it("snaps when there is no previous point", () => {
    expect(easeToward(null, goal, 16)).toEqual(goal);
  });

  it("moves part of the way each frame without overshooting", () => {
    const next = easeToward({ x: 0, y: 0 }, goal, 16, 70);
    expect(next.x).toBeGreaterThan(0);
    expect(next.x).toBeLessThan(100);
    expect(next.y / next.x).toBeCloseTo(0.5);
  });

  it("is frame-rate independent", () => {
    const oneStep = easeToward({ x: 0, y: 0 }, goal, 32, 70);
    const twoSteps = easeToward(easeToward({ x: 0, y: 0 }, goal, 16, 70), goal, 16, 70);
    expect(twoSteps.x).toBeCloseTo(oneStep.x);
  });

  it("stays put for a zero delta", () => {
    expect(easeToward({ x: 10, y: 10 }, goal, 0)).toEqual({ x: 10, y: 10 });
  });
});

describe("inkyReticleGoalPx", () => {
  const tileGoal = { x: 100, y: 100 };

  it("reflects Blinky through the pivot in pixels so it tracks sub-tile motion", () => {
    const goal = inkyReticleGoalPx({ x: 60, y: 90 }, { x: 80.5, y: 95 }, tileGoal);
    expect(goal).toEqual({ x: 101, y: 100 });
  });

  it("falls back to the tile goal when the reflection strays far from it", () => {
    const goal = inkyReticleGoalPx({ x: 0, y: 0 }, { x: TILE_SIZE * 20, y: 0 }, tileGoal);
    expect(goal).toEqual(tileGoal);
  });
});

describe("playerAnchoredReticleGoalPx", () => {
  const player = { col: 5, row: 5, facing: GHOST_DIR.right };
  const playerPx = { x: 90.5, y: 88 };
  const tileGoal = { x: 1, y: 2 };

  it("follows the player's pixel position when the target is the player's tile", () => {
    const goal = playerAnchoredReticleGoalPx(
      GHOST_KIND.blinky,
      { col: 5, row: 5 },
      player,
      playerPx,
      tileGoal,
    );
    expect(goal).toEqual(playerPx);
  });

  it("keeps Pinky's look-ahead offset from the player's pixel position", () => {
    const goal = playerAnchoredReticleGoalPx(
      GHOST_KIND.pinky,
      { col: 9, row: 5 },
      player,
      playerPx,
      tileGoal,
    );
    expect(goal).toEqual({ x: playerPx.x + 4 * TILE_SIZE, y: playerPx.y });
  });

  it("leaves a fixed corner target on its tile", () => {
    const goal = playerAnchoredReticleGoalPx(
      GHOST_KIND.clyde,
      { col: 0, row: 12 },
      player,
      playerPx,
      tileGoal,
    );
    expect(goal).toEqual(tileGoal);
  });
});
