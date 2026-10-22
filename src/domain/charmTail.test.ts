import { describe, expect, it } from "vitest";
import {
  bobbleOffset,
  resizeTail,
  layoutTail,
  stepTail,
  type TailAnchor,
  type TailBead,
  type TailEnv,
} from "./charmTail";
import { DEFAULT_CHARM_TUNING, tailLayoutFrom } from "./charmTailParams";

const LAYOUT = {
  ...tailLayoutFrom(DEFAULT_CHARM_TUNING),
  linkPx: 10,
  anchorBackPx: 4,
  radiusPx: 3,
  bobblePx: 1.2,
};
const origin: TailAnchor = { x: 100, y: 100, heading: 0 };
const open = (): boolean => false;

function env(overrides: Partial<TailEnv> = {}): TailEnv {
  return { dtMs: 16, nowMs: 0, motion: 0, blocked: open, ...overrides };
}

function settle(anchor: TailAnchor, count: number, steps = 400) {
  let beads = layoutTail(count, anchor, LAYOUT);
  for (let i = 0; i < steps; i++) {
    beads = stepTail(beads, anchor, LAYOUT, env());
  }
  return beads;
}

function corridorBlocked(x: number, y: number): boolean {
  const horizontal = y >= 90 && y <= 110 && x >= 0 && x <= 210;
  const vertical = x >= 190 && x <= 210 && y >= -400 && y <= 110;
  return !(horizontal || vertical);
}

function clearOfWalls(bead: TailBead, radiusPx: number): boolean {
  const points: [number, number][] = [
    [0, 0],
    [radiusPx, 0],
    [-radiusPx, 0],
    [0, radiusPx],
    [0, -radiusPx],
  ];
  return points.every(([dx, dy]) => !corridorBlocked(bead.x + dx, bead.y + dy));
}

describe("resizeTail", () => {
  it("keeps existing beads and lays new ones behind them when growing", () => {
    const [first] = layoutTail(1, origin, LAYOUT);
    const { beads, dropped } = resizeTail([first!], 3, origin, LAYOUT);
    expect(beads).toHaveLength(3);
    expect(beads[0]).toBe(first);
    expect(beads.map((b) => b.x)).toEqual([86, 76, 66]);
    expect(dropped).toEqual([]);
  });

  it("drops the last beads when shrinking and reports them", () => {
    const tail = layoutTail(3, origin, LAYOUT);
    const { beads, dropped } = resizeTail(tail, 1, origin, LAYOUT);
    expect(beads).toEqual([tail[0]]);
    expect(dropped).toEqual([tail[1], tail[2]]);
  });
});

