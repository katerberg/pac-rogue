import type { EpisodeResult } from "./episode";
import type { SkillTierId } from "./profiles";
import { wilson, type Interval } from "./stats";

export type TargetMetric = "reachL3" | "reachL6" | "reachBoss" | "win";
export type Band = { lo: number; hi: number };
export type TierTarget = { standsFor: string; bands: Record<TargetMetric, Band> };

export const TARGET_METRICS: readonly TargetMetric[] = ["reachL3", "reachL6", "reachBoss", "win"];

export const TIER_TARGETS: Record<SkillTierId, TierTarget> = {
  novice: {
    standsFor: "runs 1-3",
    bands: {
      reachL3: { lo: 0.6, hi: 0.8 },
      reachL6: { lo: 0, hi: 0.1 },
      reachBoss: { lo: 0, hi: 0.02 },
      win: { lo: 0, hi: 0.01 },
    },
  },
  average: {
    standsFor: "2-5 hours in",
    bands: {
      reachL3: { lo: 0.9, hi: 1 },
      reachL6: { lo: 0.3, hi: 0.5 },
      reachBoss: { lo: 0.15, hi: 0.25 },
      win: { lo: 0.03, hi: 0.07 },
    },
  },
  expert: {
    standsFor: "10+ hours in",
    bands: {
      reachL3: { lo: 0.97, hi: 1 },
      reachL6: { lo: 0.8, hi: 0.95 },
      reachBoss: { lo: 0.5, hi: 0.6 },
      win: { lo: 0.35, hi: 0.45 },
    },
  },
};

export type TargetVerdict = "ok" | "above" | "below";
export type TierActual = {
  n: number;
  metrics: Record<TargetMetric, Interval | null>;
};
export type TargetCheck = {
  metric: TargetMetric;
  band: Band;
  actual: Interval;
  verdict: TargetVerdict;
  separated: boolean;
};

export function tierOf(profile: string): SkillTierId {
  return profile.split("@")[1] as SkillTierId;
}

const reached = (results: readonly EpisodeResult[], level: number) =>
  wilson(results.filter((r) => r.levelReached >= level).length, results.length);

export function tierActual(results: readonly EpisodeResult[]): TierActual {
  return {
    n: results.length,
    metrics: {
      reachL3: reached(results, 3),
      reachL6: reached(results, 6),
      reachBoss: wilson(results.filter((r) => r.outcome === "reachedBoss").length, results.length),
      win: null,
    },
  };
}

export function checkTarget(metric: TargetMetric, band: Band, actual: Interval): TargetCheck {
  const verdict = actual.value < band.lo ? "below" : actual.value > band.hi ? "above" : "ok";
  return {
    metric,
    band,
    actual,
    verdict,
    separated: actual.n > 0 && (actual.hi < band.lo || actual.lo > band.hi),
  };
}

export function targetMisses(tier: SkillTierId, actual: TierActual): TargetCheck[] {
  return TARGET_METRICS.flatMap((metric) => {
    const measured = actual.metrics[metric];
    if (measured === null || actual.n === 0) {
      return [];
    }
    const check = checkTarget(metric, TIER_TARGETS[tier].bands[metric], measured);
    return check.verdict === "ok" ? [] : [check];
  });
}
