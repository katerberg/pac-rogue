import type { GhostStyle } from "./ghostArt";
import { pelletStyleFor } from "./pelletStyle";
import { BOSS_PELLET_DRAWABLE_ID, PELLET_DRAWABLE_ID, POWER_PELLET_DRAWABLE_ID } from "./playfield";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

/** Defaults match `DEFAULT_TUNING` absorb knobs. */
export const PELLET_ABSORB_MS = DEFAULT_TUNING.pelletAbsorbMs;
export const PELLET_ABSORB_STRETCH_END = DEFAULT_TUNING.pelletAbsorbStretchEnd;

export type PelletAbsorbPoint = { x: number; y: number };

export type PelletAbsorbEnd = PelletAbsorbPoint & { r: number };

export type PelletAbsorbLook = {
  near: PelletAbsorbEnd;
  far: PelletAbsorbEnd;
  midWidth: number;
  /** End-cap alpha (stretch holds 1; suck fades out). */
  alpha: number;
  /** Mid-strand fill alpha; fades 1 → 0 over the whole absorb. */
  midAlpha: number;
};

export type PelletAbsorbSpawn = {
  x: number;
  y: number;
  color: number;
  radius: number;
};

export type PelletAbsorbLookTuning = {
  stretchEnd: number;
  midThin: number;
  nearShrink: number;
  farShrink: number;
  suckEase: number;
};

export const DEFAULT_PELLET_ABSORB_LOOK: PelletAbsorbLookTuning = {
  stretchEnd: DEFAULT_TUNING.pelletAbsorbStretchEnd,
  midThin: DEFAULT_TUNING.pelletAbsorbMidThin,
  nearShrink: DEFAULT_TUNING.pelletAbsorbNearShrink,
  farShrink: DEFAULT_TUNING.pelletAbsorbFarShrink,
  suckEase: DEFAULT_TUNING.pelletAbsorbSuckEase,
};

export function pelletAbsorbLookTuning(tuning: Tuning): PelletAbsorbLookTuning {
  return {
    stretchEnd: tuning.pelletAbsorbStretchEnd,
    midThin: tuning.pelletAbsorbMidThin,
    nearShrink: tuning.pelletAbsorbNearShrink,
    farShrink: tuning.pelletAbsorbFarShrink,
    suckEase: tuning.pelletAbsorbSuckEase,
  };
}

export function pelletAbsorbStyleOk(style: GhostStyle): boolean {
  return style !== "pixel";
}

export function pelletAbsorbKindOk(drawableId: string, _optional: boolean): boolean {
  if (drawableId === POWER_PELLET_DRAWABLE_ID || drawableId === BOSS_PELLET_DRAWABLE_ID) {
    return false;
  }
  return drawableId === PELLET_DRAWABLE_ID;
}

export function pelletAbsorbActive(tuning: Tuning): boolean {
  return tuning.pelletAbsorbEnabled && tuning.pelletAbsorbMs > 0;
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function easeInPow(u: number, power: number): number {
  const p = Math.max(1, power);
  return u ** p;
}

export function pelletAbsorbSpawnFor(
  style: GhostStyle,
  drawableId: string,
  optional: boolean,
  x: number,
  y: number,
): PelletAbsorbSpawn | null {
  if (!pelletAbsorbStyleOk(style) || !pelletAbsorbKindOk(drawableId, optional)) {
    return null;
  }
  const lookStyle = pelletStyleFor(null, 0, style);
  if (lookStyle === null) {
    return null;
  }
  const look = optional ? lookStyle.optional : lookStyle.regular;
  return { x, y, color: look.fillColor, radius: look.radius };
}

/**
 * Gum-stretch look for a pellet being sucked into Dot-Man.
 * `to` is Dot-Man's current world center (caller refreshes each frame to chase).
 */
export function pelletAbsorbLook(
  t: number,
  from: PelletAbsorbPoint,
  to: PelletAbsorbPoint,
  startRadius: number,
  look: PelletAbsorbLookTuning = DEFAULT_PELLET_ABSORB_LOOK,
): PelletAbsorbLook {
  const p = clamp01(t);
  const r0 = Math.max(0.1, startRadius);
  const stretchEnd = Math.min(0.95, Math.max(0.05, look.stretchEnd));
  const midThin = clamp01(look.midThin);
  const nearShrink = clamp01(look.nearShrink);
  const farShrink = clamp01(look.farShrink);

  const midAlpha = 1 - p;

  if (p <= stretchEnd) {
    const s = p / stretchEnd;
    return {
      near: { x: to.x, y: to.y, r: r0 * (1 - nearShrink * s) },
      far: { x: from.x, y: from.y, r: r0 * (1 - farShrink * s) },
      midWidth: r0 * (1 - midThin * s),
      alpha: 1,
      midAlpha,
    };
  }

  const u = easeInPow((p - stretchEnd) / (1 - stretchEnd), look.suckEase);
  const nearStart = r0 * (1 - nearShrink);
  const farStart = r0 * (1 - farShrink);
  const midStart = r0 * (1 - midThin);
  return {
    near: { x: to.x, y: to.y, r: Math.max(0, nearStart * (1 - u)) },
    far: {
      x: from.x + (to.x - from.x) * u,
      y: from.y + (to.y - from.y) * u,
      r: Math.max(0, farStart * (1 - u)),
    },
    midWidth: Math.max(0, midStart * (1 - u)),
    alpha: 1 - u,
    midAlpha,
  };
}
