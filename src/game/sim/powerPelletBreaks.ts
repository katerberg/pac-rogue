import { query, type World } from "bitecs";
import {
  powerPelletBreakProgress,
  type PowerPelletBreakFacing,
} from "../../domain/powerPelletBreak";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { CARDINAL_STEP } from "../systems/heldKeys";
import { playerFacing } from "../systems/playerDirection";
import type { SimEvent } from "./simEvents";

export type ActivePowerPelletBreak = {
  id: number;
  x: number;
  y: number;
  facing: PowerPelletBreakFacing;
  elapsedMs: number;
};

type PowerPelletBreakEvent = Extract<SimEvent, { type: "powerPelletBreak" }>;

/** Facing for shatter bias: ECS Facing, else held intent when a corner clears Facing. */
function powerPelletBreakFacing(world: World): PowerPelletBreakFacing {
  const facing = playerFacing(world);
  const fromFacing = CARDINAL_STEP[facing];
  if (fromFacing !== undefined) {
    return fromFacing;
  }
  const eid = query(world, [Player, Input])[0];
  const intent = eid === undefined ? DIRECTION.none : (Input.direction[eid] ?? DIRECTION.none);
  return CARDINAL_STEP[intent] ?? { dx: 0, dy: 0 };
}

export function startPowerPelletBreaks(
  world: World,
  breaks: ActivePowerPelletBreak[],
  nextId: number,
  positions: readonly { x: number; y: number }[],
  emit: (event: PowerPelletBreakEvent) => void,
): number {
  if (positions.length === 0) {
    return nextId;
  }
  const facing = powerPelletBreakFacing(world);
  let id = nextId;
  for (const pos of positions) {
    const breakId = id;
    id += 1;
    breaks.push({
      id: breakId,
      x: pos.x,
      y: pos.y,
      facing,
      elapsedMs: 0,
    });
    emit({
      type: "powerPelletBreak",
      id: breakId,
      x: pos.x,
      y: pos.y,
      facingDx: facing.dx,
      facingDy: facing.dy,
      progress: 0,
    });
  }
  return id;
}

export function tickPowerPelletBreaks(
  breaks: ActivePowerPelletBreak[],
  delta: number,
  emit: (event: PowerPelletBreakEvent) => void,
): ActivePowerPelletBreak[] {
  if (breaks.length === 0) {
    return breaks;
  }
  const remaining: ActivePowerPelletBreak[] = [];
  for (const brk of breaks) {
    brk.elapsedMs += delta;
    const progress = powerPelletBreakProgress(brk.elapsedMs);
    emit({
      type: "powerPelletBreak",
      id: brk.id,
      x: brk.x,
      y: brk.y,
      facingDx: brk.facing.dx,
      facingDy: brk.facing.dy,
      progress,
    });
    if (progress < 1) {
      remaining.push(brk);
    }
  }
  return remaining;
}
