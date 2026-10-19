import { describe, expect, it } from "vitest";
import { GHOST_DIR } from "./ghostPath";
import {
  MIRROR_ALPHA,
  mirrorCol,
  mirrorFacing,
  mirrorX,
  nearestBody,
  pathLength,
  sharedZoneEffect,
  mirrorDust,
  mirrorPopLook,
  mirrorPopRender,
  tickMirrorPop,
  twinDesynced,
  twinPoint,
  twinTouchesPlayer,
  twinZoneEffect,
  type BodyTile,
} from "./mirror";
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

describe("twinTouchesPlayer", () => {
  const layout = { offsetX: 0, pixelWidth: 200, tileSize: 10 };

  it("is true when the bodies are within half a tile of each other", () => {
    expect(twinTouchesPlayer({ x: 100, y: 5 }, layout)).toBe(true);
    expect(twinTouchesPlayer({ x: 102, y: 5 }, layout)).toBe(true);
  });

  it("is false once they are half a tile or more apart", () => {
    expect(twinTouchesPlayer({ x: 103, y: 5 }, layout)).toBe(false);
    expect(twinTouchesPlayer({ x: 40, y: 5 }, layout)).toBe(false);
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

describe("pop timing", () => {
  it("ticks until the pop is over, then clears", () => {
    const pop = { x: 1, y: 2, elapsedMs: 0 };
    const mid = tickMirrorPop(pop, 300)!;
    expect(mid.elapsedMs).toBe(300);
    expect(tickMirrorPop(mid, 500)).toBeNull();
    expect(tickMirrorPop(null, 16)).toBeNull();
  });
});

describe("pop look", () => {
  it("clamps progress", () => {
    const at = (elapsedMs: number) => mirrorPopRender({ x: 3, y: 4, elapsedMs });
    expect(at(0)).toEqual({ x: 3, y: 4, progress: 0 });
    expect(at(350)!.progress).toBeCloseTo(0.5);
    expect(mirrorPopRender(null)).toBeNull();
  });

  it("stutter-blinks the body before it turns to dust", () => {
    const alphas = Array.from(
      { length: 9 },
      (_, i) =>
        mirrorPopLook(mirrorPopRender({ x: 0, y: 0, elapsedMs: i * 40 })!.progress).bodyAlpha,
    );
    expect(alphas[0]).toBe(MIRROR_ALPHA);
    expect(new Set(alphas.slice(0, 8)).size).toBe(2);
    expect(mirrorPopLook(0.2).dustProgress).toBe(0);
  });

  it("hides the body and disperses dust at the end", () => {
    expect(mirrorPopLook(0.75)).toMatchObject({ bodyAlpha: 0 });
    expect(mirrorPopLook(0.75).dustProgress).toBeCloseTo(0.5);
    expect(mirrorPopLook(1).dustProgress).toBe(1);
  });

  it("makes no dust before the dust phase and fades it out by the end", () => {
    expect(mirrorDust(0, 16)).toEqual([]);
    const mid = mirrorDust(0.5, 16);
    const end = mirrorDust(1, 16);
    expect(mid.length).toBeGreaterThan(8);
    expect(end.every((mote) => mote.alpha === 0)).toBe(true);
    expect(mid.some((mote) => mote.alpha > 0)).toBe(true);
    expect(Math.hypot(end[0]!.dx, end[0]!.dy)).toBeGreaterThan(
      Math.hypot(mid[0]!.dx, mid[0]!.dy) / 2,
    );
  });
});
