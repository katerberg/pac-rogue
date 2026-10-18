import { describe, expect, it } from "vitest";
import { GHOST_DIR } from "./ghostPath";
import {
  SIMULACRUM_ALPHA,
  SIMULACRUM_POP_MS,
  mirrorCol,
  mirrorFacing,
  mirrorX,
  nearestBody,
  pathLength,
  sharedZoneEffect,
  simulacrumDust,
  simulacrumPopLook,
  simulacrumPopProgress,
  twinDesynced,
  twinPoint,
  twinZoneEffect,
  type BodyTile,
} from "./simulacrum";
import type { SpeedZone } from "./speedZones";

function grid(rows: string[]): boolean[][] {
  return rows.map((row) => [...row].map((c) => c === "#"));
}

const corridor = grid(["#######", "#.....#", "#######"]);
const loop = grid(["#######", "#.....#", "#.###.#", "#.....#", "#######"]);

describe("mirror", () => {
  it("reflects x over the maze centre and keeps y", () => {
    expect(mirrorX(30, 100)).toBe(170);
    expect(twinPoint({ x: 30, y: 7 }, { offsetX: 50, pixelWidth: 100 })).toEqual({ x: 170, y: 7 });
    expect(mirrorCol(0, 28)).toBe(27);
    expect(mirrorCol(13, 28)).toBe(14);
  });

  it("swaps left/right and diagonals, leaves vertical alone", () => {
    expect(mirrorFacing(GHOST_DIR.left)).toBe(GHOST_DIR.right);
    expect(mirrorFacing(GHOST_DIR.right)).toBe(GHOST_DIR.left);
    expect(mirrorFacing(GHOST_DIR.up)).toBe(GHOST_DIR.up);
    expect(mirrorFacing(GHOST_DIR.none)).toBe(GHOST_DIR.none);
    expect(mirrorFacing(5)).toBe(6);
    expect(mirrorFacing(8)).toBe(7);
  });
});

describe("twinDesynced", () => {
  it("is false on a symmetric board", () => {
    expect(twinDesynced(corridor, { col: 1, row: 1 })).toBe(false);
  });

  it("is true when only the mirror cell is a wall", () => {
    const lopsided = grid(["#######", "#....##", "#######"]);
    expect(twinDesynced(lopsided, { col: 1, row: 1 })).toBe(true);
  });

  it("is false when the player cell is a wall too (wall pass)", () => {
    const lopsided = grid(["#######", "#....##", "#######"]);
    expect(twinDesynced(lopsided, { col: 5, row: 1 })).toBe(false);
  });

  it("is false when both are out of bounds", () => {
    expect(twinDesynced(corridor, { col: -1, row: 1 })).toBe(false);
  });
});

describe("speed zones", () => {
  const horizontal: SpeedZone = { col: 1, row: 1, axis: "horizontal", length: 4, fastDir: "right" };

  it("reads the twin's effect against its mirrored velocity", () => {
    expect(twinZoneEffect([horizontal], { col: 2, row: 1 }, { x: 1, y: 0 })).toBe("slow");
    expect(twinZoneEffect([horizontal], { col: 2, row: 1 }, { x: -1, y: 0 })).toBe("fast");
    expect(twinZoneEffect([horizontal], { col: 9, row: 1 }, { x: 1, y: 0 })).toBeNull();
  });

  it("shares whichever effect exists and conflicts only when both differ", () => {
    expect(sharedZoneEffect("slow", null)).toEqual({ effect: "slow", conflict: false });
    expect(sharedZoneEffect(null, "fast")).toEqual({ effect: "fast", conflict: false });
    expect(sharedZoneEffect("slow", "slow")).toEqual({ effect: "slow", conflict: false });
    expect(sharedZoneEffect("slow", "fast").conflict).toBe(true);
    expect(sharedZoneEffect(null, null)).toEqual({ effect: null, conflict: false });
  });
});

