import { LAZY_LOOPER_OPTIONAL_TINT } from "./lazyLooper";
import { TUNING_KNOBS, type KnobDef } from "./tuningKnobs";

export type Tuning = {
  readonly playerSpeedTiles: number;
  readonly levelSpeedRamp: number;
  readonly eatDragMs: number;
  readonly eatDragPeak: number;
  readonly eatDragPowerMs: number;
  readonly preTurnPx: number;
  readonly ghostRatioStart: number;
  readonly ghostRatioStep: number;
  readonly ghostRatioCap: number;
  readonly ghostTunnelRatio: number;
  readonly ghostHouseExitRatio: number;
  readonly elroy1Ratio: number;
  readonly elroy2Ratio: number;
  readonly bossGhostRatio: number;
  readonly bossSwarmStartGhosts: number;
  readonly timerMax: number;
  readonly timerTickMs: number;
  readonly pinkyLookahead: number;
  readonly inkyLookahead: number;
  readonly clydeShyTiles: number;
  readonly elroy1DotsLeft: number;
  readonly elroy2DotsLeft: number;
  readonly blinkyReleaseMs: number;
  readonly pinkyReleaseMs: number;
  readonly inkyReleasePellets: number;
  readonly clydeReleasePellets: number;
  readonly level2ClydeDots: number;
  readonly postLifePinkyDots: number;
  readonly postLifeInkyDots: number;
  readonly postLifeClydeDots: number;
  readonly idleReleaseMs: number;
  readonly idleReleaseLateMs: number;
  readonly level1ChaseOnly: boolean;
  readonly scatterEarlyMs: number;
  readonly scatterLateMs: number;
  readonly chaseMs: number;
  readonly fruitLifetimeMs: number;
  readonly fruitThreshold1: number;
  readonly fruitThreshold2: number;
  readonly deathHoldMs: number;
  readonly readyPauseMs: number;
  readonly bonusStreakIdleMs: number;
  readonly wallThickness: number;
  readonly wallColor: number;
  readonly wallGlow: number;
  readonly wallGlowRadius: number;
  readonly ghostGlow: number;
  readonly ghostGlowRadius: number;
  readonly ghostLineWidth: number;
  readonly ghostWidth: number;
  readonly ghostHeight: number;
  readonly wallCornerRadius: number;
  readonly backgroundColor: number;
  readonly pelletRadius: number;
  readonly pelletStrokeWidth: number;
  readonly pelletGlow: number;
  readonly pelletGlowRadius: number;
  readonly pelletCoreColor: number;
  readonly pelletGlowColor: number;
  readonly pelletFillOpacity: number;
  readonly powerPelletRadius: number;
  readonly powerPelletStrokeWidth: number;
  readonly powerPelletGlow: number;
  readonly powerPelletGlowRadius: number;
  readonly powerPelletFillOpacity: number;
  readonly bossPelletRadius: number;
  readonly bossPelletStrokeWidth: number;
  readonly bossPelletGlow: number;
  readonly bossPelletGlowRadius: number;
  readonly bossPelletFillOpacity: number;
  readonly optionalPelletRadius: number;
  readonly optionalPelletStrokeWidth: number;
  readonly optionalPelletGlow: number;
  readonly optionalPelletGlowRadius: number;
  readonly optionalPelletFillColor: number;
  readonly optionalPelletGlowColor: number;
  readonly optionalPelletFillOpacity: number;
};

export type TuningKey = keyof Tuning;

