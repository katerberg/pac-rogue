import { query, type World } from "bitecs";
import { clampPositionToPlayfield, PLAYER_SPEED } from "../../domain/playfield";
import { DIRECTION, Input } from "../components/Input";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";

/**
 * Phaser-free simulation:
 * 1. Replace Velocity from Input immediately (turn on a dime — no accel/slide).
 * 2. Integrate Position += Velocity * dt.
 * 3. Clamp the sprite center to the open playfield.
 */
export function movement(world: World, deltaMs: number): void {
  const dt = deltaMs / 1000;

  for (const eid of query(world, [Position, Velocity, Input])) {
    const direction = Input.direction[eid] ?? DIRECTION.none;

    if (direction === DIRECTION.up) {
      Velocity.x[eid] = 0;
      Velocity.y[eid] = -PLAYER_SPEED;
    } else if (direction === DIRECTION.down) {
      Velocity.x[eid] = 0;
      Velocity.y[eid] = PLAYER_SPEED;
    } else if (direction === DIRECTION.left) {
      Velocity.x[eid] = -PLAYER_SPEED;
      Velocity.y[eid] = 0;
    } else if (direction === DIRECTION.right) {
      Velocity.x[eid] = PLAYER_SPEED;
      Velocity.y[eid] = 0;
    } else {
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
    }

    const nextX = (Position.x[eid] ?? 0) + (Velocity.x[eid] ?? 0) * dt;
    const nextY = (Position.y[eid] ?? 0) + (Velocity.y[eid] ?? 0) * dt;
    const clamped = clampPositionToPlayfield(nextX, nextY);
    Position.x[eid] = clamped.x;
    Position.y[eid] = clamped.y;
  }
}
