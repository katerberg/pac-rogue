import { addComponent, hasComponent, query, type World } from "bitecs";
import { pickPelletToPowerTarget } from "../../domain/pelletToPower";
import { POWER_PELLET_DRAWABLE_ID } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { PowerPellet } from "../components/PowerPellet";

export function listRegularPelletEids(world: World): number[] {
  return [...query(world, [Pellet])].filter((eid) => !hasComponent(world, eid, PowerPellet));
}

export function convertPelletToPower(world: World, eid: number): boolean {
  if (!hasComponent(world, eid, Pellet) || hasComponent(world, eid, PowerPellet)) {
    return false;
  }
  addComponent(world, eid, PowerPellet);
  Drawable.id[eid] = POWER_PELLET_DRAWABLE_ID;
  return true;
}

/** Convert one random regular pellet; returns eid or null. */
export function applyPelletToPowerConvert(world: World, rng: () => number): number | null {
  const picked = pickPelletToPowerTarget(listRegularPelletEids(world), rng);
  if (picked === null) {
    return null;
  }
  convertPelletToPower(world, picked);
  return picked;
}
