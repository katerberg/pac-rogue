import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";

export const MAX_RENDER_SCALE = 4;

// Canvas pixels per world pixel so the fitted canvas maps 1:1 onto device pixels.
export function renderScaleFor(
  viewWidth: number,
  viewHeight: number,
  devicePixelRatio: number,
): number {
  const fit = Math.min(viewWidth / PLAYFIELD_WIDTH, viewHeight / PLAYFIELD_HEIGHT);
  const scale = fit * devicePixelRatio;
  return Number.isFinite(scale) ? Math.min(MAX_RENDER_SCALE, Math.max(1, scale)) : 1;
}

export function canvasSizeFor(scale: number): { width: number; height: number } {
  return {
    width: Math.round(PLAYFIELD_WIDTH * scale),
    height: Math.round(PLAYFIELD_HEIGHT * scale),
  };
}
