import { query, type World } from "bitecs";
import { GHOST_SPEED } from "../../domain/ghostSpeed";
import { pickClosestGhostEid } from "../../domain/ghostRecall";
import { ghostHouseSpawnCenter } from "../../domain/maze";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Facing } from "../components/Facing";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";

export function recallClosestGhostToHouse(world: World): void {
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

  const spawn = ghostHouseSpawnCenter();
  Position.x[eid] = spawn.x;
  Position.y[eid] = spawn.y;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  GhostPhase.value[eid] = GHOST_PHASE.leaving;
  Input.direction[eid] = DIRECTION.up;
  Facing.direction[eid] = DIRECTION.up;
  Speed.px[eid] = GHOST_SPEED;
  Ghost.decidedCol[eid] = Number.NaN;
  Ghost.decidedRow[eid] = Number.NaN;
}
