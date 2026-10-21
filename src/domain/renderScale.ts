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

const FLOOR_EPSILON = 1e-6;

export function canvasSizeFor(scale: number): { width: number; height: number } {
  return {
    width: Math.floor(PLAYFIELD_WIDTH * scale + FLOOR_EPSILON),
    height: Math.floor(PLAYFIELD_HEIGHT * scale + FLOOR_EPSILON),
  };
}

export function canvasDisplayZoom(
  canvas: { width: number; height: number },
  viewWidth: number,
  viewHeight: number,
  devicePixelRatio: number,
): number {
  const fit = Math.min(viewWidth / canvas.width, viewHeight / canvas.height);
  const zoom = Math.min(1 / devicePixelRatio, fit);
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}
