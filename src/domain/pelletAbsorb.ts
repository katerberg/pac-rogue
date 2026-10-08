import type { GhostStyle } from "./ghostArt";
import { pelletStyleFor } from "./pelletStyle";
import { BOSS_PELLET_DRAWABLE_ID, PELLET_DRAWABLE_ID, POWER_PELLET_DRAWABLE_ID } from "./playfield";

export const PELLET_ABSORB_MS = 100;
export const PELLET_ABSORB_STRETCH_END = 0.55;

export type PelletAbsorbPoint = { x: number; y: number };

export type PelletAbsorbEnd = PelletAbsorbPoint & { r: number };

export type PelletAbsorbLook = {
  near: PelletAbsorbEnd;
  far: PelletAbsorbEnd;
  midWidth: number;
  alpha: number;
};

export function pelletAbsorbStyleOk(style: GhostStyle): boolean {
  return style !== "pixel";
}

/** Regular and optional share `pellet`; power/boss never absorb. */
export function pelletAbsorbKindOk(drawableId: string, _optional: boolean): boolean {
  if (drawableId === POWER_PELLET_DRAWABLE_ID || drawableId === BOSS_PELLET_DRAWABLE_ID) {
    return false;
  }
  return drawableId === PELLET_DRAWABLE_ID;
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function easeInQuad(u: number): number {
  return u * u;
}

/**
 * Gum-stretch look for a pellet being sucked into Dot-Man.
 * `to` is Dot-Man's current world center (caller refreshes each frame to chase).
 */
export type PelletAbsorbSpawn = {
  x: number;
  y: number;
  color: number;
  radius: number;
};

/** Presentation payload when a Dot-Man collect should show the absorb FX; else null. */
export function pelletAbsorbSpawnFor(
  style: GhostStyle,
  drawableId: string,
  optional: boolean,
  x: number,
  y: number,
  mazeColorIndex = 0,
): PelletAbsorbSpawn | null {
  if (!pelletAbsorbStyleOk(style) || !pelletAbsorbKindOk(drawableId, optional)) {
    return null;
  }
  const lookStyle = pelletStyleFor(null, mazeColorIndex, style);
  if (lookStyle === null) {
    return null;
  }
  const look = optional ? lookStyle.optional : lookStyle.regular;
  return { x, y, color: look.fillColor, radius: look.radius };
}

export function pelletAbsorbLook(
  t: number,
  from: PelletAbsorbPoint,
  to: PelletAbsorbPoint,
  startRadius: number,
): PelletAbsorbLook {
  const p = clamp01(t);
  const r0 = Math.max(0.1, startRadius);

  if (p <= PELLET_ABSORB_STRETCH_END) {
    const s = p / PELLET_ABSORB_STRETCH_END;
    return {
      near: { x: to.x, y: to.y, r: r0 * (1 - 0.35 * s) },
      far: { x: from.x, y: from.y, r: r0 * (1 - 0.15 * s) },
      midWidth: r0 * (1 - 0.75 * s),
      alpha: 1,
    };
  }

  const u = easeInQuad((p - PELLET_ABSORB_STRETCH_END) / (1 - PELLET_ABSORB_STRETCH_END));
  return {
    near: { x: to.x, y: to.y, r: Math.max(0, r0 * 0.65 * (1 - u)) },
    far: {
      x: from.x + (to.x - from.x) * u,
      y: from.y + (to.y - from.y) * u,
      r: Math.max(0, r0 * 0.85 * (1 - u)),
    },
    midWidth: Math.max(0, r0 * 0.25 * (1 - u)),
    alpha: 1 - u,
  };
}
