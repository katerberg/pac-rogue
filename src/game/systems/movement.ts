import { hasComponent, query, type World } from "bitecs";
import { type GhostDir } from "../../domain/ghostPath";
import { ghostMovementRules } from "../../domain/ghostMovement";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import {
  TURN_ALIGN_EPS,
  canEnterDirection,
  cellCenterX,
  cellCenterY,
  clampAgainstFacingWall,
  getActiveLayout,
  isAlignedForTurn,
  snapPerpendicularToCenterline,
  worldToCol,
  worldToRow,
  wrapPosition,
  type SolidGrid,
} from "../../domain/maze";
import { clampPositionToPlayfield, playerPreTurnPx } from "../../domain/playfield";
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
    case DIRECTION.upLeft:
      return { dx: -1, dy: -1 };
    case DIRECTION.upRight:
      return { dx: 1, dy: -1 };
    case DIRECTION.downLeft:
      return { dx: -1, dy: 1 };
    case DIRECTION.downRight:
      return { dx: 1, dy: 1 };
    default:
      return { dx: 0, dy: 0 };
  }
}

function isDiagonalDirection(direction: Direction): boolean {
  return (
    direction === DIRECTION.upLeft ||
    direction === DIRECTION.upRight ||
    direction === DIRECTION.downLeft ||
    direction === DIRECTION.downRight
  );
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
  preTurnPx: number,
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

  const alongDist = step.dx !== 0 ? Math.abs(x - cx) : Math.abs(y - cy);
  if (alongDist <= preTurnPx) {
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

export function movement(
  world: World,
  deltaMs: number,
  playerSolidsOverride?: SolidGrid,
  playerStopOnRelease = false,
): void {
  const dt = deltaMs / 1000;
  const playerSolids = playerSolidsOverride ?? getActiveLayout().playerSolids;

  for (const eid of query(world, [Position, Velocity, Input, Facing, Speed])) {
    const speed = Speed.px[eid] ?? 0;
    const ghost = hasComponent(world, eid, Ghost)
      ? ghostMovementRules(ghostPhaseOf(world, eid))
      : null;
    const solids: SolidGrid = ghost?.solids ?? playerSolids;
    const frameTravel = speed * dt;

    let x = Position.x[eid] ?? 0;
    let y = Position.y[eid] ?? 0;
    let nextIntent = Input.direction[eid] ?? DIRECTION.none;
    let facing = Facing.direction[eid] ?? DIRECTION.none;
    let moveDt = dt;

    const canEnterStep = (px: number, py: number, direction: Direction): boolean => {
      const { dx, dy } = directionStep(direction);
      if (ghost) {
        return ghost.canEnter(px, py, dx, dy);
      }
      return canEnterDirection(px, py, dx, dy, solids);
    };

    if (speed > 0 && (isDiagonalDirection(facing) || isDiagonalDirection(nextIntent))) {
      const desired = nextIntent !== DIRECTION.none ? nextIntent : facing;
      const step = directionStep(desired);
      const norm = Math.hypot(step.dx, step.dy) || 1;
      const vx = (step.dx / norm) * speed;
      const vy = (step.dy / norm) * speed;

      const xOpen = step.dx !== 0 && canEnterDirection(x, y, step.dx, 0, solids);
      const yOpen = step.dy !== 0 && canEnterDirection(x, y, 0, step.dy, solids);
      const cornerOpen =
        step.dx === 0 || step.dy === 0 || canEnterDirection(x, y, step.dx, step.dy, solids);
      // Both flanks are open but the diagonal cell itself is a wall (the common L-turn
      // shape): cutting through that corner is not allowed, so this frame only advances
      // the horizontal component (matching the horizontal sprite-facing priority) instead
      // of stopping outright — a real wall-slide (one flank genuinely blocked) is unaffected.
      const wouldCutCorner = step.dx !== 0 && step.dy !== 0 && xOpen && yOpen && !cornerOpen;

      let nextX = x;
      let nextY = y;
      let movedX = desired === DIRECTION.none || step.dx === 0;
      let movedY = desired === DIRECTION.none || step.dy === 0;
      if (step.dx !== 0) {
        if (xOpen) {
          nextX = x + vx * dt;
          movedX = true;
        } else {
          nextX = clampAgainstFacingWall(x, y, step.dx, 0, solids).x;
        }
      }
      if (step.dy !== 0 && !wouldCutCorner) {
        if (yOpen) {
          nextY = y + vy * dt;
          movedY = true;
        } else {
          nextY = clampAgainstFacingWall(x, y, 0, step.dy, solids).y;
        }
      }

      if (desired === DIRECTION.none || (!movedX && !movedY)) {
        Facing.direction[eid] = DIRECTION.none;
        Velocity.x[eid] = 0;
        Velocity.y[eid] = 0;
        Position.x[eid] = x;
        Position.y[eid] = y;
        continue;
      }

      Facing.direction[eid] = desired;
      Velocity.x[eid] = vx;
      Velocity.y[eid] = vy;

      const wrapped = wrapPosition(nextX, nextY, solids);
      const playfield = clampPositionToPlayfield(wrapped.x, wrapped.y);
      Position.x[eid] = playfield.x;
      Position.y[eid] = playfield.y;
      continue;
    }

    if (
      speed > 0 &&
      nextIntent !== DIRECTION.none &&
      nextIntent !== facing &&
      canEnterStep(x, y, nextIntent)
    ) {
      if (facing === DIRECTION.none) {
        if (isAlignedForTurn(x, y, TURN_ALIGN_EPS)) {
          facing = nextIntent;
        }
      } else if (isReverse(facing, nextIntent)) {
        if (ghost) {
          const resolved = ghost.resolveReverse(x, y, facing as GhostDir, nextIntent as GhostDir);
          facing = resolved.facing as Direction;
          nextIntent = resolved.intent as Direction;
          Input.direction[eid] = nextIntent;
        } else {
          facing = nextIntent;
        }
      } else {
        const preTurnPx = ghost ? TURN_ALIGN_EPS : playerPreTurnPx();
        const committed = tryCommitCenterTurn(x, y, facing, frameTravel, speed, preTurnPx);
        if (committed) {
          x = committed.x;
          y = committed.y;
          facing = nextIntent;
          moveDt = committed.remainingDt;
        }
      }
    }

    if (
      !ghost &&
      playerStopOnRelease &&
      nextIntent === DIRECTION.none &&
      facing !== DIRECTION.none
    ) {
      const stop = tryCommitCenterTurn(x, y, facing, frameTravel, speed, 0);
      if (stop) {
        x = stop.x;
        y = stop.y;
        facing = DIRECTION.none;
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

    if (!canEnterStep(nextX, nextY, facing) && isAlignedForTurn(nextX, nextY, TURN_ALIGN_EPS)) {
      if (!ghost) {
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
