import { PLAYER_SPEED } from "./playfield";
import { speedLevelMultiplier } from "./tuning";

export const POWER_PELLET_BREAK_MS = 200;
/** Base travel at intensity 1 (mid ramp); scaled by `powerPelletBreakIntensity`. */
export const POWER_PELLET_BREAK_SPLIT_PX = 10;
export const POWER_PELLET_BREAK_FORWARD_PX = 12;
/** Soft settle for horizontal travel only — never when moving vertically (reads as "behind"). */
export const POWER_PELLET_BREAK_FALL_PX = 6;
export const POWER_PELLET_BREAK_SPIN_RAD = 0.55;
export const POWER_PELLET_BREAK_REAR_BACK_FRAC = 0.06;
export const POWER_PELLET_BREAK_COLOR = 0xffffff;
/** Fragment edge length as a fraction of the power-pellet display size. */
export const POWER_PELLET_BREAK_FRAGMENT_FRAC = 0.28;
/** Assembled chip offset from pellet center (fraction of display size). */
export const POWER_PELLET_BREAK_REST_FRAC = 0.12;
/** Level-1 / sink-crack travel scale. */
export const POWER_PELLET_BREAK_INTENSITY_SOFT = 0.55;
/** Level-7 / wall-hit travel scale. */
export const POWER_PELLET_BREAK_INTENSITY_HARD = 1.4;

export type PowerPelletBreakFacing = { dx: number; dy: number };

export type PowerPelletQuarterId = "nw" | "ne" | "sw" | "se";

export type PowerPelletQuarterLook = {
  id: PowerPelletQuarterId;
  /** Travel from the assembled quarter center (not including rest offset). */
  offsetX: number;
  offsetY: number;
  rotation: number;
  alpha: number;
};

const QUARTERS: readonly {
  id: PowerPelletQuarterId;
  bx: number;
  by: number;
  spin: number;
}[] = [
  { id: "nw", bx: -1, by: -1, spin: -1 },
  { id: "ne", bx: 1, by: -1, spin: 1 },
  { id: "sw", bx: -1, by: 1, spin: -1 },
  { id: "se", bx: 1, by: 1, spin: 1 },
];

export function powerPelletBreakProgress(elapsedMs: number): number {
  return Math.min(1, Math.max(0, elapsedMs / POWER_PELLET_BREAK_MS));
}

/**
 * Maps current player speed onto soft (level-1 baseline) … hard (level-7 baseline).
 * Movement distances scale with this; fragment size does not.
 */
export function powerPelletBreakIntensity(
  speedPx: number,
  baseSpeedPx: number = PLAYER_SPEED,
): number {
  const softSpeed = baseSpeedPx * speedLevelMultiplier(1);
  const hardSpeed = baseSpeedPx * speedLevelMultiplier(7);
  const span = Math.max(1e-6, hardSpeed - softSpeed);
  const t = Math.min(1, Math.max(0, (speedPx - softSpeed) / span));
  return (
    POWER_PELLET_BREAK_INTENSITY_SOFT +
    t * (POWER_PELLET_BREAK_INTENSITY_HARD - POWER_PELLET_BREAK_INTENSITY_SOFT)
  );
}

export function powerPelletBreakLook(
  progress: number,
  facing: PowerPelletBreakFacing,
  intensity: number = 1,
): PowerPelletQuarterLook[] {
  const t = Math.min(1, Math.max(0, progress));
  const scale = Math.max(0, intensity);
  const split = POWER_PELLET_BREAK_SPLIT_PX * scale * (1 - (1 - t) ** 2);
  const fall = POWER_PELLET_BREAK_FALL_PX * scale * t * t;
  const forwardPush = POWER_PELLET_BREAK_FORWARD_PX * scale * (1 - (1 - t) ** 2);
  const hasFacing = facing.dx !== 0 || facing.dy !== 0;
  const verticalTravel = hasFacing && facing.dy !== 0;

  return QUARTERS.map((q) => {
    const rotation = q.spin * POWER_PELLET_BREAK_SPIN_RAD * t;
    const alpha = 1 - t;
    if (!hasFacing) {
      return {
        id: q.id,
        offsetX: q.bx * split,
        offsetY: q.by * split + fall * 0.5,
        rotation,
        alpha,
      };
    }

    const diagX = q.bx * split;
    const diagY = q.by * split;
    const along = diagX * facing.dx + diagY * facing.dy;
    const projX = along * facing.dx;
    const projY = along * facing.dy;
    const latX = diagX - projX;
    const latY = diagY - projY;
    // Screen-down settle only on horizontal runs; vertical runs must not shove rear chips "behind".
    const settle = verticalTravel ? 0 : fall;

    if (along >= 0) {
      return {
        id: q.id,
        offsetX: latX + projX + facing.dx * forwardPush,
        offsetY: latY + projY + facing.dy * forwardPush + settle * 0.2,
        rotation,
        alpha,
      };
    }

    return {
      id: q.id,
      offsetX: latX * 0.45 + projX * POWER_PELLET_BREAK_REAR_BACK_FRAC,
      offsetY: latY * 0.45 + projY * POWER_PELLET_BREAK_REAR_BACK_FRAC + settle * 0.55,
      rotation,
      alpha,
    };
  });
}

export function powerPelletQuarterRestOffset(
  id: PowerPelletQuarterId,
  pelletDisplaySize: number,
): { x: number; y: number } {
  const inset = pelletDisplaySize * POWER_PELLET_BREAK_REST_FRAC;
  const q = QUARTERS.find((entry) => entry.id === id)!;
  return { x: q.bx * inset, y: q.by * inset };
}

export function powerPelletBreakFragmentSize(pelletDisplaySize: number): number {
  return pelletDisplaySize * POWER_PELLET_BREAK_FRAGMENT_FRAC;
}
