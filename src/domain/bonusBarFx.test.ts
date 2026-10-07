import { describe, expect, it } from "vitest";
import { BONUS_BAR_MAX } from "./bonusBar";
import {
  BONUS_BAR_ART_H,
  BONUS_BAR_ART_W,
  BONUS_COLORS,
  BONUS_NEON_TRACK,
  BONUS_SLOTS,
  barRects,
  bonusBarGlowFilter,
  bonusBumpFx,
  bumpBarFx,
  createBarFx,
  fillBarFx,
  neonBarTube,
  slowFillBarFx,
  stepBarFx,
  type BarFxState,
  type BarRect,
} from "./bonusBarFx";

const { frame, fill, highlight, flash } = BONUS_COLORS;

function bodies(rects: BarRect[]): BarRect[] {
  return rects.filter((r) => r.h === 4);
}

function floorLines(rects: BarRect[]): BarRect[] {
  return rects.filter((r) => r.h === 1 && r.color === frame && r.w <= 5);
}

function stepFrames(s: BarFxState, frames: number, charge: number): BarFxState[] {
  const states: BarFxState[] = [];
  let state = s;
  for (let i = 0; i < frames; i += 1) {
    state = stepBarFx(state, 1000 / 60, charge);
    states.push(state);
  }
  return states;
}

describe("bonusBumpFx", () => {
  it("bounces for 5-25 in a row, harder as the streak grows", () => {
    expect([1, 2, 3, 4, 5].map(bonusBumpFx)).toEqual([
      { kind: "bounce", hopPx: 1, wobbles: 1, wave: false },
      { kind: "bounce", hopPx: 1, wobbles: 1, wave: false },
      { kind: "bounce", hopPx: 2, wobbles: 2, wave: false },
      { kind: "bounce", hopPx: 2, wobbles: 2, wave: true },
      { kind: "bounce", hopPx: 3, wobbles: 3, wave: true },
    ]);
  });

  it("punches from 30 in a row and shakes the chrome from 40", () => {
    expect(bonusBumpFx(6)).toEqual({ kind: "punch", shakePx: 1, flashMs: 90, chromeShake: false });
    expect(bonusBumpFx(8)).toEqual({ kind: "punch", shakePx: 2, flashMs: 150, chromeShake: true });
    expect(bonusBumpFx(12)).toEqual({ kind: "punch", shakePx: 3, flashMs: 240, chromeShake: true });
  });
});

describe("barRects (pixel)", () => {
  it("draws the frame and an empty floor line per slot when empty", () => {
    const rects = barRects(createBarFx(0), "pixel");
    expect(rects.filter((r) => r.w === 75 || r.h === 8)).toHaveLength(4);
    expect(floorLines(rects)).toHaveLength(BONUS_SLOTS);
    expect(rects.some((r) => r.color === fill)).toBe(false);
  });

  it("fills every slot at full charge", () => {
    const rects = barRects(createBarFx(BONUS_BAR_MAX), "pixel");
    expect(bodies(rects)).toHaveLength(BONUS_SLOTS);
    expect(bodies(rects).every((r) => r.w === 5 && r.color === fill)).toBe(true);
    expect(floorLines(rects)).toHaveLength(0);
  });

  it("draws a partial slot in whole pixels with a highlight row", () => {
    const rects = barRects(createBarFx(37.5), "pixel");
    const [first, second] = bodies(rects);
    expect(first).toMatchObject({ x: 2, y: 2, w: 5 });
    expect(second).toMatchObject({ x: 8, w: 3 });
    expect(floorLines(rects)).toContainEqual({ x: 11, y: 5, w: 2, h: 1, color: frame });
    expect(rects).toContainEqual({ x: 2, y: 2, w: 5, h: 1, color: highlight });
  });

  it("shows any charge as at least a 1-pixel sliver", () => {
    const [sliver] = bodies(barRects(createBarFx(2), "pixel"));
    expect(sliver).toMatchObject({ x: 2, w: 1 });
  });

  it("blinks the fill once the bar is 75% full", () => {
    const start = createBarFx(240);
    expect(bodies(barRects(start, "pixel"))[0]!.color).toBe(fill);
    const later = stepBarFx(start, 270, 240);
    expect(bodies(barRects(later, "pixel"))[0]!.color).toBe(highlight);
  });

  it("defaults to the pixel meter when style is omitted", () => {
    expect(bodies(barRects(createBarFx(BONUS_BAR_MAX)))).toHaveLength(BONUS_SLOTS);
  });

  it("returns no rects for neon STYLE (tube path owns that draw)", () => {
    expect(barRects(createBarFx(80), "neon")).toEqual([]);
    expect(barRects(createBarFx(80), "lined")).toEqual([]);
  });
});

