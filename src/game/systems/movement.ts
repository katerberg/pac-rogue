import { query, type World } from "bitecs";
import {
  TURN_ALIGN_EPS,
  canEnterDirection,
  cellCenterX,
  cellCenterY,
  clampAgainstFacingWall,
  isAlignedForTurn,
  snapPerpendicularToCenterline,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { clampPositionToPlayfield, PLAYER_SPEED } from "../../domain/playfield";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Position } from "../components/Position";
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
    return { x: cx, y: cy, remainingDt: frameTravel / PLAYER_SPEED };
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

  return { x: cx, y: cy, remainingDt: (frameTravel - dist) / PLAYER_SPEED };
}

export function movement(world: World, deltaMs: number): void {
  const dt = deltaMs / 1000;
  const frameTravel = PLAYER_SPEED * dt;

  for (const eid of query(world, [Position, Velocity, Input, Facing])) {
    let x = Position.x[eid] ?? 0;
    let y = Position.y[eid] ?? 0;
    const nextIntent = Input.direction[eid] ?? DIRECTION.none;
    let facing = Facing.direction[eid] ?? DIRECTION.none;
    let moveDt = dt;

    if (nextIntent !== DIRECTION.none && nextIntent !== facing && canEnterStep(x, y, nextIntent)) {
      if (facing === DIRECTION.none) {
        if (isAlignedForTurn(x, y, TURN_ALIGN_EPS)) {
          facing = nextIntent;
        }
      } else if (isReverse(facing, nextIntent)) {
        facing = nextIntent;
      } else {
        const committed = tryCommitCenterTurn(x, y, facing, frameTravel);
        if (committed) {
          x = committed.x;
          y = committed.y;
          facing = nextIntent;
          moveDt = committed.remainingDt;
        }
      }
    }

    const step = directionStep(facing);
    Velocity.x[eid] = step.dx * PLAYER_SPEED;
    Velocity.y[eid] = step.dy * PLAYER_SPEED;

    if (facing === DIRECTION.none) {
      Facing.direction[eid] = facing;
      Position.x[eid] = x;
      Position.y[eid] = y;
      continue;
    }

    let nextX = x + (Velocity.x[eid] ?? 0) * moveDt;
    let nextY = y + (Velocity.y[eid] ?? 0) * moveDt;

    const centered = snapPerpendicularToCenterline(nextX, nextY, step.dx, step.dy);
    nextX = centered.x;
    nextY = centered.y;

    const wallClamped = clampAgainstFacingWall(nextX, nextY, step.dx, step.dy);
    nextX = wallClamped.x;
    nextY = wallClamped.y;

    if (!canEnterStep(nextX, nextY, facing) && isAlignedForTurn(nextX, nextY, TURN_ALIGN_EPS)) {
      facing = DIRECTION.none;
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
    }

    Facing.direction[eid] = facing;

    const playfield = clampPositionToPlayfield(nextX, nextY);
    Position.x[eid] = playfield.x;
    Position.y[eid] = playfield.y;
  }
}

function canEnterStep(x: number, y: number, direction: Direction): boolean {
  const { dx, dy } = directionStep(direction);
  return canEnterDirection(x, y, dx, dy);
}