describe("pathLength (A*)", () => {
  it("measures the walkable path", () => {
    expect(pathLength(corridor, { col: 1, row: 1 }, { col: 5, row: 1 })).toBe(4);
    expect(pathLength(loop, { col: 1, row: 1 }, { col: 5, row: 3 })).toBe(6);
  });

  it("wraps through horizontal tunnels", () => {
    const tunnel = grid(["#####", ".###.", "#####"]);
    expect(pathLength(tunnel, { col: 0, row: 1 }, { col: 4, row: 1 })).toBe(1);
  });

  it("is infinite when unreachable or the goal is a wall", () => {
    const split = grid(["#######", "#..#..#", "#######"]);
    expect(pathLength(split, { col: 1, row: 1 }, { col: 5, row: 1 })).toBe(
      Number.POSITIVE_INFINITY,
    );
    expect(pathLength(corridor, { col: 1, row: 1 }, { col: 0, row: 0 })).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe("nearestBody", () => {
  const player: BodyTile = { col: 5, row: 3, facing: GHOST_DIR.left };
  const twin: BodyTile = { col: 1, row: 3, facing: GHOST_DIR.right };

  it("returns the player when there is no twin", () => {
    expect(nearestBody({ col: 1, row: 1 }, player, null, loop)).toBe(player);
  });

  it("picks the body with the shorter path, not the closer straight line", () => {
    const wall = grid(["#######", "#.....#", "#.###.#", "#.....#", "#######"]);
    expect(nearestBody({ col: 2, row: 1 }, player, twin, wall)).toBe(twin);
    expect(nearestBody({ col: 4, row: 1 }, player, twin, wall)).toBe(player);
  });

  it("breaks path ties toward the real player", () => {
    expect(nearestBody({ col: 3, row: 1 }, player, twin, loop)).toBe(player);
  });

  it("falls back to straight-line distance when both are unreachable", () => {
    const isolated = grid(["#######", "#.#.#.#", "#######"]);
    const a: BodyTile = { col: 5, row: 1, facing: GHOST_DIR.none };
    const b: BodyTile = { col: 3, row: 1, facing: GHOST_DIR.none };
    expect(nearestBody({ col: 1, row: 1 }, a, b, isolated)).toBe(b);
  });
});

describe("pop look", () => {
  it("clamps progress", () => {
    expect(simulacrumPopProgress(-5)).toBe(0);
    expect(simulacrumPopProgress(SIMULACRUM_POP_MS * 2)).toBe(1);
  });

  it("stutter-blinks the body before it turns to dust", () => {
    const alphas = Array.from(
      { length: 9 },
      (_, i) => simulacrumPopLook(simulacrumPopProgress(i * 40)).bodyAlpha,
    );
    expect(alphas[0]).toBe(SIMULACRUM_ALPHA);
    expect(new Set(alphas.slice(0, 8)).size).toBe(2);
    expect(simulacrumPopLook(0.2).dustProgress).toBe(0);
  });

  it("hides the body and disperses dust at the end", () => {
    expect(simulacrumPopLook(0.75)).toMatchObject({ bodyAlpha: 0 });
    expect(simulacrumPopLook(0.75).dustProgress).toBeCloseTo(0.5);
    expect(simulacrumPopLook(1).dustProgress).toBe(1);
  });

  it("makes no dust before the dust phase and fades it out by the end", () => {
    expect(simulacrumDust(0, 16)).toEqual([]);
    const mid = simulacrumDust(0.5, 16);
    const end = simulacrumDust(1, 16);
    expect(mid.length).toBeGreaterThan(8);
    expect(end.every((mote) => mote.alpha === 0)).toBe(true);
    expect(mid.some((mote) => mote.alpha > 0)).toBe(true);
    expect(Math.hypot(end[0]!.dx, end[0]!.dy)).toBeGreaterThan(
      Math.hypot(mid[0]!.dx, mid[0]!.dy) / 2,
    );
  });
});
