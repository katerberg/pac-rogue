import { addComponent, hasComponent, query, removeComponent, type World } from "bitecs";
import { pickPelletToPowerTarget } from "../../domain/pelletToPower";
import { POWER_PELLET_DRAWABLE_ID } from "../../domain/playfield";
import { BossPellet } from "../components/BossPellet";
import { Drawable } from "../components/Drawable";
import { OptionalPellet } from "../components/OptionalPellet";
import { Pellet } from "../components/Pellet";
import { PowerPellet } from "../components/PowerPellet";

export function listRegularPelletEids(world: World): number[] {
  return [...query(world, [Pellet])].filter(
    (eid) => !hasComponent(world, eid, PowerPellet) && !hasComponent(world, eid, BossPellet),
  );
}

export function convertPelletToPower(world: World, eid: number): boolean {
  if (!hasComponent(world, eid, Pellet) || hasComponent(world, eid, PowerPellet)) {
    return false;
  }
  addComponent(world, eid, PowerPellet);
  removeComponent(world, eid, OptionalPellet);
  Drawable.id[eid] = POWER_PELLET_DRAWABLE_ID;
  return true;
}

export function applyPelletToPowerConvert(world: World, rng: () => number): number | null {
  const picked = pickPelletToPowerTarget(listRegularPelletEids(world), rng);
  if (picked === null) {
    return null;
  }
  convertPelletToPower(world, picked);
  return picked;
}
