/** Clamp a number into [min, max]. Pure domain helper — no Phaser. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError("clamp: min must be <= max");
  }
  return Math.min(max, Math.max(min, value));
}
