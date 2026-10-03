import type { Point, WarpGlideSprite } from "./warpGlide";

const TRAIL = [
  { lagMs: 50, alpha: 0.4 },
  { lagMs: 100, alpha: 0.2 },
] as const;
const MAX_LAG_MS = TRAIL[TRAIL.length - 1]!.lagMs;
const MIN_GAP_PX = 1;

type Sample = Point & { ageMs: number };

export type SpeedTrail = readonly Sample[];

export function tickSpeedTrail(trail: SpeedTrail, at: Point, deltaMs: number): SpeedTrail {
  const next: Sample[] = [{ x: at.x, y: at.y, ageMs: 0 }];
  for (const sample of trail) {
    const ageMs = sample.ageMs + Math.max(0, deltaMs);
    next.push({ x: sample.x, y: sample.y, ageMs });
    if (ageMs >= MAX_LAG_MS) {
      break;
    }
  }
  return next;
}

export function speedTrailSprites(trail: SpeedTrail, maxStepPx: number): WarpGlideSprite[] {
  const head = trail[0];
  const sprites: WarpGlideSprite[] = [];
  if (head === undefined) {
    return sprites;
  }
  let i = 1;
  for (const { lagMs, alpha } of TRAIL) {
    while (i < trail.length && trail[i]!.ageMs < lagMs) {
      i += 1;
    }
    const older = trail[i];
    if (older === undefined) {
      break;
    }
    const newer = trail[i - 1]!;
    for (let j = 1; j <= i; j += 1) {
      if (Math.hypot(trail[j]!.x - trail[j - 1]!.x, trail[j]!.y - trail[j - 1]!.y) > maxStepPx) {
        return sprites;
      }
    }
    const span = older.ageMs - newer.ageMs;
    const t = span > 0 ? (lagMs - newer.ageMs) / span : 0;
    const x = newer.x + (older.x - newer.x) * t;
    const y = newer.y + (older.y - newer.y) * t;
    if (Math.hypot(x - head.x, y - head.y) >= MIN_GAP_PX) {
      sprites.push({ x, y, alpha });
    }
  }
  return sprites;
}
