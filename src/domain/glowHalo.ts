export const GLOW_HALO_PEAK_ALPHA = 0.85;
export const GLOW_HALO_PULSE_MIN = 0.5;
export const GLOW_HALO_PULSE_MS = 900;

export function glowHaloStepAlpha(step: number, reach: number): number {
  const falloff = 1 - step / (reach + 1);
  return GLOW_HALO_PEAK_ALPHA * falloff * falloff;
}
