import { describe, expect, it } from "vitest";
import { QUARTER_LINE_ART } from "./quarterLineArt";

describe("QUARTER_LINE_ART", () => {
  it("has a faint body disc, rim, and minimal left-facing profile + queue", () => {
    expect(QUARTER_LINE_ART.strands.map((s) => s.id)).toEqual(["body", "rim", "profile", "queue"]);
    const [body, rim, profile, queue] = QUARTER_LINE_ART.strands;
    expect(body).toMatchObject({
      closed: true,
      stroke: "none",
      fill: "currentColor",
      fillOpacity: 0.22,
    });
    expect(rim).toMatchObject({ stroke: "currentColor", fill: "none", closed: false });
    expect(profile).toMatchObject({ stroke: "currentColor", fill: "none", closed: false });
    expect(queue).toMatchObject({ stroke: "currentColor", fill: "none", closed: false });
  });

  it("stays inside its 100x100 viewBox", () => {
    const points = QUARTER_LINE_ART.strands.flatMap((s) => s.points);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });
});
