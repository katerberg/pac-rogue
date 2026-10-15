import { query, type World } from "bitecs";
import {
  powerPelletBreakIntensity,
  powerPelletBreakProgress,
  type PowerPelletBreakFacing,
} from "../../domain/powerPelletBreak";
import { PLAYER_SPEED } from "../../domain/playfield";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Speed } from "../components/Speed";
import { CARDINAL_STEP } from "../systems/heldKeys";
import { playerFacing } from "../systems/playerDirection";
import type { SimEvent } from "./simEvents";

export type ActivePowerPelletBreak = {
  id: number;
  x: number;
  y: number;
  facing: PowerPelletBreakFacing;
  intensity: number;
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

function powerPelletBreakEvent(
  brk: ActivePowerPelletBreak,
  progress: number,
): PowerPelletBreakEvent {
  return {
    type: "powerPelletBreak",
    id: brk.id,
    x: brk.x,
    y: brk.y,
    facingDx: brk.facing.dx,
    facingDy: brk.facing.dy,
    intensity: brk.intensity,
    progress,
  };
}

export function startPowerPelletBreaks(
  world: World,
  breaks: ActivePowerPelletBreak[],
  nextId: number,
  positions: readonly { x: number; y: number }[],
  emit: (event: PowerPelletBreakEvent) => void,
  baseSpeedPx: number = PLAYER_SPEED,
): number {
  if (positions.length === 0) {
    return nextId;
  }
  const facing = powerPelletBreakFacing(world);
  const speedEid = query(world, [Player, Speed])[0];
  const speedPx = speedEid === undefined ? 0 : (Speed.px[speedEid] ?? 0);
  const intensity = powerPelletBreakIntensity(speedPx, baseSpeedPx);
  let id = nextId;
  for (const pos of positions) {
    const brk: ActivePowerPelletBreak = {
      id,
      x: pos.x,
      y: pos.y,
      facing,
      intensity,
      elapsedMs: 0,
    };
    id += 1;
    breaks.push(brk);
    emit(powerPelletBreakEvent(brk, 0));
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
    emit(powerPelletBreakEvent(brk, progress));
    if (progress < 1) {
      remaining.push(brk);
    }
  }
  return remaining;
}
