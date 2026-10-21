import { describe, expect, it } from "vitest";
import { CHARGE_PER_PENNY, PENNIES_PER_QUARTER, QUARTER_CHARGE } from "./pennies";
import {
  PENNY_COLLAPSE_MS,
  PENNY_DROP_MS,
  bumpPennyFx,
  createPennyFx,
  fillPennyFx,
  holdPennyFx,
  pennyStackLooks,
  releasePennyFx,
  pennyBumpFx,
  pennyCollapsing,
  pennyHopOffset,
  quartersShownDuringCollapse,
  pennyLooks,
  slowPennyFx,
  stepPennyFx,
  type PennyFxState,
  type PennyGeometry,
} from "./penniesFx";

const GEO: PennyGeometry = {
  x0: 300,
  y: 20,
  step: 10,
  size: 12,
  target: { x: 20, y: 14 },
  stack: { x: 700, y: 30 },
};

function run(s: PennyFxState, ms: number, charge: number, frameMs = 16): PennyFxState {
  let state = s;
  for (let t = 0; t < ms; t += frameMs) {
    state = stepPennyFx(state, frameMs, charge);
  }
  return state;
}

describe("pennyBumpFx", () => {
  it("hops harder with the tier and shakes the chrome from tier 8", () => {
    expect(pennyBumpFx(1)).toEqual({ hopPx: 1, wobbles: 1, chromeShake: false });
    expect(pennyBumpFx(5)).toEqual({ hopPx: 3, wobbles: 3, chromeShake: false });
    expect(pennyBumpFx(8)).toEqual({ hopPx: 4, wobbles: 3, chromeShake: true });
  });
});

describe("penny row", () => {
  it("starts with the pennies already in the charge, settled", () => {
    const s = createPennyFx(5 * CHARGE_PER_PENNY + 1);
    expect(s.row).toHaveLength(5);
    expect(pennyLooks(s, GEO).map((l) => l.y)).toEqual(Array(5).fill(GEO.y));
  });

  it("drops one penny per interval as the charge crosses penny boundaries", () => {
    let s = createPennyFx(0);
    s = run(s, 500, 3 * CHARGE_PER_PENNY);
    expect(s.row).toHaveLength(3);
    expect(s.landed).toBe(0);
  });

  it("a dropping penny falls from above and lands on its slot", () => {
    let s = createPennyFx(0);
    s = stepPennyFx(s, 50, CHARGE_PER_PENNY);
    expect(pennyLooks(s, GEO)[0]!.y).toBeLessThan(GEO.y);
    s = run(s, PENNY_DROP_MS + 40, CHARGE_PER_PENNY);
    expect(pennyLooks(s, GEO)[0]!.y).toBe(GEO.y);
  });

  it("holds new drops until the collapse is over, then carries the remainder", () => {
    let s = createPennyFx(QUARTER_CHARGE - CHARGE_PER_PENNY);
    expect(s.row).toHaveLength(PENNIES_PER_QUARTER - 1);
    s = fillPennyFx(s, 1);
    const charge = 2 * CHARGE_PER_PENNY;
    while (!pennyCollapsing(s)) {
      s = stepPennyFx(s, 16, charge);
    }
    expect(s.row).toHaveLength(PENNIES_PER_QUARTER);
    s = run(s, PENNY_COLLAPSE_MS - 100, charge);
    expect(s.landed).toBe(0);
    expect(s.row).toHaveLength(PENNIES_PER_QUARTER);
    s = run(s, 200, charge);
    expect(s.landed).toBe(1);
    expect(pennyCollapsing(s)).toBe(false);
    s = run(s, 400, charge);
    expect(s.row).toHaveLength(2);
  });

  it("sweeps pennies onto the quarter's slot, leftmost first, and stacks them there until the quarter shows", () => {
    let s = fillPennyFx(createPennyFx(QUARTER_CHARGE - CHARGE_PER_PENNY), 1);
    while (!pennyCollapsing(s)) {
      s = stepPennyFx(s, 16, 0);
    }
    s = run(s, 150, 0);
    const midway = pennyLooks(s, GEO);
    expect(midway[0]!.x).toBeLessThan(GEO.x0);
    expect(midway[midway.length - 1]!.x).toBeGreaterThan(midway[0]!.x);
    expect(midway.every((l) => l.size === GEO.size)).toBe(true);
    for (const [i, look] of midway.entries()) {
      const x0 = GEO.x0 + i * GEO.step;
      const t = (look.x - x0) / (GEO.target.x - x0);
      expect(look.y).toBeCloseTo(GEO.y + (GEO.target.y - GEO.y) * t, 5);
    }
    s = run(s, PENNY_COLLAPSE_MS - 150 - 60, 0);
    expect(s.landed).toBe(0);
    const stacked = pennyLooks(s, GEO);
    expect(stacked).toHaveLength(PENNIES_PER_QUARTER);
    for (const look of stacked) {
      expect(look.x).toBeCloseTo(GEO.target.x, 5);
      expect(look.y).toBeCloseTo(GEO.target.y, 5);
    }
    s = run(s, 120, 0);
    expect(s.landed).toBe(1);
    expect(pennyLooks(s, GEO)).toEqual([]);
  });

  it("withholds each paid Quarter from the HUD until its collapse lands", () => {
    let s = fillPennyFx(createPennyFx(0), 2);
    expect(quartersShownDuringCollapse(5, s)).toBe(3);
    s = run(s, 6000, 0);
    expect(quartersShownDuringCollapse(5, s)).toBe(5);
    expect(quartersShownDuringCollapse(1, fillPennyFx(createPennyFx(0), 3))).toBe(0);
  });

  it("pays several quarters one collapse at a time", () => {
    let s = fillPennyFx(createPennyFx(0), 3);
    s = run(s, 6000, 0);
    expect(s.landed).toBe(3);
    expect(s.row).toHaveLength(0);
  });

  it("slow drops space a big refill out and relax once the backlog clears", () => {
    const fast = run(createPennyFx(0), 300, 12 * CHARGE_PER_PENNY);
    const slow = run(slowPennyFx(createPennyFx(0)), 300, 12 * CHARGE_PER_PENNY);
    expect(slow.row.length).toBeLessThan(fast.row.length);
    expect(run(slow, 2000, 12 * CHARGE_PER_PENNY).slowDrops).toBe(false);
  });

  it("hops the row on a bump and settles", () => {
    let s = createPennyFx(4 * CHARGE_PER_PENNY);
    s = bumpPennyFx(s, pennyBumpFx(5));
    s = stepPennyFx(s, 70, 4 * CHARGE_PER_PENNY);
    expect(pennyHopOffset(s)).toBeLessThan(0);
    s = run(s, 1000, 4 * CHARGE_PER_PENNY);
    expect(pennyHopOffset(s)).toBe(0);
  });
});

