import { query, type World } from "bitecs";
import { sortInHouseGhosts } from "../../domain/ghostHouseOrder";
import {
  assignHouseSeats,
  ghostHouseSeatCenters,
  type HouseSeatGhost,
} from "../../domain/ghostHouseSeats";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { pickClosestGhostEid } from "../../domain/ghostRecall";
import type { GhostReleaseClock } from "../../domain/ghostRelease";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Facing } from "../components/Facing";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";

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

  const seats = ghostHouseSeatCenters();
  const inHouse: (HouseSeatGhost & { kind: GhostKindId })[] = [];
  for (const houseEid of query(world, [Ghost, GhostKind, GhostPhase, Position])) {
    if ((GhostPhase.value[houseEid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.inHouse) {
      continue;
    }
    inHouse.push({
      eid: houseEid,
      kind: (GhostKind.kind[houseEid] ?? GHOST_KIND.blinky) as GhostKindId,
      x: Position.x[houseEid] ?? 0,
      y: Position.y[houseEid] ?? 0,
    });
  }

  const ordered = sortInHouseGhosts(inHouse, clock, collectedCount, afterLifeRelease);
  const assignment = assignHouseSeats(
    inHouse,
    ordered.map((g) => g.eid),
    seats,
  );

  for (const ghost of inHouse) {
    const seat = seats[assignment.get(ghost.eid) ?? 0]!;
    Position.x[ghost.eid] = seat.x;
    Position.y[ghost.eid] = seat.y;
    Velocity.x[ghost.eid] = 0;
    Velocity.y[ghost.eid] = 0;
    Speed.px[ghost.eid] = 0;
    Input.direction[ghost.eid] = DIRECTION.none;
    Facing.direction[ghost.eid] = DIRECTION.none;
    Ghost.decidedCol[ghost.eid] = Number.NaN;
    Ghost.decidedRow[ghost.eid] = Number.NaN;
  }
}
