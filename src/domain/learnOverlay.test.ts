import { beforeEach, describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import { GHOST_DIR } from "./ghostPath";
import { CLYDE_SHY_TILES } from "./ghostTarget";
import {
  clampTileToBoard,
  clipSegmentToRect,
  easeToward,
  predictGhostPath,
  targetDerivation,
} from "./learnOverlay";
import { activateLayout } from "./maze";

beforeEach(() => {
  activateLayout("mazeSmall");
});

describe("clampTileToBoard", () => {
  it("clamps off-board tiles onto the board edge", () => {
    expect(clampTileToBoard({ col: -3, row: 25 }, 22, 21)).toEqual({ col: 0, row: 20 });
    expect(clampTileToBoard({ col: 30, row: -1 }, 22, 21)).toEqual({ col: 21, row: 0 });
    expect(clampTileToBoard({ col: 5, row: 6 }, 22, 21)).toEqual({ col: 5, row: 6 });
  });
});

describe("predictGhostPath", () => {
  it("walks the top corridor to the target", () => {
    const path = predictGhostPath({
      start: { col: 1, row: 1 },
      facing: GHOST_DIR.right,
      target: { col: 20, row: 1 },
    });
    expect(path[0]).toEqual({ col: 1, row: 1 });
    expect(path.at(-1)).toEqual({ col: 20, row: 1 });
    expect(path.every((tile) => tile.row === 1)).toBe(true);
  });

  it("never reverses and stops at maxSteps", () => {
    const path = predictGhostPath({
      start: { col: 10, row: 1 },
      facing: GHOST_DIR.right,
      target: { col: 1, row: 1 },
      maxSteps: 5,
    });
    expect(path[1]).toEqual({ col: 11, row: 1 });
    expect(path).toHaveLength(6);
  });
});

describe("predictGhostPath loops", () => {
  it("stops before revisiting a tile when the target is unreachable", () => {
    const path = predictGhostPath({
      start: { col: 6, row: 10 },
      facing: GHOST_DIR.down,
      target: { col: 10, row: 11 },
    });
    const keys = path.map((tile) => `${tile.col},${tile.row}`);
    expect(new Set(keys).size).toBe(keys.length);
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