export const DEFAULT_TUNING: Tuning = Object.freeze({
  playerSpeedTiles: 7.315,
  levelSpeedRamp: 0.05,
  eatDragMs: 100,
  eatDragPeak: 0.25,
  eatDragPowerMs: 300,
  preTurnPx: 4,
  ghostRatioStart: 0.8,
  ghostRatioStep: 0.05,
  ghostRatioCap: 1,
  ghostTunnelRatio: 0.6,
  ghostHouseExitRatio: 0.5,
  elroy1Ratio: 1,
  elroy2Ratio: 85 / 80,
  bossGhostRatio: 1,
  bossSwarmStartGhosts: 2,
  timerMax: 999,
  timerTickMs: 100,
  pinkyLookahead: 4,
  inkyLookahead: 2,
  clydeShyTiles: 8,
  elroy1DotsLeft: 20,
  elroy2DotsLeft: 10,
  blinkyReleaseMs: 100,
  pinkyReleaseMs: 0,
  inkyReleasePellets: 30,
  clydeReleasePellets: 60,
  level2ClydeDots: 50,
  postLifePinkyDots: 7,
  postLifeInkyDots: 17,
  postLifeClydeDots: 32,
  idleReleaseMs: 4_000,
  idleReleaseLateMs: 3_000,
  level1ChaseOnly: true,
  scatterEarlyMs: 7_000,
  scatterLateMs: 5_000,
  chaseMs: 20_000,
  fruitLifetimeMs: 10_000,
  fruitThreshold1: 70,
  fruitThreshold2: 170,
  deathHoldMs: 845,
  readyPauseMs: 1000,
  bonusStreakIdleMs: 400,
  wallThickness: 1.5,
  wallColor: 0x2121ff,
  wallGlow: 4,
  wallGlowRadius: 21,
  ghostGlow: 1.6,
  ghostGlowRadius: 6,
  ghostLineWidth: 6.5,
  ghostWidth: 1.16,
  ghostHeight: 1.14,
  wallCornerRadius: 6,
  backgroundColor: 0x1a1a2e,
  pelletRadius: 1.25,
  pelletStrokeWidth: 1.0,
  pelletGlow: 1.2,
  pelletGlowRadius: 7,
  pelletCoreColor: 0xffffff,
  pelletGlowColor: 0x2121ff,
  pelletFillOpacity: 1,
  powerPelletRadius: 2.75,
  powerPelletStrokeWidth: 2.0,
  powerPelletGlow: 2.2,
  powerPelletGlowRadius: 12,
  powerPelletFillOpacity: 1,
  bossPelletRadius: 2.0,
  bossPelletStrokeWidth: 1.5,
  bossPelletGlow: 1.8,
  bossPelletGlowRadius: 10,
  bossPelletFillOpacity: 1,
  optionalPelletRadius: 1.25,
  optionalPelletStrokeWidth: 1.0,
  optionalPelletGlow: 0.6,
  optionalPelletGlowRadius: 5,
  optionalPelletFillColor: LAZY_LOOPER_OPTIONAL_TINT,
  optionalPelletGlowColor: 0xa0a0b4,
  optionalPelletFillOpacity: 1,
});

const TUNING_STORAGE_VERSION = 1;

type TuningOverrides = Partial<Record<TuningKey, number | boolean>>;

function knobValue(knob: KnobDef, raw: unknown): number | boolean | null {
  if (knob.kind === "toggle") {
    return typeof raw === "boolean" ? raw : null;
  }
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return null;
  }
  if (knob.kind !== "range") {
    return Math.min(0xffffff, Math.max(0, Math.round(raw)));
  }
  const snapped = knob.min + Math.round((raw - knob.min) / knob.step) * knob.step;
  return Math.min(knob.max, Math.max(knob.min, Number(snapped.toFixed(6))));
}

export function parseTuningOverrides(raw: string | null): {
  overrides: TuningOverrides;
  warning: string | null;
} {
  if (raw === null) {
    return { overrides: {}, warning: null };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const record = parsed as { version?: unknown; overrides?: unknown } | null;
    if (
      record === null ||
      typeof record !== "object" ||
      record.version !== TUNING_STORAGE_VERSION ||
      record.overrides === null ||
      typeof record.overrides !== "object"
    ) {
      return { overrides: {}, warning: "Ignoring stored knobs: unknown format" };
    }
    const stored = record.overrides as Record<string, unknown>;
    const overrides: TuningOverrides = {};
    for (const knob of TUNING_KNOBS) {
      const value = knobValue(knob, stored[knob.key]);
      if (value !== null) {
        overrides[knob.key] = value;
      }
    }
    return { overrides, warning: null };
  } catch {
    return { overrides: {}, warning: "Ignoring stored knobs: invalid JSON" };
  }
}

export function serializeTuningOverrides(overrides: TuningOverrides): string {
  return JSON.stringify({ version: TUNING_STORAGE_VERSION, overrides });
}

export function resolveTuning(overrides: TuningOverrides): Tuning {
  return { ...DEFAULT_TUNING, ...overrides } as Tuning;
}

export function diffFromDefault(tuning: Tuning): TuningOverrides {
  const diff: TuningOverrides = {};
  for (const knob of TUNING_KNOBS) {
    if (tuning[knob.key] !== DEFAULT_TUNING[knob.key]) {
      diff[knob.key] = tuning[knob.key];
    }
  }
  return diff;
}

export function ghostBaseSpeedRatio(levelIndex: number, tuning: Tuning = DEFAULT_TUNING): number {
  const level = Math.max(1, levelIndex);
  return Math.min(
    tuning.ghostRatioCap,
    tuning.ghostRatioStart + tuning.ghostRatioStep * (level - 1),
  );
}

export function speedLevelMultiplier(levelIndex: number, tuning: Tuning = DEFAULT_TUNING): number {
  const level = Math.max(1, levelIndex);
  return 1 + tuning.levelSpeedRamp * (level - 1);
}

export function effectiveGhostTilesPerSec(tuning: Tuning, levelIndex: number): number {
  return (
    tuning.playerSpeedTiles *
    ghostBaseSpeedRatio(levelIndex, tuning) *
    speedLevelMultiplier(levelIndex, tuning)
  );
}

export function parseHexColor(text: string): number | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(text.trim());
  return match ? Number.parseInt(match[1]!, 16) : null;
}
