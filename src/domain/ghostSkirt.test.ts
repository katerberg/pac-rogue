import { describe, expect, it } from "vitest";
import { GHOST_ART_SIZE_PX } from "./ghostPupils";
import { advanceGhostSkirtPhase, ghostSkirtPoints, multiplyTint } from "./ghostSkirt";

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

  it("stays within one turn", () => {
    for (const dx of [0.3, 7, -9, 1000]) {
      const phase = advanceGhostSkirtPhase(5, dx, SIZE);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(2 * Math.PI);
    }
  });
});

describe("ghostSkirtPoints", () => {
  it("spans the sprite width and stays inside the sprite's bottom rows", () => {
    const points = ghostSkirtPoints(100, 50, SIZE, 0.7);
    const top = 50 - SIZE / 2;
    const xs = points.map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(100 - SIZE / 2);
    expect(Math.max(...xs)).toBeCloseTo(100 + SIZE / 2);
    for (const p of points) {
      expect(p.y).toBeGreaterThanOrEqual(top + 13 * 2);
      expect(p.y).toBeLessThanOrEqual(top + SIZE + 1e-9);
    }
  });

  it("moves the wave edge when the phase changes", () => {
    const a = ghostSkirtPoints(0, 0, SIZE, 0);
    const b = ghostSkirtPoints(0, 0, SIZE, Math.PI / 2);
    expect(a).toHaveLength(b.length);
    expect(a.some((p, i) => Math.abs(p.y - b[i]!.y) > 0.1)).toBe(true);
  });
});

describe("multiplyTint", () => {
  it("passes the color through without a tint", () => {
    expect(multiplyTint(0xff0000, null)).toBe(0xff0000);
  });

  it("multiplies channels like a Phaser tint", () => {
    expect(multiplyTint(0xff8000, 0x7ec8ff)).toBe(0x7e6400);
    expect(multiplyTint(0xffffff, 0x7ec8ff)).toBe(0x7ec8ff);
  });
});
