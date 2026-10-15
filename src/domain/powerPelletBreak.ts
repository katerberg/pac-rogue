import { PLAYER_SPEED } from "./playfield";
import { DEFAULT_TUNING, speedLevelMultiplier, type Tuning } from "./tuning";

export const POWER_PELLET_BREAK_MS = 200;
export const POWER_PELLET_BREAK_SPLIT_PX = 10;
/** Extra fling for chips on the trail side (opposite travel) — shatter stays behind Dot-Man. */
export const POWER_PELLET_BREAK_BEHIND_PX = 12;
export const POWER_PELLET_BREAK_FALL_PX = 6;
export const POWER_PELLET_BREAK_SPIN_RAD = 0.55;
/** Ahead-side chips keep this fraction of along-facing travel so they don't leap in front. */
export const POWER_PELLET_BREAK_AHEAD_FRAC = 0.06;
export const POWER_PELLET_BREAK_COLOR = 0xffffff;
export const POWER_PELLET_BREAK_FRAGMENT_FRAC = 0.36;
export const POWER_PELLET_BREAK_REST_FRAC = 0.14;
export const POWER_PELLET_BREAK_INTENSITY_SOFT = 0.55;
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

export function powerPelletBreakIntensity(
  speedPx: number,
  baseSpeedPx: number = PLAYER_SPEED,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  const softSpeed = baseSpeedPx * speedLevelMultiplier(1, tuning);
  const hardSpeed = baseSpeedPx * speedLevelMultiplier(7, tuning);
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
  const behindPush = POWER_PELLET_BREAK_BEHIND_PX * scale * (1 - (1 - t) ** 2);
  const hasFacing = facing.dx !== 0 || facing.dy !== 0;

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

    if (along < 0) {
      // Trail side: fling further behind Dot-Man (opposite facing).
      return {
        id: q.id,
        offsetX: latX + projX - facing.dx * behindPush,
        offsetY: latY + projY - facing.dy * behindPush + fall * 0.25,
        rotation,
        alpha,
      };
    }

    // Ahead side: soft lateral settle — do not leap out in front of him.
    return {
      id: q.id,
      offsetX: latX * 0.45 + projX * POWER_PELLET_BREAK_AHEAD_FRAC,
      offsetY: latY * 0.45 + projY * POWER_PELLET_BREAK_AHEAD_FRAC + fall * 0.55,
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
