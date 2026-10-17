import { describe, expect, it } from "vitest";
import { bobbleOffset, charmsFor, layoutTail, stepTail, type TailAnchor } from "./charmTail";

const LAYOUT = { linkPx: 10, anchorBackPx: 4 };
const origin: TailAnchor = { x: 100, y: 100, heading: 0 };

function settle(anchor: TailAnchor, count: number, steps = 400) {
  let beads = layoutTail(count, anchor, LAYOUT);
  for (let i = 0; i < steps; i++) {
    beads = stepTail(beads, anchor, LAYOUT, 16);
  }
  return beads;
}

describe("charmsFor", () => {
  it("returns one charm per owned upgrade carrying school and enhanced flag", () => {
    expect(charmsFor(["fruitFecundity", "passiveStartingShieldPlus"])).toEqual([
      { school: "harvest", enhanced: false },
      { school: "protection", enhanced: true },
    ]);
  });

  it("is empty with no upgrades", () => {
    expect(charmsFor([])).toEqual([]);
  });
});

describe("layoutTail", () => {
  it("lays beads straight behind the anchor, one link apart", () => {
    const beads = layoutTail(3, origin, LAYOUT);
    expect(beads.map((b) => b.x)).toEqual([86, 76, 66]);
    expect(beads.every((b) => b.y === 100)).toBe(true);
  });
});

describe("stepTail", () => {
  it("rests one link apart behind a stationary anchor", () => {
    const beads = settle(origin, 3);
    expect(beads[0]!.x).toBeCloseTo(86, 0);
    expect(beads[2]!.x).toBeCloseTo(66, 0);
  });

  it("swings around a corner instead of snapping to the new heading", () => {
    let beads = settle(origin, 3);
    const turned: TailAnchor = { x: 100, y: 100, heading: Math.PI / 2 };
    beads = stepTail(beads, turned, LAYOUT, 16);
    expect(beads[2]!.y).toBeGreaterThan(98);
    expect(beads[2]!.x).toBeLessThan(70);
    const settled = settle(turned, 3);
    expect(settled[2]!.y).toBeCloseTo(100 - 4 - 30, 0);
    expect(settled[2]!.x).toBeCloseTo(100, 0);
  });

  it("never stretches a link beyond the cap while dragged", () => {
    let beads = layoutTail(4, origin, LAYOUT);
    let x = 100;
    for (let i = 0; i < 200; i++) {
      x += 3;
      beads = stepTail(beads, { x, y: 100, heading: 0 }, LAYOUT, 16);
      let prevX = x - LAYOUT.anchorBackPx;
      for (const bead of beads) {
        expect(Math.hypot(bead.x - prevX, bead.y - 100)).toBeLessThanOrEqual(LAYOUT.linkPx * 1.31);
        prevX = bead.x;
      }
    }
  });

  it("keeps beads apart when the anchor stops and the slack folds up", () => {
    let beads = layoutTail(4, origin, LAYOUT);
    let x = 100;
    for (let i = 0; i < 60; i++) {
      x += 3;
      beads = stepTail(beads, { x, y: 100, heading: 0 }, LAYOUT, 16);
    }
    for (let i = 0; i < 60; i++) {
      beads = stepTail(beads, { x, y: 100, heading: 0 }, LAYOUT, 16);
      for (let b = 1; b < beads.length; b++) {
        const gap = Math.hypot(beads[b]!.x - beads[b - 1]!.x, beads[b]!.y - beads[b - 1]!.y);
        expect(gap).toBeGreaterThanOrEqual(LAYOUT.linkPx * 0.79);
      }
    }
  });

  it("resnaps behind the anchor after a teleport", () => {
    const beads = settle(origin, 2);
    const jumped: TailAnchor = { x: 400, y: 300, heading: 0 };
    const next = stepTail(beads, jumped, LAYOUT, 16);
    expect(next[0]!.x).toBeCloseTo(386, 5);
    expect(next[0]!.y).toBeCloseTo(300, 5);
  });

  it("returns an empty tail for no charms", () => {
    expect(stepTail([], origin, LAYOUT, 16)).toEqual([]);
  });
});

describe("bobbleOffset", () => {
  it("is zero when standing still and stays a small fraction of a link at speed", () => {
    expect(bobbleOffset(1, 123, 10, 0)).toBe(0);
    for (let t = 0; t < 2000; t += 37) {
      expect(Math.abs(bobbleOffset(2, t, 10, 1))).toBeLessThanOrEqual(1.21);
    }
  });
});
