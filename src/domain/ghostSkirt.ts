import { GHOST_ART_SIZE_PX } from "./ghostPupils";

const GHOST_SKIRT_WAVES = 2;
const GHOST_SKIRT_EDGE_ART_Y = 15;
const GHOST_SKIRT_AMPLITUDE_ART = 1.5;
export const GHOST_SKIRT_BODY_ART_ROWS =
  GHOST_SKIRT_EDGE_ART_Y - Math.ceil(GHOST_SKIRT_AMPLITUDE_ART);
const GHOST_SKIRT_OVERLAP_ART_Y = GHOST_SKIRT_BODY_ART_ROWS - 0.1;
const GHOST_SKIRT_PHASE_PER_WAVELENGTH = 1;

export const GHOST_SKIRT_SAMPLE_ART = { x: 8, y: GHOST_SKIRT_BODY_ART_ROWS - 1 } as const;

export type SkirtRect = { x: number; y: number; w: number; h: number };

export function advanceGhostSkirtPhase(phase: number, dxPx: number, displaySize: number): number {
  if (Math.abs(dxPx) > displaySize) {
    return phase;
  }
  const wavelength = displaySize / GHOST_SKIRT_WAVES;
  const next = phase + (dxPx / wavelength) * GHOST_SKIRT_PHASE_PER_WAVELENGTH * 2 * Math.PI;
  return ((next % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

export function ghostSkirtRects(
  cx: number,
  cy: number,
  displaySize: number,
  phase: number,
): SkirtRect[] {
  const scale = displaySize / GHOST_ART_SIZE_PX;
  const left = cx - displaySize / 2;
  const top = cy - displaySize / 2;
  const overlapY = top + GHOST_SKIRT_OVERLAP_ART_Y * scale;
  const rects: SkirtRect[] = [];
  for (let col = 0; col < GHOST_ART_SIZE_PX; col++) {
    const t = (col + 0.5) / GHOST_ART_SIZE_PX;
    const wave = Math.round(
      GHOST_SKIRT_AMPLITUDE_ART * Math.sin(t * GHOST_SKIRT_WAVES * 2 * Math.PI + phase),
    );
    const edgeArtY = GHOST_SKIRT_EDGE_ART_Y + wave;
    const edgeY = top + edgeArtY * scale;
    rects.push({
      x: left + col * scale,
      y: overlapY,
      w: scale,
      h: edgeY - overlapY,
    });
  }
  return rects;
}

export function multiplyTint(color: number, tint: number | null): number {
  if (tint === null) {
    return color;
  }
  const channel = (shift: number): number =>
    Math.round((((color >> shift) & 0xff) * ((tint >> shift) & 0xff)) / 255);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
