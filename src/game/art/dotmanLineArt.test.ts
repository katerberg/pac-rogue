import { describe, expect, it } from "vitest";
import { PLAYER_LINE_WIDTH } from "../../domain/ghostArt";
import { DOTMAN_LINE_ART, DOTMAN_LINE_ART_BY_DIR } from "./dotmanLineArt";

const [body, pipe] = DOTMAN_LINE_ART.strands;
const radiusOf = (p: { x: number; y: number }) => Math.hypot(p.x - 50, p.y - 50);

describe("DOTMAN_LINE_ART", () => {
  it("is a faint unstroked silhouette under one open, stroked pipe", () => {
    expect(DOTMAN_LINE_ART.strands.map((s) => s.id)).toEqual(["body", "pipe"]);
    expect(body).toMatchObject({ stroke: "none", fill: "currentColor", closed: true });
    expect(pipe).toMatchObject({ stroke: "currentColor", fill: "none", closed: false });
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

  it("opens its mouth right, then turns it to face each direction", () => {
    const mouth = (dir: keyof typeof DOTMAN_LINE_ART_BY_DIR) => {
      const points = DOTMAN_LINE_ART_BY_DIR[dir].strands[0]!.points;
      const mean = (axis: "x" | "y") =>
        points.reduce((sum, p) => sum + p[axis] - 50, 0) / points.length;
      return [mean("x"), mean("y")].map((v) => -Math.sign(Math.round(v)) || 0);
    };
    expect(mouth("right")).toEqual([1, 0]);
    expect(mouth("down")).toEqual([0, 1]);
    expect(mouth("left")).toEqual([-1, 0]);
    expect(mouth("up")).toEqual([0, -1]);
  });
});
