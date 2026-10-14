import { GHOST_ART_SIZE_PX } from "./ghostPupils";

export const GHOST_SKIRT_BODY_ART_ROWS = 14;
const GHOST_SKIRT_WAVES = 3;
const GHOST_SKIRT_EDGE_ART_Y = 15;
const GHOST_SKIRT_AMPLITUDE_ART = 1;
const GHOST_SKIRT_OVERLAP_ART_Y = GHOST_SKIRT_BODY_ART_ROWS - 0.1;
const GHOST_SKIRT_SEGMENTS = 24;
const GHOST_SKIRT_PHASE_PER_WAVELENGTH = 2;

export const GHOST_SKIRT_SAMPLE_ART = { x: 8, y: GHOST_SKIRT_BODY_ART_ROWS - 1 } as const;

export type SkirtPoint = { x: number; y: number };

export function advanceGhostSkirtPhase(phase: number, dxPx: number, displaySize: number): number {
  if (Math.abs(dxPx) > displaySize) {
    return phase;
  }
  const wavelength = displaySize / GHOST_SKIRT_WAVES;
  const next = phase + (dxPx / wavelength) * GHOST_SKIRT_PHASE_PER_WAVELENGTH * 2 * Math.PI;
  return ((next % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

export function ghostSkirtPoints(
  cx: number,
  cy: number,
  displaySize: number,
  phase: number,
): SkirtPoint[] {
  const scale = displaySize / GHOST_ART_SIZE_PX;
  const left = cx - displaySize / 2;
  const top = cy - displaySize / 2;
  const points: SkirtPoint[] = [
    { x: left, y: top + GHOST_SKIRT_OVERLAP_ART_Y * scale },
    { x: left + displaySize, y: top + GHOST_SKIRT_OVERLAP_ART_Y * scale },
  ];
  for (let i = GHOST_SKIRT_SEGMENTS; i >= 0; i--) {
    const t = i / GHOST_SKIRT_SEGMENTS;
    const edgeArtY =
      GHOST_SKIRT_EDGE_ART_Y +
      GHOST_SKIRT_AMPLITUDE_ART * Math.sin(t * GHOST_SKIRT_WAVES * 2 * Math.PI + phase);
    points.push({ x: left + t * displaySize, y: top + edgeArtY * scale });
  }
  return points;
}

export function multiplyTint(color: number, tint: number | null): number {
  if (tint === null) {
    return color;
  }
  const channel = (shift: number): number =>
    Math.round((((color >> shift) & 0xff) * ((tint >> shift) & 0xff)) / 255);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
