export const POWER_PELLET_BREAK_MS = 300;
export const POWER_PELLET_BREAK_SPLIT_PX = 14;
export const POWER_PELLET_BREAK_FORWARD_PX = 18;
export const POWER_PELLET_BREAK_FALL_PX = 22;
export const POWER_PELLET_BREAK_SPIN_RAD = 0.7;
/** Rear quarters keep this fraction of their backward (along-facing) travel. */
export const POWER_PELLET_BREAK_REAR_BACK_FRAC = 0.08;
/** Matches the on-board power pellet fill (see `power-pellet.png` center). */
export const POWER_PELLET_BREAK_COLOR = 0xffffff;

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
 * Quarter travel for a break-through shatter. Forward-side pieces fling along
 * `facing` and outward; rear-side pieces drop mostly down instead of flying back.
 * `facing` of `{0,0}` uses a plain four-diagonal split.
 */
export function powerPelletBreakLook(
  progress: number,
  facing: PowerPelletBreakFacing,
): PowerPelletQuarterLook[] {
  const t = Math.min(1, Math.max(0, progress));
  const split = POWER_PELLET_BREAK_SPLIT_PX * (1 - (1 - t) ** 2);
  const fall = POWER_PELLET_BREAK_FALL_PX * t * t;
  const forwardPush = POWER_PELLET_BREAK_FORWARD_PX * (1 - (1 - t) ** 2);
  const hasFacing = facing.dx !== 0 || facing.dy !== 0;

  return QUARTERS.map((q) => {
    const rotation = q.spin * POWER_PELLET_BREAK_SPIN_RAD * t;
    const alpha = 1 - t;
    if (!hasFacing) {
      return {
        id: q.id,
        offsetX: q.bx * split,
        offsetY: q.by * split + fall,
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

    if (along >= 0) {
      return {
        id: q.id,
        offsetX: latX + projX + facing.dx * forwardPush,
        offsetY: latY + projY + facing.dy * forwardPush + fall * 0.4,
        rotation,
        alpha,
      };
    }

    return {
      id: q.id,
      offsetX: latX * 0.5 + projX * POWER_PELLET_BREAK_REAR_BACK_FRAC,
      offsetY: latY * 0.5 + projY * POWER_PELLET_BREAK_REAR_BACK_FRAC + fall,
      rotation,
      alpha,
    };
  });
}

/** Assembled quarter center relative to the pellet center for a given display size. */
export function powerPelletQuarterRestOffset(
  id: PowerPelletQuarterId,
  pelletDisplaySize: number,
): { x: number; y: number } {
  const inset = pelletDisplaySize / 4;
  const q = QUARTERS.find((entry) => entry.id === id)!;
  return { x: q.bx * inset, y: q.by * inset };
}
