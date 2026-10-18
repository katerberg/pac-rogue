export type CharmTuning = {
  readonly charmTail: boolean;
  readonly charmSize: number;
  readonly charmSpacing: number;
  readonly charmAnchorBack: number;
  readonly charmWallRadius: number;
  readonly charmSpring: number;
  readonly charmDamping: number;
  readonly charmMinStretch: number;
  readonly charmMaxStretch: number;
  readonly charmBounce: number;
  readonly charmBobble: number;
  readonly charmBobblePeriodMs: number;
  readonly charmBaseAlpha: number;
};

export const DEFAULT_CHARM_TUNING: CharmTuning = {
  charmTail: true,
  charmSize: 10,
  charmSpacing: 1.3,
  charmAnchorBack: 10,
  charmWallRadius: 0.35,
  charmSpring: 1,
  charmDamping: 1,
  charmMinStretch: 0.7,
  charmMaxStretch: 1.15,
  charmBounce: 0.6,
  charmBobble: 0.12,
  charmBobblePeriodMs: 700,
  charmBaseAlpha: 0.85,
};

const BASE_SPRING = 0.0006;
const BASE_DAMPING = 0.014;

export type TailLayout = {
  linkPx: number;
  anchorBackPx: number;
  radiusPx: number;
  spring: number;
  damping: number;
  minStretch: number;
  maxStretch: number;
  bounce: number;
  bobblePx: number;
  bobblePeriodMs: number;
};

export type CharmLook = {
  enabled: boolean;
  sizePx: number;
  baseAlpha: number;
};

export function tailLayoutFrom(tuning: CharmTuning): TailLayout {
  const linkPx = tuning.charmSize * tuning.charmSpacing;
  return {
    linkPx,
    anchorBackPx: tuning.charmAnchorBack,
    radiusPx: tuning.charmSize * tuning.charmWallRadius,
    spring: BASE_SPRING * tuning.charmSpring,
    damping: BASE_DAMPING * tuning.charmDamping,
    minStretch: tuning.charmMinStretch,
    maxStretch: Math.max(tuning.charmMaxStretch, tuning.charmMinStretch),
    bounce: tuning.charmBounce,
    bobblePx: linkPx * tuning.charmBobble,
    bobblePeriodMs: tuning.charmBobblePeriodMs,
  };
}

export function charmLookFrom(tuning: CharmTuning): CharmLook {
  return {
    enabled: tuning.charmTail,
    sizePx: tuning.charmSize,
    baseAlpha: tuning.charmBaseAlpha,
  };
}
