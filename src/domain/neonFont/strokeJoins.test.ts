import { describe, expect, it } from "vitest";
import { parseLineArt } from "../lineArt";
import { neonRoundJoinIndices } from "./strokeJoins";

describe("neon round joins", () => {
  it("caps both ends of a straight bar only", () => {
    expect(
      neonRoundJoinIndices([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]),
    ).toEqual([0, 2]);
  });

  it("rounds a right-angle corner", () => {
    expect(
      neonRoundJoinIndices([
        { x: 0, y: 0 },
        { x: 0, y: 2 },
        { x: 2, y: 2 },
      ]),
    ).toEqual([0, 1, 2]);
  });

  it("skips interior samples of a tessellated quarter arc", () => {
    const art = parseLineArt(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 4"><path id="s" stroke="currentColor" fill="none" d="M0 1 A1 1 0 0 1 1 0 L2 0" /></svg>',
      0.15,
    );
    const points = art.strands[0]!.points;
    expect(points.length).toBeGreaterThan(5);
    expect(neonRoundJoinIndices(points)).toEqual([0, points.length - 1]);
  });

  it("caps a single-point dot", () => {
    expect(neonRoundJoinIndices([{ x: 1, y: 1 }])).toEqual([0]);
  });
});
