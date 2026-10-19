import { describe, expect, it } from "vitest";
import { CHARGE_PER_PENNY, PENNIES_PER_QUARTER, QUARTER_CHARGE } from "./pennies";
import {
  PENNY_COLLAPSE_MS,
  PENNY_DROP_MS,
  bumpPennyFx,
  createPennyFx,
  fillPennyFx,
  pennyBumpFx,
  pennyCollapsing,
  pennyHopOffset,
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
  targetSize: 16,
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

  it("sweeps pennies to the quarter, leftmost first, and hides them on arrival", () => {
    let s = fillPennyFx(createPennyFx(QUARTER_CHARGE - CHARGE_PER_PENNY), 1);
    s = run(s, 400, 0);
    expect(pennyCollapsing(s)).toBe(true);
    s = run(s, 150, 0);
    const looks = pennyLooks(s, GEO);
    expect(looks.length).toBeGreaterThan(0);
    expect(looks[0]!.x).toBeLessThan(GEO.x0);
    expect(looks[looks.length - 1]!.x).toBeCloseTo(
      GEO.x0 + (looks.length - 1 + (PENNIES_PER_QUARTER - looks.length)) * GEO.step,
      0,
    );
    expect(looks[0]!.size).toBeLessThan(GEO.size);
    s = run(s, PENNY_COLLAPSE_MS, 0);
    expect(pennyLooks(s, GEO)).toEqual([]);
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
