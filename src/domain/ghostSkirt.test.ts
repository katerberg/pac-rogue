import { describe, expect, it } from "vitest";
import { GHOST_ART_SIZE_PX } from "./ghostPupils";
import { advanceGhostSkirtPhase, ghostSkirtRects, multiplyTint } from "./ghostSkirt";

const SIZE = GHOST_ART_SIZE_PX * 2;

describe("advanceGhostSkirtPhase", () => {
  it("does not move on zero horizontal travel", () => {
    expect(advanceGhostSkirtPhase(1.25, 0, SIZE)).toBe(1.25);
  });

  it("moves in opposite directions for left and right travel", () => {
    const right = advanceGhostSkirtPhase(0, 1, SIZE);
    const left = advanceGhostSkirtPhase(0, -1, SIZE);
    expect(right).toBeGreaterThan(0);
    expect(left).toBeGreaterThan(0);
    expect(right + left).toBeCloseTo(2 * Math.PI);
  });

  it("keeps the phase across a teleport-sized jump", () => {
    expect(advanceGhostSkirtPhase(1.25, SIZE * 5, SIZE)).toBe(1.25);
    expect(advanceGhostSkirtPhase(1.25, -SIZE * 5, SIZE)).toBe(1.25);
  });

  it("stays within one turn", () => {
    for (const dx of [0.3, 7, -9, SIZE]) {
      const phase = advanceGhostSkirtPhase(5, dx, SIZE);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(2 * Math.PI);
    }
  });
});

describe("ghostSkirtRects", () => {
  it("covers one art-pixel column each and stays in the skirt rows", () => {
    const scale = SIZE / GHOST_ART_SIZE_PX;
    const top = 50 - SIZE / 2;
    const rects = ghostSkirtRects(100, 50, SIZE, 0.7);
    expect(rects).toHaveLength(GHOST_ART_SIZE_PX);
    expect(rects[0]!.x).toBeCloseTo(100 - SIZE / 2);
    expect(rects[rects.length - 1]!.x + rects[rects.length - 1]!.w).toBeCloseTo(100 + SIZE / 2);
    for (const rect of rects) {
      expect(rect.w).toBeCloseTo(scale);
      expect(rect.y).toBeCloseTo(top + 13.9 * scale);
      expect(rect.y + rect.h).toBeGreaterThanOrEqual(top + 14 * scale);
      expect(rect.y + rect.h).toBeLessThanOrEqual(top + (GHOST_ART_SIZE_PX + 1) * scale + 1e-9);
      const artRow = (rect.y + rect.h - top) / scale;
      expect(artRow).toBeCloseTo(Math.round(artRow));
    }
  });

  it("moves the wave edge when the phase changes", () => {
    const a = ghostSkirtRects(0, 0, SIZE, 0);
    const b = ghostSkirtRects(0, 0, SIZE, Math.PI / 2);
    expect(a).toHaveLength(b.length);
    expect(a.some((rect, i) => Math.abs(rect.h - b[i]!.h) > 0.1)).toBe(true);
  });

  it("keeps the wave fixed in world space as the ghost moves", () => {
    const cy = 50;
    const cx0 = 100;
    const scale = SIZE / GHOST_ART_SIZE_PX;
    const dx = scale * 3;
    const phase0 = 0.4;
    const before = ghostSkirtRects(cx0, cy, SIZE, phase0);
    const after = ghostSkirtRects(cx0 + dx, cy, SIZE, advanceGhostSkirtPhase(phase0, dx, SIZE));
    const worldX = cx0 + scale * 0.5;
    expect(skirtEdgeYAt(before, worldX)).toBeCloseTo(skirtEdgeYAt(after, worldX), 5);
  });
});

function skirtEdgeYAt(
  rects: { x: number; y: number; w: number; h: number }[],
  worldX: number,
): number {
  for (const rect of rects) {
    if (worldX >= rect.x && worldX < rect.x + rect.w) {
      return rect.y + rect.h;
    }
  }
  throw new Error(`worldX ${worldX} is outside the skirt`);
}

describe("multiplyTint", () => {
  it("passes the color through without a tint", () => {
    expect(multiplyTint(0xff0000, null)).toBe(0xff0000);
  });

  it("multiplies channels like a Phaser tint", () => {
    expect(multiplyTint(0xff8000, 0x7ec8ff)).toBe(0x7e6400);
    expect(multiplyTint(0xffffff, 0x7ec8ff)).toBe(0x7ec8ff);
  });
});
