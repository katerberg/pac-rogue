import { query, type World } from "bitecs";
import { sortInHouseGhosts } from "../../domain/ghostHouseOrder";
import {
  assignHouseSeats,
  ghostHouseSeatCenters,
  type HouseSeatGhost,
} from "../../domain/ghostHouseSeats";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import type { GhostReleaseClock } from "../../domain/ghostRelease";
import { GHOST_SPEED } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { TURN_ALIGN_EPS } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";

type InHouseGhost = HouseSeatGhost & { kind: GhostKindId };

function directionToward(fromX: number, fromY: number, toX: number, toY: number): Direction {
  if (Math.abs(fromX - toX) > TURN_ALIGN_EPS) {
    return fromX < toX ? DIRECTION.right : DIRECTION.left;
  }
  if (Math.abs(fromY - toY) > TURN_ALIGN_EPS) {
    return fromY < toY ? DIRECTION.down : DIRECTION.up;
  }
  return DIRECTION.none;
}

function collectInHouseGhosts(world: World): InHouseGhost[] {
  const inHouse: InHouseGhost[] = [];
  for (const eid of query(world, [
    Ghost,
    GhostKind,
    GhostPhase,
    Position,
    Input,
    Facing,
    Speed,
    Velocity,
  ])) {
    if ((GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.inHouse) {
      continue;
    }
    inHouse.push({
      eid,
      kind: (GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId,
      x: Position.x[eid] ?? 0,
      y: Position.y[eid] ?? 0,
    });
  }
  return inHouse;
}

function seatAssignment(
  inHouse: InHouseGhost[],
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease: boolean,
) {
  const seats = ghostHouseSeatCenters();
  const ordered = sortInHouseGhosts(inHouse, clock, collectedCount, afterLifeRelease);
  const assignment = assignHouseSeats(
    inHouse,
    ordered.map((g) => g.eid),
    seats,
  );
  return { seats, assignment };
}

export function ghostHouseSeating(
  world: World,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
): void {
  const inHouse = collectInHouseGhosts(world);
  if (inHouse.length === 0) {
    return;
  }

  const { seats, assignment } = seatAssignment(inHouse, clock, collectedCount, afterLifeRelease);

  for (const ghost of inHouse) {
    const seat = seats[assignment.get(ghost.eid) ?? 0]!;
    const dir = directionToward(ghost.x, ghost.y, seat.x, seat.y);
    if (dir === DIRECTION.none) {
      Position.x[ghost.eid] = seat.x;
      Position.y[ghost.eid] = seat.y;
      Velocity.x[ghost.eid] = 0;
      Velocity.y[ghost.eid] = 0;
      Speed.px[ghost.eid] = 0;
      Input.direction[ghost.eid] = DIRECTION.none;
      Facing.direction[ghost.eid] = DIRECTION.none;
      continue;
    }
    Speed.px[ghost.eid] = GHOST_SPEED;
    Input.direction[ghost.eid] = dir;
    Facing.direction[ghost.eid] = dir;
  }
}

export function placeInHouseGhostsAtPredictedSeats(
  world: World,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
): void {
  const inHouse = collectInHouseGhosts(world);
  if (inHouse.length === 0) {
    return;
  }

  const { seats, assignment } = seatAssignment(inHouse, clock, collectedCount, afterLifeRelease);

  for (const ghost of inHouse) {
    const seat = seats[assignment.get(ghost.eid) ?? 0]!;
    Position.x[ghost.eid] = seat.x;
    Position.y[ghost.eid] = seat.y;
    Velocity.x[ghost.eid] = 0;
    Velocity.y[ghost.eid] = 0;
    Speed.px[ghost.eid] = 0;
    Input.direction[ghost.eid] = DIRECTION.none;
    Facing.direction[ghost.eid] = DIRECTION.none;
    GhostPhase.value[ghost.eid] = GHOST_PHASE.inHouse;
    Ghost.decidedCol[ghost.eid] = Number.NaN;
    Ghost.decidedRow[ghost.eid] = Number.NaN;
  }
}
