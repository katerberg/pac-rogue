import { describe, expect, it } from "vitest";
import { brightenColor } from "./playerTint";
import {
  SIDEBAR_BRIGHTEN,
  SIDEBAR_FADE_PX,
  SIDEBAR_MAZE_GRACE_PX,
  sidebarBackgroundColor,
  sidebarBandRects,
} from "./sidebarBands";

const MAZE_BG = 0x1a1a2e;
const PLAY_W = 800;
const PLAY_H = 600;
const OFFSET_X = 176;
const MAZE_W = 448;

describe("sidebarBackgroundColor", () => {
  it("brightens the maze background by SIDEBAR_BRIGHTEN", () => {
    expect(sidebarBackgroundColor(MAZE_BG)).toBe(brightenColor(MAZE_BG, SIDEBAR_BRIGHTEN));
    expect(SIDEBAR_BRIGHTEN).toBe(0.06);
  });

  it("tracks a different maze background (knobs-relative)", () => {
    const other = 0x102030;
    expect(sidebarBackgroundColor(other)).toBe(brightenColor(other, SIDEBAR_BRIGHTEN));
    expect(sidebarBackgroundColor(other)).not.toBe(sidebarBackgroundColor(MAZE_BG));
  });
});

describe("sidebarBandRects", () => {
  it("returns full-height left and right fills with grace and a soft fade into the maze column", () => {
    const rects = sidebarBandRects({
      playfieldWidth: PLAY_W,
      playfieldHeight: PLAY_H,
      mazeOffsetX: OFFSET_X,
      mazePixelWidth: MAZE_W,
      mazeBackground: MAZE_BG,
    });

    expect(SIDEBAR_FADE_PX).toBe(2);
    expect(SIDEBAR_MAZE_GRACE_PX).toBe(4);
    expect(rects.every((r) => r.y === 0 && r.h === PLAY_H)).toBe(true);

    const leftBandEnd = OFFSET_X - SIDEBAR_MAZE_GRACE_PX;
    const rightBandStart = OFFSET_X + MAZE_W + SIDEBAR_MAZE_GRACE_PX;
    const solid = sidebarBackgroundColor(MAZE_BG);
    const leftSolid = rects.find((r) => r.x === 0 && r.color === solid);
    expect(leftSolid).toEqual({
      x: 0,
      y: 0,
      w: leftBandEnd - SIDEBAR_FADE_PX,
      h: PLAY_H,
      color: solid,
    });

    const rightSolid = rects.find((r) => r.color === solid && r.w > 1 && r.x > OFFSET_X);
    expect(rightSolid).toEqual({
      x: rightBandStart + SIDEBAR_FADE_PX,
      y: 0,
      w: PLAY_W - (rightBandStart + SIDEBAR_FADE_PX),
      h: PLAY_H,
      color: solid,
    });

    const leftFadeNearMaze = rects.find((r) => r.x === leftBandEnd - 1);
    const leftFadeFar = rects.find((r) => r.x === leftBandEnd - 2);
    expect(leftFadeNearMaze?.w).toBe(1);
    expect(leftFadeFar?.w).toBe(1);
    expect(leftFadeNearMaze?.color).toBe(
      brightenColor(MAZE_BG, (SIDEBAR_BRIGHTEN * 1) / SIDEBAR_FADE_PX),
    );
    expect(leftFadeFar?.color).toBe(solid);

    const rightFadeNearMaze = rects.find((r) => r.x === rightBandStart);
    const rightFadeFar = rects.find((r) => r.x === rightBandStart + 1);
    expect(rightFadeNearMaze?.color).toBe(leftFadeNearMaze?.color);
    expect(rightFadeFar?.color).toBe(leftFadeFar?.color);

    expect(rects.some((r) => r.x >= leftBandEnd && r.x + r.w <= rightBandStart)).toBe(false);
  });

  it("clamps fade when the gutter after grace is narrower than SIDEBAR_FADE_PX", () => {
    const rects = sidebarBandRects({
      playfieldWidth: 100,
      playfieldHeight: PLAY_H,
      mazeOffsetX: SIDEBAR_MAZE_GRACE_PX + 1,
      mazePixelWidth: 100 - 2 * (SIDEBAR_MAZE_GRACE_PX + 1),
      mazeBackground: MAZE_BG,
    });
    expect(rects).toHaveLength(2);
    expect(rects.every((r) => r.w === 1 && r.h === PLAY_H)).toBe(true);
    expect(rects[0]).toMatchObject({
      x: 0,
      color: brightenColor(MAZE_BG, SIDEBAR_BRIGHTEN / SIDEBAR_FADE_PX),
    });
    expect(rects[1]).toMatchObject({
      x: 99,
      color: brightenColor(MAZE_BG, SIDEBAR_BRIGHTEN / SIDEBAR_FADE_PX),
    });
  });

  it("returns no rects when grace consumes the gutters", () => {
    const rects = sidebarBandRects({
      playfieldWidth: 448 + 2 * SIDEBAR_MAZE_GRACE_PX,
      playfieldHeight: PLAY_H,
      mazeOffsetX: SIDEBAR_MAZE_GRACE_PX,
      mazePixelWidth: 448,
      mazeBackground: MAZE_BG,
    });
    expect(rects).toEqual([]);
  });
});
