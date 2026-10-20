import { describe, expect, it } from "vitest";
import { brightenColor } from "./playerTint";
import {
  SIDEBAR_BRIGHTEN,
  SIDEBAR_FADE_PX,
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
    expect(SIDEBAR_BRIGHTEN).toBe(0.1);
  });

  it("tracks a different maze background (knobs-relative)", () => {
    const other = 0x102030;
    expect(sidebarBackgroundColor(other)).toBe(brightenColor(other, SIDEBAR_BRIGHTEN));
    expect(sidebarBackgroundColor(other)).not.toBe(sidebarBackgroundColor(MAZE_BG));
  });
});

describe("sidebarBandRects", () => {
  it("returns full-height left and right fills with a soft fade into the maze column", () => {
    const rects = sidebarBandRects({
      playfieldWidth: PLAY_W,
      playfieldHeight: PLAY_H,
      mazeOffsetX: OFFSET_X,
      mazePixelWidth: MAZE_W,
      mazeBackground: MAZE_BG,
    });

    expect(SIDEBAR_FADE_PX).toBe(2);
    expect(rects.every((r) => r.y === 0 && r.h === PLAY_H)).toBe(true);

    const solid = sidebarBackgroundColor(MAZE_BG);
    const leftSolid = rects.find((r) => r.x === 0 && r.color === solid);
    expect(leftSolid).toEqual({
      x: 0,
      y: 0,
      w: OFFSET_X - SIDEBAR_FADE_PX,
      h: PLAY_H,
      color: solid,
    });

    const rightSolid = rects.find((r) => r.color === solid && r.x > OFFSET_X);
    expect(rightSolid).toEqual({
      x: OFFSET_X + MAZE_W + SIDEBAR_FADE_PX,
      y: 0,
      w: PLAY_W - (OFFSET_X + MAZE_W + SIDEBAR_FADE_PX),
      h: PLAY_H,
      color: solid,
    });

    const leftFadeNearMaze = rects.find((r) => r.x === OFFSET_X - 1);
    const leftFadeFar = rects.find((r) => r.x === OFFSET_X - 2);
    expect(leftFadeNearMaze?.w).toBe(1);
    expect(leftFadeFar?.w).toBe(1);
    expect(leftFadeNearMaze?.color).toBe(
      brightenColor(MAZE_BG, (SIDEBAR_BRIGHTEN * 1) / (SIDEBAR_FADE_PX + 1)),
    );
    expect(leftFadeFar?.color).toBe(
      brightenColor(MAZE_BG, (SIDEBAR_BRIGHTEN * 2) / (SIDEBAR_FADE_PX + 1)),
    );

    const mazeRight = OFFSET_X + MAZE_W;
    const rightFadeNearMaze = rects.find((r) => r.x === mazeRight);
    const rightFadeFar = rects.find((r) => r.x === mazeRight + 1);
    expect(rightFadeNearMaze?.color).toBe(leftFadeNearMaze?.color);
    expect(rightFadeFar?.color).toBe(leftFadeFar?.color);

    expect(rects.some((r) => r.x >= OFFSET_X && r.x + r.w <= OFFSET_X + MAZE_W)).toBe(false);
  });

  it("clamps fade when the gutter is narrower than SIDEBAR_FADE_PX", () => {
    const rects = sidebarBandRects({
      playfieldWidth: 100,
      playfieldHeight: PLAY_H,
      mazeOffsetX: 1,
      mazePixelWidth: 98,
      mazeBackground: MAZE_BG,
    });
    expect(rects).toHaveLength(2);
    expect(rects.every((r) => r.w === 1 && r.h === PLAY_H)).toBe(true);
    expect(rects[0]).toMatchObject({ x: 0, color: brightenColor(MAZE_BG, SIDEBAR_BRIGHTEN / 3) });
    expect(rects[1]).toMatchObject({ x: 99, color: brightenColor(MAZE_BG, SIDEBAR_BRIGHTEN / 3) });
  });

  it("returns no rects when a side has zero gutter", () => {
    const rects = sidebarBandRects({
      playfieldWidth: 448,
      playfieldHeight: PLAY_H,
      mazeOffsetX: 0,
      mazePixelWidth: 448,
      mazeBackground: MAZE_BG,
    });
    expect(rects).toEqual([]);
  });
});
