import { describe, expect, it } from "vitest";
import { parseLineArt, rotateLineArt, type LineStrand } from "./lineArt";

function svg(...paths: string[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${paths.join("")}</svg>`;
}

function strand(d: string, extra = ""): LineStrand {
  return parseLineArt(svg(`<path id="a" stroke="currentColor" ${extra} d="${d}" />`)).strands[0]!;
}

describe("parseLineArt", () => {
  it("flattens an absolute closed square", () => {
    const square = strand("M0 0 L10 0 L10 10 L0 10 Z");
    expect(square.closed).toBe(true);
    expect(square.length).toBeCloseTo(40);
    expect(square.points.at(-1)).toMatchObject({ x: 0, y: 0 });
  });

  it("gives relative commands the same points as absolute ones", () => {
    const abs = strand("M0 0 L10 0 L10 10 L0 10 Z");
    const rel = strand("m0 0 l10 0 l0 10 l-10 0 z");
    expect(rel.points).toEqual(abs.points);
  });

  it("treats extra pairs after M as lines and handles H/V", () => {
    expect(strand("M0 0 10 0 V10 H0").points).toEqual(strand("M0 0 L10 0 L10 10 L0 10").points);
    expect(strand("M0 0 L10 0 L10 10 L0 10").closed).toBe(false);
  });

  it("samples a half-circle arc that bulges up", () => {
    const arc = strand("M0 50 A50 50 0 0 1 100 50");
    expect(arc.length).toBeGreaterThan(50 * Math.PI * 0.99);
    expect(arc.length).toBeLessThan(50 * Math.PI * 1.01);
    const mid = arc.points.reduce((best, p) =>
      Math.abs(p.x - 50) < Math.abs(best.x - 50) ? p : best,
    );
    expect(mid.y).toBeCloseTo(0, 0);
  });

  it("hits cubic and quadratic endpoints exactly, with s strictly increasing", () => {
    for (const d of ["M0 0 C0 50 100 50 100 0", "M10 10 Q50 90 90 10"]) {
      const curve = strand(d);
      const end = d.split(" ").slice(-2).map(Number);
      expect(curve.points.at(-1)).toMatchObject({ x: end[0], y: end[1] });
      expect(curve.points[0]!.s).toBe(0);
      for (let i = 1; i < curve.points.length; i += 1) {
        expect(curve.points[i]!.s).toBeGreaterThan(curve.points[i - 1]!.s);
      }
      expect(curve.length).toBe(curve.points.at(-1)!.s);
    }
  });

  it("reads paints and fill opacity", () => {
    const art = parseLineArt(
      svg(
        `<path id="a" stroke="#ffffff" fill="currentColor" fill-opacity="0.25" d="M0 0 L1 1" />`,
        `<path id="b" stroke="none" d="M0 0 L1 1" />`,
      ),
    );
    expect(art).toMatchObject({ width: 100, height: 100 });
    expect(art.strands[0]).toMatchObject({
      id: "a",
      stroke: 0xffffff,
      fill: "currentColor",
      fillOpacity: 0.25,
    });
    expect(art.strands[1]).toMatchObject({ id: "b", stroke: "none", fill: "none", fillOpacity: 1 });
  });

  it("rejects unsupported input", () => {
    expect(() => strand("M0 0 S10 10 20 0")).toThrow("lineArt: unsupported path command S");
    expect(() => parseLineArt(svg('<circle cx="1" cy="1" r="1" />'))).toThrow(
      "lineArt: unsupported <circle>",
    );
    expect(() => strand("M0 0 L1 1", 'transform="scale(2)"')).toThrow(
      "lineArt: transform not supported",
    );
    expect(() => parseLineArt(svg('<path d="M0 0 L1 1" />'))).toThrow("lineArt: path missing id");
    expect(() => strand("M0 0 L1 1 M5 5 L6 6")).toThrow("lineArt: one subpath per path");
    expect(() => strand("M0 0 L1 1 Z M5 5 L6 6")).toThrow("lineArt: one subpath per path");
    expect(() => parseLineArt('<svg viewBox="1 0 10 10"></svg>')).toThrow(
      'lineArt: viewBox must be "0 0 W H"',
    );
  });
});

describe("rotateLineArt", () => {
  const art = parseLineArt(svg(`<path id="a" stroke="currentColor" d="M50 50 L90 50" />`));
  const tip = (degrees: number) => rotateLineArt(art, degrees).strands[0]!.points.at(-1)!;

  it("turns quarter turns exactly, clockwise on screen, keeping distance along the strand", () => {
    expect(tip(0)).toEqual({ x: 90, y: 50, s: 40 });
    expect(tip(90)).toEqual({ x: 50, y: 90, s: 40 });
    expect(tip(180)).toEqual({ x: 10, y: 50, s: 40 });
    expect(tip(270)).toEqual({ x: 50, y: 10, s: 40 });
    expect(tip(-90)).toEqual(tip(270));
    expect(rotateLineArt(art, 90).strands[0]!.length).toBe(40);
  });

  it("turns by any angle about the centre", () => {
    const p = tip(45);
    expect(p.x).toBeCloseTo(50 + 40 * Math.SQRT1_2);
    expect(p.y).toBeCloseTo(50 + 40 * Math.SQRT1_2);
    expect(p.s).toBe(40);
  });

  it("rejects non-square art", () => {
    expect(() => rotateLineArt({ ...art, height: 50 }, 90)).toThrow(
      "lineArt: rotateLineArt needs a square viewBox",
    );
  });
});