describe("layoutTail", () => {
  it("lays beads straight behind the anchor, one link apart", () => {
    const beads = layoutTail(3, origin, LAYOUT);
    expect(beads.map((b) => b.x)).toEqual([86, 76, 66]);
    expect(beads.every((b) => b.y === 100)).toBe(true);
  });

  it("pulls a wall-blocked bead back along the trail instead of leaving it in the wall", () => {
    const beads = layoutTail(2, origin, LAYOUT, (x) => x < 80);
    expect(beads[0]!.x).toBe(86);
    expect(beads[1]!.x).toBeGreaterThanOrEqual(80);
    expect(beads[1]!.x).toBeLessThan(100);
    expect(beads[1]!.y).toBe(100);
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
    beads = stepTail(beads, turned, LAYOUT, env());
    expect(beads[2]!.y).toBeGreaterThan(98);
    expect(beads[2]!.x).toBeLessThan(70);
    const settled = settle(turned, 3);
    expect(settled[2]!.y).toBeCloseTo(100 - 4 - 30, 0);
    expect(settled[2]!.x).toBeCloseTo(100, 0);
  });

  it("slides through the anchor on reverse instead of teleporting to the new hook", () => {
    let beads = settle(origin, 3);
    const before = beads.map((b) => ({ x: b.x, y: b.y }));
    const reversed: TailAnchor = { x: 100, y: 100, heading: Math.PI };
    beads = stepTail(beads, reversed, LAYOUT, env({ motion: 1 }));
    // Soft stretch correction caps the hop; spring can add a little, but never a hook teleport.
    const maxHop = LAYOUT.linkPx * 0.6;
    for (let i = 0; i < beads.length; i++) {
      expect(Math.hypot(beads[i]!.x - before[i]!.x, beads[i]!.y - before[i]!.y)).toBeLessThan(
        maxHop,
      );
    }
    expect(beads[0]!.x).toBeGreaterThan(before[0]!.x);
    expect(beads[0]!.x).toBeLessThan(100);
    let x = 100;
    for (let i = 0; i < 40; i++) {
      x -= 2;
      beads = stepTail(
        beads,
        { x, y: 100, heading: Math.PI },
        LAYOUT,
        env({ nowMs: i * 16, motion: 1 }),
      );
    }
    expect(beads[0]!.x).toBeGreaterThan(x);
  });

  it("does not teleport beads onto the anchor when a reverse stretch is blocked by walls", () => {
    const corridor = (_x: number, y: number): boolean => !(y >= 90 && y <= 110);
    const inCorridor = (bead: TailBead): boolean => {
      const r = LAYOUT.radiusPx;
      return (
        !corridor(bead.x, bead.y) &&
        !corridor(bead.x + r, bead.y) &&
        !corridor(bead.x - r, bead.y) &&
        !corridor(bead.x, bead.y + r) &&
        !corridor(bead.x, bead.y - r)
      );
    };
    let beads = settle(origin, 3);
    for (let i = 0; i < 20; i++) {
      beads = stepTail(beads, origin, LAYOUT, env({ blocked: corridor }));
    }
    const reversed: TailAnchor = { x: 100, y: 100, heading: Math.PI };
    const before = beads.map((b) => ({ x: b.x, y: b.y }));
    beads = stepTail(beads, reversed, LAYOUT, env({ blocked: corridor, motion: 1 }));
    const maxHop = LAYOUT.linkPx * 0.6;
    for (let i = 0; i < beads.length; i++) {
      expect(Math.hypot(beads[i]!.x - before[i]!.x, beads[i]!.y - before[i]!.y)).toBeLessThan(
        maxHop,
      );
      expect(Math.hypot(beads[i]!.x - 100, beads[i]!.y - 100)).toBeGreaterThan(LAYOUT.radiusPx);
      expect(inCorridor(beads[i]!)).toBe(true);
    }
  });

  it("never stretches a link past the cap while dragged", () => {
    let beads = layoutTail(4, origin, LAYOUT);
    let x = 100;
    for (let i = 0; i < 200; i++) {
      x += 3;
      beads = stepTail(beads, { x, y: 100, heading: 0 }, LAYOUT, env());
      let prevX = x - LAYOUT.anchorBackPx;
      for (const bead of beads) {
        expect(Math.hypot(bead.x - prevX, bead.y - 100)).toBeLessThanOrEqual(
          LAYOUT.linkPx * LAYOUT.maxStretch + 0.01,
        );
        prevX = bead.x;
      }
    }
  });

  it("keeps beads apart when the anchor stops and the slack folds up", () => {
    let beads = layoutTail(4, origin, LAYOUT);
    let x = 100;
    for (let i = 0; i < 60; i++) {
      x += 3;
      beads = stepTail(beads, { x, y: 100, heading: 0 }, LAYOUT, env());
    }
    for (let i = 0; i < 60; i++) {
      beads = stepTail(beads, { x, y: 100, heading: 0 }, LAYOUT, env());
      for (let b = 1; b < beads.length; b++) {
        const gap = Math.hypot(beads[b]!.x - beads[b - 1]!.x, beads[b]!.y - beads[b - 1]!.y);
        expect(gap).toBeGreaterThanOrEqual(LAYOUT.linkPx * LAYOUT.minStretch - 0.01);
      }
    }
  });

  it("resnaps behind the anchor after a teleport", () => {
    const beads = settle(origin, 2);
    const jumped: TailAnchor = { x: 400, y: 300, heading: 0 };
    const next = stepTail(beads, jumped, LAYOUT, env());
    expect(next[0]!.x).toBeCloseTo(386, 5);
    expect(next[0]!.y).toBeCloseTo(300, 5);
  });

  it("returns an empty tail for no beads", () => {
    expect(stepTail([], origin, LAYOUT, env())).toEqual([]);
  });

  it("bounces a bead off a wall instead of entering it", () => {
    const bead: TailBead = { x: 125, y: 100, vx: 0.5, vy: 0 };
    const anchor: TailAnchor = { x: 140, y: 100, heading: 0 };
    const [next] = stepTail([bead], anchor, LAYOUT, env({ blocked: (x) => x >= 130 }));
    expect(next!.vx).toBeLessThan(0);
    expect(next!.x).toBeLessThanOrEqual(127);
  });

  it("never lets any bead touch a wall while the anchor drives around a corner", () => {
    const anchorAt = (x: number, y: number, heading: number): TailAnchor => ({ x, y, heading });
    let beads = layoutTail(6, anchorAt(60, 100, 0), LAYOUT, corridorBlocked);
    const check = (): void => {
      for (const bead of beads) {
        expect(clearOfWalls(bead, LAYOUT.radiusPx)).toBe(true);
      }
    };
    let x = 60;
    for (let i = 0; i < 400 && x < 200; i++) {
      x += 2;
      beads = stepTail(beads, anchorAt(x, 100, 0), LAYOUT, env({ blocked: corridorBlocked }));
      check();
    }
    let y = 100;
    for (let i = 0; i < 400 && y > 20; i++) {
      y -= 2;
      beads = stepTail(
        beads,
        anchorAt(200, y, -Math.PI / 2),
        LAYOUT,
        env({ blocked: corridorBlocked, nowMs: i * 16, motion: 1 }),
      );
      check();
    }
    for (let i = 0; i < 200; i++) {
      beads = stepTail(
        beads,
        anchorAt(200, 20, -Math.PI / 2),
        LAYOUT,
        env({ blocked: corridorBlocked }),
      );
      check();
    }
  });
});

describe("bobbleOffset", () => {
  it("is zero when standing still and bounded by the bobble amplitude at speed", () => {
    expect(bobbleOffset(1, 123, LAYOUT, 0)).toBe(0);
    for (let t = 0; t < 2000; t += 37) {
      expect(Math.abs(bobbleOffset(2, t, LAYOUT, 1))).toBeLessThanOrEqual(LAYOUT.bobblePx + 1e-9);
    }
  });
});
