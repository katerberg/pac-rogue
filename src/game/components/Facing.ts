import { DIRECTION, type Direction } from "./Input";

/**
 * Current travel direction. Written only by movement; Input.direction is sticky next intent.
 */
export const Facing = {
  direction: [] as Direction[],
};

export const FACING_NONE = DIRECTION.none;
