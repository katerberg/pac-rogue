import { describe, expect, it } from "vitest";
import {
  PELLET_ABSORB_STRETCH_END,
  pelletAbsorbKindOk,
  pelletAbsorbLook,
  pelletAbsorbSpawnFor,
  pelletAbsorbStyleOk,
} from "./pelletAbsorb";
import { BOSS_PELLET_DRAWABLE_ID, PELLET_DRAWABLE_ID, POWER_PELLET_DRAWABLE_ID } from "./playfield";
import { DEFAULT_TUNING } from "./tuning";

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

  it("late suck pulls far near to and fades out", () => {
    const look = pelletAbsorbLook(0.99, from, to, r);
    expect(look.far.x).toBeGreaterThan(from.x + (to.x - from.x) * 0.5);
    expect(look.alpha).toBeLessThan(0.2);
    expect(look.midWidth).toBeLessThan(r * 0.1);
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
