import { query, type World } from "bitecs";
import {
  TURN_ALIGN_EPS,
  canEnterDirection,
  clampAgainstFacingWall,
  isAlignedForTurn,
  snapPerpendicularToCenterline,
  snapToCellCenter,
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

/**
 * Phaser-free maze movement:
 * 1. Try sticky Input (next) when aligned and the neighbor is open → update Facing.
 * 2. Else keep Facing if that neighbor is open; otherwise stop.
 * 3. Integrate, snap perpendicular to centerline, clamp against the facing wall.
 *
 * Circle-vs-all-solids resolve is intentionally omitted: with radius === TILE/2 in a
 * 1-wide corridor the circle always touches perpendicular walls and push-out fights travel.
 * Centerline snap + facing-wall clamp enforce the maze.
 */
export function movement(world: World, deltaMs: number): void {
  const dt = deltaMs / 1000;
  // Must be ≥ one frame of travel or continuous motion skips the turn window.
  const turnEps = Math.max(TURN_ALIGN_EPS, PLAYER_SPEED * dt + 0.5);

  for (const eid of query(world, [Position, Velocity, Input, Facing])) {
    let x = Position.x[eid] ?? 0;
    let y = Position.y[eid] ?? 0;
    const nextIntent = Input.direction[eid] ?? DIRECTION.none;
    let facing = Facing.direction[eid] ?? DIRECTION.none;

    if (
      nextIntent !== DIRECTION.none &&
      isAlignedForTurn(x, y, turnEps) &&
      canEnterStep(x, y, nextIntent)
    ) {
      // Only snap when actually changing direction — snapping every aligned
      // frame while continuing the same way pulls the player back to center.
      if (facing !== nextIntent) {
        const snapped = snapToCellCenter(x, y);
        x = snapped.x;
        y = snapped.y;
      }
      facing = nextIntent;
    } else if (facing !== DIRECTION.none && !canEnterStep(x, y, facing)) {
      const snapped = snapToCellCenter(x, y);
      x = snapped.x;
      y = snapped.y;
      facing = DIRECTION.none;
    }

    Facing.direction[eid] = facing;

    const step = directionStep(facing);
    Velocity.x[eid] = step.dx * PLAYER_SPEED;
    Velocity.y[eid] = step.dy * PLAYER_SPEED;

    if (facing === DIRECTION.none) {
      Position.x[eid] = x;
      Position.y[eid] = y;
      continue;
    }

    let nextX = x + (Velocity.x[eid] ?? 0) * dt;
    let nextY = y + (Velocity.y[eid] ?? 0) * dt;

    const centered = snapPerpendicularToCenterline(nextX, nextY, step.dx, step.dy);
    nextX = centered.x;
    nextY = centered.y;

    const wallClamped = clampAgainstFacingWall(nextX, nextY, step.dx, step.dy);
    nextX = wallClamped.x;
    nextY = wallClamped.y;

    const playfield = clampPositionToPlayfield(nextX, nextY);
    Position.x[eid] = playfield.x;
    Position.y[eid] = playfield.y;
  }
}

function canEnterStep(x: number, y: number, direction: Direction): boolean {
  const { dx, dy } = directionStep(direction);
  return canEnterDirection(x, y, dx, dy);
}
