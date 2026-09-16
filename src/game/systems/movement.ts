import { hasComponent, query, type World } from "bitecs";
import { lCornerTurnDir, openGhostDirsAt, type GhostDir } from "../../domain/ghostPath";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import {
  MAZE_PLAYER_SOLIDS,
  TURN_ALIGN_EPS,
  canEnterDirection,
  canGhostEnterDirection,
  cellCenterX,
  cellCenterY,
  clampAgainstFacingWall,
  ghostSolidsForPhase,
  isAlignedForTurn,
  snapPerpendicularToCenterline,
  worldToCol,
  worldToRow,
  wrapPosition,
  type SolidGrid,
} from "../../domain/maze";
import { clampPositionToPlayfield } from "../../domain/playfield";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";

type Step = { dx: number; dy: number };

function directionStep(direction: Direction): Step {
  switch (direction) {
    case DIRECTION.up:
      return { dx: 0, dy: -1 };
    case DIRECTION.down:
      return { dx: 0, dy: 1 };
    case DIRECTION.left:
      return { dx: -1, dy: 0 };
    case DIRECTION.right:
      return { dx: 1, dy: 0 };
    default:
      return { dx: 0, dy: 0 };
  }
}

function isReverse(a: Direction, b: Direction): boolean {
  return (
    (a === DIRECTION.up && b === DIRECTION.down) ||
    (a === DIRECTION.down && b === DIRECTION.up) ||
    (a === DIRECTION.left && b === DIRECTION.right) ||
    (a === DIRECTION.right && b === DIRECTION.left)
  );
}

function tryCommitCenterTurn(
  x: number,
  y: number,
  facing: Direction,
  frameTravel: number,
  speed: number,
): { x: number; y: number; remainingDt: number } | null {
  const col = worldToCol(x);
  const row = worldToRow(y);
  const cx = cellCenterX(col);
  const cy = cellCenterY(row);
  const step = directionStep(facing);

  if (step.dx !== 0 && Math.abs(y - cy) > TURN_ALIGN_EPS) {
    return null;
  }
  if (step.dy !== 0 && Math.abs(x - cx) > TURN_ALIGN_EPS) {
    return null;
  }

  if (Math.abs(x - cx) <= TURN_ALIGN_EPS && Math.abs(y - cy) <= TURN_ALIGN_EPS) {
    return { x: cx, y: cy, remainingDt: speed > 0 ? frameTravel / speed : 0 };
  }

  let dist = -1;
  if (step.dx > 0 && x < cx && x + frameTravel >= cx) {
    dist = cx - x;
  } else if (step.dx < 0 && x > cx && x - frameTravel <= cx) {
    dist = x - cx;
  } else if (step.dy > 0 && y < cy && y + frameTravel >= cy) {
    dist = cy - y;
  } else if (step.dy < 0 && y > cy && y - frameTravel <= cy) {
    dist = y - cy;
  }

  if (dist < 0) {
    return null;
  }

  return { x: cx, y: cy, remainingDt: speed > 0 ? (frameTravel - dist) / speed : 0 };
}

function ghostPhaseOf(world: World, eid: number): number {
  if (!hasComponent(world, eid, GhostPhase)) {
    return GHOST_PHASE.active;
  }
  return GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
}

function solidsFor(world: World, eid: number): SolidGrid {
  if (!hasComponent(world, eid, Ghost)) {
    return MAZE_PLAYER_SOLIDS;
  }
  return ghostSolidsForPhase(ghostPhaseOf(world, eid));
}

function canEnterStep(
  world: World,
  eid: number,
  x: number,
  y: number,
  direction: Direction,
  solids: SolidGrid,
): boolean {
  const { dx, dy } = directionStep(direction);
  if (hasComponent(world, eid, Ghost)) {
    return canGhostEnterDirection(x, y, dx, dy, ghostPhaseOf(world, eid));
  }
  return canEnterDirection(x, y, dx, dy, solids);
}

export function movement(world: World, deltaMs: number): void {
  const dt = deltaMs / 1000;

  for (const eid of query(world, [Position, Velocity, Input, Facing, Speed])) {
    const speed = Speed.px[eid] ?? 0;
    const solids = solidsFor(world, eid);
    const frameTravel = speed * dt;

    let x = Position.x[eid] ?? 0;
    let y = Position.y[eid] ?? 0;
    let nextIntent = Input.direction[eid] ?? DIRECTION.none;
    let facing = Facing.direction[eid] ?? DIRECTION.none;
    let moveDt = dt;

    if (
      speed > 0 &&
      nextIntent !== DIRECTION.none &&
      nextIntent !== facing &&
      canEnterStep(world, eid, x, y, nextIntent, solids)
    ) {
      if (facing === DIRECTION.none) {
        if (isAlignedForTurn(x, y, TURN_ALIGN_EPS)) {
          facing = nextIntent;
        }
      } else if (isReverse(facing, nextIntent)) {
        if (hasComponent(world, eid, Ghost)) {
          const phase = ghostPhaseOf(world, eid);
          const opens = openGhostDirsAt(x, y, solids, (px, py, dx, dy) =>
            canGhostEnterDirection(px, py, dx, dy, phase),
          );
          const turn = lCornerTurnDir(opens, facing as GhostDir) as Direction;
          if (turn !== DIRECTION.none && canEnterStep(world, eid, x, y, turn, solids)) {
            nextIntent = turn;
            Input.direction[eid] = turn;
            facing = turn;
          } else {
            facing = nextIntent;
          }
        } else {
          facing = nextIntent;
        }
      } else {
        const committed = tryCommitCenterTurn(x, y, facing, frameTravel, speed);
        if (committed) {
          x = committed.x;
          y = committed.y;
          facing = nextIntent;
          moveDt = committed.remainingDt;
        }
      }
    }

    const step = directionStep(facing);
    Velocity.x[eid] = step.dx * speed;
    Velocity.y[eid] = step.dy * speed;

    if (facing === DIRECTION.none || speed <= 0) {
      Facing.direction[eid] = facing;
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      Position.x[eid] = x;
      Position.y[eid] = y;
      continue;
    }

    let nextX = x + (Velocity.x[eid] ?? 0) * moveDt;
    let nextY = y + (Velocity.y[eid] ?? 0) * moveDt;

    const centered = snapPerpendicularToCenterline(nextX, nextY, step.dx, step.dy);
    nextX = centered.x;
    nextY = centered.y;

    const wrapped = wrapPosition(nextX, nextY, solids);
    nextX = wrapped.x;
    nextY = wrapped.y;

    const wallClamped = clampAgainstFacingWall(nextX, nextY, step.dx, step.dy, solids);
    nextX = wallClamped.x;
    nextY = wallClamped.y;

    if (
      !canEnterStep(world, eid, nextX, nextY, facing, solids) &&
      isAlignedForTurn(nextX, nextY, TURN_ALIGN_EPS)
    ) {
      if (!hasComponent(world, eid, Ghost)) {
        facing = DIRECTION.none;
      }
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
    }

    Facing.direction[eid] = facing;

    const playfield = clampPositionToPlayfield(nextX, nextY);
    Position.x[eid] = playfield.x;
    Position.y[eid] = playfield.y;
  }
}
