export const GLOW_HALO_PEAK_ALPHA = 0.85;

export const GLOW_HALO_PULSE_TWEEN = {
  alpha: { from: 1, to: 0.5 },
  duration: 900,
  ease: "Sine.easeInOut",
  yoyo: true,
  repeat: -1,
};

export function glowHaloStepAlpha(step: number, reach: number): number {
  const falloff = 1 - step / (reach + 1);
  return GLOW_HALO_PEAK_ALPHA * falloff * falloff;
}
