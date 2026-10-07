import { describe, expect, it } from "vitest";
import { PLAYER_LINE_WIDTH } from "../../domain/ghostArt";
import dotmanSvg from "./dotman.svg?raw";
import { DOTMAN_LINE_ART, dotManLineArt } from "./dotmanLineArt";

const [body, pipe] = DOTMAN_LINE_ART.strands;
const radiusOf = (p: { x: number; y: number }) => Math.hypot(p.x - 50, p.y - 50);

describe("DOTMAN_LINE_ART", () => {
  it("is a faint unstroked silhouette under one open, stroked pipe", () => {
    expect(DOTMAN_LINE_ART.strands.map((s) => s.id)).toEqual(["body", "pipe"]);
    expect(body).toMatchObject({ stroke: "none", fill: "currentColor", closed: true });
    expect(pipe).toMatchObject({ stroke: "currentColor", fill: "none", closed: false });
    expect(dotmanSvg).toMatch(/id="pipe"[^>]*stroke-linecap="round"/);
  });

  it("folds the pipe through three rings, 16 units apart", () => {
    const rings = new Set(pipe!.points.map((p) => Math.round(radiusOf(p))));
    for (const r of [44, 28, 12]) {
      expect(rings.has(r)).toBe(true);
    }
    expect(Math.round(radiusOf(pipe!.points[0]!))).toBe(44);
    expect(Math.round(radiusOf(pipe!.points.at(-1)!))).toBe(12);
  });

  it("keeps the stroked pipe inside one tile (its 100x100 box)", () => {
    const half = (PLAYER_LINE_WIDTH * DOTMAN_LINE_ART.width) / 2;
    for (const p of pipe!.points) {
      expect(radiusOf(p) + half).toBeLessThanOrEqual(50);
    }
  });

  it("opens its mouth right, then turns it to face each angle", () => {
    const mouth = (degrees: number) => {
      const points = dotManLineArt(degrees).strands[0]!.points;
      const mean = (axis: "x" | "y") =>
        points.reduce((sum, p) => sum + p[axis] - 50, 0) / points.length;
      return [mean("x"), mean("y")].map((v) => -Math.sign(Math.round(v)) || 0);
    };
    expect(mouth(0)).toEqual([1, 0]);
    expect(mouth(90)).toEqual([0, 1]);
    expect(mouth(180)).toEqual([-1, 0]);
    expect(mouth(270)).toEqual([0, -1]);
    expect(mouth(45)).toEqual([1, 1]);
  });

  it("reuses one art per whole degree", () => {
    expect(dotManLineArt(0)).toBe(DOTMAN_LINE_ART);
    expect(dotManLineArt(90.4)).toBe(dotManLineArt(450));
    expect(dotManLineArt(-90)).toBe(dotManLineArt(270));
  });
});
