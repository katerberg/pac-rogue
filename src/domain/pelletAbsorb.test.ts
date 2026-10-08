import { describe, expect, it } from "vitest";
import {
  DEFAULT_PELLET_ABSORB_LOOK,
  PELLET_ABSORB_STRETCH_END,
  pelletAbsorbActive,
  pelletAbsorbKindOk,
  pelletAbsorbLook,
  pelletAbsorbLookTuning,
  pelletAbsorbSpawnFor,
  pelletAbsorbStyleOk,
} from "./pelletAbsorb";
import { BOSS_PELLET_DRAWABLE_ID, PELLET_DRAWABLE_ID, POWER_PELLET_DRAWABLE_ID } from "./playfield";
import { DEFAULT_TUNING, resolveTuning } from "./tuning";

describe("pelletAbsorbStyleOk", () => {
  it("allows neon and lined, rejects pixel", () => {
    expect(pelletAbsorbStyleOk("neon")).toBe(true);
    expect(pelletAbsorbStyleOk("lined")).toBe(true);
    expect(pelletAbsorbStyleOk("pixel")).toBe(false);
  });
});

describe("pelletAbsorbKindOk", () => {
  it("allows regular and optional pellet ids", () => {
    expect(pelletAbsorbKindOk(PELLET_DRAWABLE_ID, false)).toBe(true);
    expect(pelletAbsorbKindOk(PELLET_DRAWABLE_ID, true)).toBe(true);
  });

  it("rejects power and boss", () => {
    expect(pelletAbsorbKindOk(POWER_PELLET_DRAWABLE_ID, false)).toBe(false);
    expect(pelletAbsorbKindOk(BOSS_PELLET_DRAWABLE_ID, false)).toBe(false);
  });
});

describe("pelletAbsorbActive", () => {
  it("follows the enabled toggle and duration", () => {
    expect(pelletAbsorbActive(DEFAULT_TUNING)).toBe(true);
    expect(pelletAbsorbActive(resolveTuning({ pelletAbsorbEnabled: false }))).toBe(false);
    expect(pelletAbsorbActive(resolveTuning({ pelletAbsorbMs: 0 }))).toBe(false);
  });
});

describe("pelletAbsorbLookTuning", () => {
  it("reads absorb look knobs from Tuning", () => {
    expect(pelletAbsorbLookTuning(DEFAULT_TUNING)).toEqual(DEFAULT_PELLET_ABSORB_LOOK);
    expect(
      pelletAbsorbLookTuning(resolveTuning({ pelletAbsorbMidThin: 0.5, pelletAbsorbSuckEase: 3 })),
    ).toMatchObject({ midThin: 0.5, suckEase: 3 });
  });
});

describe("pelletAbsorbLook", () => {
  const from = { x: 100, y: 200 };
  const to = { x: 140, y: 200 };
  const r = 2;

  it("at t=0 parks far at from and near at to", () => {
    const look = pelletAbsorbLook(0, from, to, r);
    expect(look.far).toMatchObject({ x: from.x, y: from.y });
    expect(look.near).toMatchObject({ x: to.x, y: to.y });
    expect(look.alpha).toBe(1);
    expect(look.midWidth).toBeCloseTo(r);
  });

  it("mid-stretch keeps far fixed and thins the mid", () => {
    const look = pelletAbsorbLook(PELLET_ABSORB_STRETCH_END * 0.5, from, to, r);
    expect(look.far).toMatchObject({ x: from.x, y: from.y });
    expect(look.near).toMatchObject({ x: to.x, y: to.y });
    expect(look.midWidth).toBeLessThan(r);
    expect(look.alpha).toBe(1);
  });

  it("honours midThin and shrink knobs", () => {
    const look = pelletAbsorbLook(PELLET_ABSORB_STRETCH_END, from, to, r, {
      ...DEFAULT_PELLET_ABSORB_LOOK,
      midThin: 1,
      nearShrink: 0.5,
      farShrink: 0.25,
    });
    expect(look.midWidth).toBeCloseTo(0);
    expect(look.near.r).toBeCloseTo(r * 0.5);
    expect(look.far.r).toBeCloseTo(r * 0.75);
  });

  it("late suck pulls far near to and fades out", () => {
    const look = pelletAbsorbLook(0.99, from, to, r);
    expect(look.far.x).toBeGreaterThan(from.x + (to.x - from.x) * 0.5);
    expect(look.alpha).toBeLessThan(0.2);
    expect(look.midWidth).toBeLessThan(r * 0.1);
  });

  it("suckEase power delays then snaps the far end", () => {
    const t = PELLET_ABSORB_STRETCH_END + (1 - PELLET_ABSORB_STRETCH_END) * 0.5;
    const linear = pelletAbsorbLook(t, from, to, r, {
      ...DEFAULT_PELLET_ABSORB_LOOK,
      suckEase: 1,
    });
    const snappy = pelletAbsorbLook(t, from, to, r, {
      ...DEFAULT_PELLET_ABSORB_LOOK,
      suckEase: 4,
    });
    expect(snappy.far.x).toBeLessThan(linear.far.x);
    expect(snappy.alpha).toBeGreaterThan(linear.alpha);
  });

  it("at t=1 collapses onto to with alpha 0", () => {
    const look = pelletAbsorbLook(1, from, to, r);
    expect(look.far).toMatchObject({ x: to.x, y: to.y });
    expect(look.near).toMatchObject({ x: to.x, y: to.y });
    expect(look.alpha).toBe(0);
    expect(look.midWidth).toBe(0);
  });
});

describe("pelletAbsorbSpawnFor", () => {
  it("builds a spawn for neon regular pellets", () => {
    expect(pelletAbsorbSpawnFor("neon", PELLET_DRAWABLE_ID, false, 10, 20)).toEqual({
      x: 10,
      y: 20,
      color: DEFAULT_TUNING.pelletCoreColor,
      radius: DEFAULT_TUNING.pelletRadius,
    });
  });

  it("returns null for pixel or power", () => {
    expect(pelletAbsorbSpawnFor("pixel", PELLET_DRAWABLE_ID, false, 0, 0)).toBeNull();
    expect(pelletAbsorbSpawnFor("neon", POWER_PELLET_DRAWABLE_ID, false, 0, 0)).toBeNull();
  });
});