describe("neonBarTube", () => {
  it("describes an empty capsule with dim track colors", () => {
    expect(neonBarTube(createBarFx(0))).toMatchObject({
      x: 0,
      y: 0,
      w: BONUS_BAR_ART_W,
      h: BONUS_BAR_ART_H,
      fillFrac: 0,
      frameColor: frame,
      trackColor: BONUS_NEON_TRACK,
    });
  });

  it("sets fillFrac proportional to charge", () => {
    expect(neonBarTube(createBarFx(80)).fillFrac).toBeCloseTo(80 / BONUS_BAR_MAX, 5);
    expect(neonBarTube(createBarFx(BONUS_BAR_MAX)).fillFrac).toBe(1);
  });

  it("uses fill/core colors and blinks near full", () => {
    const start = createBarFx(240);
    expect(neonBarTube(start).fillColor).toBe(fill);
    expect(neonBarTube(start).coreColor).toBe(highlight);
    const later = stepBarFx(start, 270, 240);
    expect(neonBarTube(later).fillColor).toBe(highlight);
  });

  it("flashes white on a punch", () => {
    const bumped = bumpBarFx(createBarFx(100), bonusBumpFx(6));
    const soon = stepBarFx(bumped, 40, 100);
    expect(neonBarTube(soon).fillColor).toBe(flash);
  });

  it("pulses the tube upward when pops are active", () => {
    const bumped = bumpBarFx(createBarFx(100), bonusBumpFx(7));
    const soon = stepBarFx(bumped, 40, 100);
    expect(neonBarTube(soon).y).toBeLessThan(0);
  });

  it("matches for lined and neon geometry", () => {
    // lined/neon share neonBarTube; STYLE only gates glow in the scene.
    expect(neonBarTube(createBarFx(80)).fillFrac).toBeCloseTo(80 / BONUS_BAR_MAX, 5);
  });
});

describe("bonusBarGlowFilter", () => {
  it("returns glow only for neon STYLE", () => {
    expect(bonusBarGlowFilter("neon")).toEqual({ outerStrength: 5, distance: 14 });
    expect(bonusBarGlowFilter("pixel")).toBeNull();
    expect(bonusBarGlowFilter("lined")).toBeNull();
  });
});

describe("stepBarFx", () => {
  it("springs toward the charge with a small overshoot", () => {
    const states = stepFrames(createBarFx(0), 60, 100);
    expect(states.some((s) => s.shown > 100)).toBe(true);
    expect(Math.abs(states[states.length - 1]!.shown - 100)).toBeLessThan(0.5);
  });

  it("fills a fruit bump 50% slower and then returns to normal speed", () => {
    const settle = (s: BarFxState): number =>
      stepFrames(s, 240, 150).findIndex(
        (st) => Math.abs(st.shown - 150) < 0.5 && Math.abs(st.vel) < 0.05,
      );
    const normal = settle(createBarFx(0));
    const slow = settle(slowFillBarFx(createBarFx(0)));
    expect(slow / normal).toBeGreaterThan(1.4);
    expect(slow / normal).toBeLessThan(1.6);
    const done = stepFrames(slowFillBarFx(createBarFx(0)), 240, 150).at(-1)!;
    expect(done.slowFill).toBe(false);
  });

  it("pops each slot as it lights", () => {
    const [first] = stepFrames(createBarFx(24), 1, 60);
    expect(first!.pops.map((p) => p.slot)).toEqual([0]);
  });

  it("runs up to full, wraps with a wave, then settles on the remainder", () => {
    const states = stepFrames(fillBarFx(createBarFx(290), 1), 120, 10);
    const wrapIndex = states.findIndex((s) => s.pendingWraps === 0);
    expect(wrapIndex).toBeGreaterThan(0);
    expect(states[wrapIndex]!.pops.filter((p) => p.px === 3)).toHaveLength(BONUS_SLOTS);
    expect(Math.abs(states[states.length - 1]!.shown - 10)).toBeLessThan(0.5);
  });
});

describe("bumpBarFx", () => {
  it("hops the whole bar up on a bounce", () => {
    const bumped = bumpBarFx(createBarFx(100), bonusBumpFx(5));
    const mid = stepBarFx(bumped, 160, 100);
    const top = barRects(mid)[0]!;
    expect(top.y).toBeLessThan(0);
    expect(top.x).toBe(0);
  });

  it("flashes every lit slot white on a punch", () => {
    const bumped = bumpBarFx(createBarFx(100), bonusBumpFx(6));
    const soon = stepBarFx(bumped, 40, 100);
    const lit = bodies(barRects(soon));
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.every((r) => r.color === flash)).toBe(true);
    const after = stepBarFx(soon, 200, 100);
    expect(bodies(barRects(after)).every((r) => r.color === fill)).toBe(true);
  });

  it("pops every slot together on a punch", () => {
    const bumped = bumpBarFx(createBarFx(100), bonusBumpFx(7));
    expect(bumped.pops.filter((p) => p.startMs === bumped.nowMs)).toHaveLength(BONUS_SLOTS);
  });
});
