/** Discrete movement intent. Keyboard writes this; only movement reads it into Velocity. */
export const DIRECTION = {
  none: 0,
  up: 1,
  down: 2,
  left: 3,
  right: 4,
} as const;

export type Direction = (typeof DIRECTION)[keyof typeof DIRECTION];

export const Input = {
  direction: [] as Direction[],
};
