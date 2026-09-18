import { addComponent, addEntity, createWorld, hasComponent } from "bitecs";
import { describe, expect, it } from "vitest";
import {
  PELLET_DRAWABLE_ID,
  PELLET_RADIUS,
  POWER_PELLET_DRAWABLE_ID,
} from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { PowerPellet } from "../components/PowerPellet";
import {
  applyPelletToPowerConvert,
  convertPelletToPower,
  listRegularPelletEids,
} from "./pelletToPower";

function spawnPellet(power = false): { world: ReturnType<typeof createWorld>; eid: number } {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Pellet);
  addComponent(world, eid, Drawable);
  if (power) {
    addComponent(world, eid, PowerPellet);
  }
  Drawable.id[eid] = power ? POWER_PELLET_DRAWABLE_ID : PELLET_DRAWABLE_ID;
  Drawable.radius[eid] = PELLET_RADIUS;
  return { world, eid };
}

describe("listRegularPelletEids", () => {
  it("excludes power pellets", () => {
    const { world, eid: regular } = spawnPellet(false);
    const power = addEntity(world);
    addComponent(world, power, Pellet);
    addComponent(world, power, PowerPellet);
    addComponent(world, power, Drawable);
    expect(listRegularPelletEids(world)).toEqual([regular]);
  });
});

describe("convertPelletToPower", () => {
  it("tags PowerPellet and power drawable; keeps radius", () => {
    const { world, eid } = spawnPellet(false);
    expect(convertPelletToPower(world, eid)).toBe(true);
    expect(hasComponent(world, eid, PowerPellet)).toBe(true);
    expect(Drawable.id[eid]).toBe(POWER_PELLET_DRAWABLE_ID);
    expect(Drawable.radius[eid]).toBe(PELLET_RADIUS);
  });

  it("no-ops when already power", () => {
    const { world, eid } = spawnPellet(true);
    expect(convertPelletToPower(world, eid)).toBe(false);
  });
});

describe("applyPelletToPowerConvert", () => {
  it("returns null when no regulars", () => {
    const { world } = spawnPellet(true);
    expect(applyPelletToPowerConvert(world, () => 0)).toBeNull();
  });

  it("converts the rng-picked regular", () => {
    const { world, eid: a } = spawnPellet(false);
    const b = addEntity(world);
    addComponent(world, b, Pellet);
    addComponent(world, b, Drawable);
    Drawable.id[b] = PELLET_DRAWABLE_ID;
    Drawable.radius[b] = PELLET_RADIUS;

    const picked = applyPelletToPowerConvert(world, () => 0.99);
    expect(picked).toBe(b);
    expect(hasComponent(world, a, PowerPellet)).toBe(false);
    expect(hasComponent(world, b, PowerPellet)).toBe(true);
    expect(Drawable.id[b]).toBe(POWER_PELLET_DRAWABLE_ID);
  });
});
