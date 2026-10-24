import { query, removeEntity, type World } from "bitecs";
import { circlesOverlap } from "../../domain/circles";
import { worldToCol, worldToRow } from "../../domain/maze";
import { Drawable } from "../components/Drawable";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { SlotMachine } from "../components/SlotMachine";

export type CollectedSlotMachine = { eid: number; col: number; row: number };

export function collectSlotMachines(
  world: World,
  at?: { x: number; y: number },
): CollectedSlotMachine[] {
  const players = query(world, [Player, Position, Drawable]);
  if (players.length === 0) {
    return [];
  }

  const playerEid = players[0]!;
  const px = at?.x ?? Position.x[playerEid] ?? 0;
  const py = at?.y ?? Position.y[playerEid] ?? 0;
  const playerRadius = Drawable.radius[playerEid] ?? 0;

  const toRemove: CollectedSlotMachine[] = [];
  for (const eid of query(world, [SlotMachine, Position, Drawable])) {
    const fx = Position.x[eid] ?? 0;
    const fy = Position.y[eid] ?? 0;
    const radius = Drawable.radius[eid] ?? 0;
    if (circlesOverlap(px, py, playerRadius, fx, fy, radius)) {
      toRemove.push({ eid, col: worldToCol(fx), row: worldToRow(fy) });
    }
  }

  for (const item of toRemove) {
    removeEntity(world, item.eid);
  }

  return toRemove;
}

export function collectSlotMachinesForBodies(
  world: World,
  bodies: readonly { x: number; y: number }[],
): CollectedSlotMachine[] {
  return [collectSlotMachines(world), ...bodies.map((at) => collectSlotMachines(world, at))].flat();
}