describe("time penny stack", () => {
  it("holds earned pennies in a stack instead of dropping them into the row", () => {
    const charge = 4 * CHARGE_PER_PENNY;
    const s = run(holdPennyFx(createPennyFx(0)), 500, charge);
    expect(s.row).toHaveLength(0);
    expect(pennyStackLooks(s, charge, GEO)).toHaveLength(4);
  });

  it("shows every earned penny, spilling into more stacks side by side", () => {
    const charge = 14 * CHARGE_PER_PENNY;
    const s = fillPennyFx(holdPennyFx(createPennyFx(0)), 1);
    const looks = pennyStackLooks(s, charge, GEO);
    expect(looks).toHaveLength(PENNIES_PER_QUARTER + 14);
    const columns = new Set(looks.map((l) => l.x));
    expect(columns.size).toBe(Math.ceil(looks.length / 6));
    expect(Math.max(...columns)).toBe(GEO.stack.x);
  });

  it("slides the stack's own pennies, top of the far stack first, straight across into their slots", () => {
    const charge = 8 * CHARGE_PER_PENNY;
    let s = run(holdPennyFx(createPennyFx(0)), 200, charge);
    const stack = pennyStackLooks(s, charge, GEO);
    s = releasePennyFx(s, charge);
    s = stepPennyFx(s, 1, charge);
    expect(s.row).toHaveLength(1);
    expect(pennyLooks(s, GEO)[0]).toMatchObject({ x: stack[7]!.x, y: GEO.y, size: GEO.size });
    expect(pennyStackLooks(s, charge, GEO)).toEqual(stack.slice(0, 7));
    s = run(s, 80, charge);
    for (const look of pennyLooks(s, GEO)) {
      expect(look.y).toBe(GEO.y);
    }
    s = run(s, 800, charge);
    expect(pennyLooks(s, GEO).map((l) => [l.x, l.y])).toEqual(
      Array.from({ length: 8 }, (_, i) => [GEO.x0 + i * GEO.step, GEO.y]),
    );
    expect(pennyStackLooks(s, charge, GEO)).toHaveLength(0);
  });

  it("still collapses a full row into a quarter after the slide", () => {
    let s = releasePennyFx(fillPennyFx(holdPennyFx(createPennyFx(0)), 1), 0);
    s = run(s, 2500, 0);
    expect(s.landed).toBe(1);
    expect(s.row).toHaveLength(0);
  });
});
