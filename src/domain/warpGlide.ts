export const WARP_GLIDE_MS = 300;

const HEAD_MIN_ALPHA = 0.45;
const TRAIL_COUNT = 3;
const TRAIL_STEP = 0.1;

export type Point = { x: number; y: number };

export type WarpGlide = { from: Point; to: Point; elapsedMs: number };

export type WarpGlideSprite = { x: number; y: number; alpha: number };

export function startWarpGlide(from: Point, to: Point): WarpGlide {
  return { from, to, elapsedMs: 0 };
}

export function tickWarpGlide(glide: WarpGlide, deltaMs: number): WarpGlide | null {
  const elapsedMs = glide.elapsedMs + Math.max(0, deltaMs);
  return elapsedMs >= WARP_GLIDE_MS ? null : { ...glide, elapsedMs };
}

export function warpGlideRemainingMs(glide: WarpGlide | null): number {
  return glide === null ? 0 : WARP_GLIDE_MS - glide.elapsedMs;
}

function pointAt(glide: WarpGlide, t: number): Point {
  const eased = (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t)))) / 2;
  return {
    x: glide.from.x + (glide.to.x - glide.from.x) * eased,
    y: glide.from.y + (glide.to.y - glide.from.y) * eased,
  };
}

export function warpGlideSprites(glide: WarpGlide): WarpGlideSprite[] {
  const t = glide.elapsedMs / WARP_GLIDE_MS;
  const headAlpha = HEAD_MIN_ALPHA + (1 - HEAD_MIN_ALPHA) * t * t * t;
  const sprites: WarpGlideSprite[] = [{ ...pointAt(glide, t), alpha: headAlpha }];
  for (let i = 1; i <= TRAIL_COUNT; i += 1) {
    sprites.push({
      ...pointAt(glide, t - i * TRAIL_STEP),
      alpha: HEAD_MIN_ALPHA * (1 - i / (TRAIL_COUNT + 1)),
    });
  }
  return sprites;
}
