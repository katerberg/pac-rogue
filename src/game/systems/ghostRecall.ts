import { query, type World } from "bitecs";
import { pickClosestGhostEid } from "../../domain/ghostRecall";
import type { GhostReleaseClock } from "../../domain/ghostRelease";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Facing } from "../components/Facing";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { placeInHouseGhostsAtPredictedSeats } from "./ghostHouseSeating";

export function recallClosestGhostToHouse(
  world: World,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
): void {
  const players = query(world, [Player, Position]);
  const playerEid = players[0];
  if (playerEid === undefined) {
    return;
  }
  const fromX = Position.x[playerEid] ?? 0;
  const fromY = Position.y[playerEid] ?? 0;

  const candidates = [];
  for (const eid of query(world, [Ghost, GhostPhase, Position, Velocity, Input, Facing, Speed])) {
    candidates.push({
      eid,
      x: Position.x[eid] ?? 0,
      y: Position.y[eid] ?? 0,
      phase: (GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) as GhostPhaseValue,
    });
  }

  const eid = pickClosestGhostEid(candidates, fromX, fromY);
  if (eid === null) {
    return;
  }

  GhostPhase.value[eid] = GHOST_PHASE.inHouse;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  Input.direction[eid] = DIRECTION.none;
  Facing.direction[eid] = DIRECTION.none;
  Speed.px[eid] = 0;
  Ghost.decidedCol[eid] = Number.NaN;
  Ghost.decidedRow[eid] = Number.NaN;

  placeInHouseGhostsAtPredictedSeats(world, clock, collectedCount, afterLifeRelease);
}
