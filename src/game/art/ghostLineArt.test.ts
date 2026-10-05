import { describe, expect, it } from "vitest";
import { GHOST_LINE_ART } from "./ghostLineArt";

describe("GHOST_LINE_ART", () => {
  it("has a filled body and two white crescent eyes, all closed", () => {
    expect(GHOST_LINE_ART.strands.map((s) => s.id)).toEqual(["body", "eye-left", "eye-right"]);
    expect(GHOST_LINE_ART.strands.every((s) => s.closed)).toBe(true);
    const [body, ...eyes] = GHOST_LINE_ART.strands;
    expect(body).toMatchObject({ stroke: "currentColor", fill: "currentColor", fillOpacity: 0.25 });
    for (const eye of eyes) {
      expect(eye).toMatchObject({ stroke: "none", fill: 0xffffff });
    }
  });

  it("stays inside its 100x100 viewBox, scallops reaching y 97.5", () => {
    const points = GHOST_LINE_ART.strands.flatMap((s) => s.points);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
    const lowest = Math.max(...GHOST_LINE_ART.strands[0]!.points.map((p) => p.y));
    expect(lowest).toBeCloseTo(97.5, 1);
  });
});
