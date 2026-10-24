import { GHOST_KIND, type GhostKindId } from "../../../domain/ghostKind";
import {
  ALL_UPGRADE_IDS,
  enhancedIdOf,
  getUpgradeDef,
  isSpecialist,
  type BaseUpgradeId,
  type UpgradeId,
  type UpgradeSchool,
} from "../../../domain/upgrades";
import { isTrinketId } from "../../../domain/trinkets";
import type { ExperimentId, Job } from "./episode";
import { BUILD_PROFILE_IDS, EXPERT_PROFILE_IDS, PROFILE_IDS } from "./profiles";

export type PresetId = "smoke" | "pilot" | "full";

export const EXPERIMENTS: readonly ExperimentId[] = [
  "builds",
  "singles",
  "pairs",
  "schools",
  "enemies",
];

export type ArmSpec = {
  experiment: ExperimentId;
  arm: string;
  profiles: readonly string[];
  level?: number;
  upgrades?: UpgradeId[];
  ghosts?: GhostKindId[];
  roster?: number;
};

export type Throughput = { buildSeconds: number; forcedSeconds: number; workers: number };

export type Plan = {
  preset: PresetId;
  arms: ArmSpec[];
  seedsPerArm: Record<ExperimentId, number>;
  rerun: { pairs: number; seeds: number };
  jobs: Job[];
  estimatedSeconds: number | null;
};

const SMOKE_UPGRADES: readonly BaseUpgradeId[] = [
  "powerPelletInvuln",
  "passiveAfterburner",
  "powerPelletHunter",
  "powerPelletExtraHungry",
  "fruitPowerPellet",
  "passiveExtraLife",
  "passiveOvercharge",
  "powerPelletHyperspeed",
];

const SMOKE_PAIRS: readonly [BaseUpgradeId, BaseUpgradeId][] = [
  ["passiveOvercharge", "powerPelletInvuln"],
  ["powerPelletHyperspeed", "passiveAfterburner"],
  ["passiveOvercharge", "powerPelletHunter"],
  ["fruitPowerPellet", "powerPelletExtraHungry"],
];

const SMOKE_PROFILES = ["cautious@expert", "disrupter@expert", "casual@average"];

export const TESTABLE_UPGRADES: readonly BaseUpgradeId[] = ALL_UPGRADE_IDS.filter(
  (id) => !isSpecialist(id) && !isTrinketId(id),
);

const SCHOOLS: readonly UpgradeSchool[] = [
  "death",
  "harvest",
  "speed",
  "automation",
  "protection",
  "disruption",
];

const GHOST_KINDS = Object.keys(GHOST_KIND) as (keyof typeof GHOST_KIND)[];
const ROSTER_COUNT = 6;

const SHARES = { forced: 0.2, pairs: 0.2, enemies: 0.05, rerun: 0.05 };
const MIN_SEEDS = { pilot: 10, full: 20 };
const RERUN_PAIRS = 20;
const RERUN_MULTIPLIER = 5;

export function armKey(spec: Pick<Job, "experiment" | "arm" | "level">): string {
  return `${spec.experiment}|${spec.arm}|L${spec.level ?? "-"}`;
}

function pairsOf(ids: readonly BaseUpgradeId[]): [BaseUpgradeId, BaseUpgradeId][] {
  return ids.flatMap((a, i) => ids.slice(i + 1).map((b): [BaseUpgradeId, BaseUpgradeId] => [a, b]));
}

function singleArms(
  ids: readonly BaseUpgradeId[],
  levels: readonly number[],
  profiles: readonly string[],
  enhanced: boolean,
): ArmSpec[] {
  const variants: { arm: string; upgrades: UpgradeId[] }[] = [
    { arm: "none", upgrades: [] },
    ...ids.map((id) => ({ arm: id, upgrades: [id] })),
    ...(enhanced
      ? ids.map((id) => ({ arm: enhancedIdOf(id), upgrades: [enhancedIdOf(id)] as UpgradeId[] }))
      : []),
  ];
  return levels.flatMap((level) =>
    variants.map((variant) => ({ experiment: "singles" as const, level, profiles, ...variant })),
  );
}

function pairArms(
  pairs: readonly [BaseUpgradeId, BaseUpgradeId][],
  profiles: readonly string[],
): ArmSpec[] {
  return pairs.map(([a, b]) => ({
    experiment: "pairs",
    arm: `${a}+${b}`,
    level: 5,
    profiles,
    upgrades: [a, b],
  }));
}

function schoolArms(
  schools: readonly UpgradeSchool[],
  levels: readonly number[],
  profiles: readonly string[],
): ArmSpec[] {
  return schools.flatMap((school) => {
    const members = TESTABLE_UPGRADES.filter((id) => getUpgradeDef(id).school === school).slice(
      0,
      3,
    );
    const specialist = ALL_UPGRADE_IDS.find(
      (id) => isSpecialist(id) && getUpgradeDef(id).school === school,
    );
    const variants = [
      { arm: `school:${school}`, upgrades: [...members] as UpgradeId[] },
      ...(specialist === undefined
        ? []
        : [
            {
              arm: `school:${school}+specialist`,
              upgrades: [...members, specialist] as UpgradeId[],
            },
          ]),
    ];
    return levels.flatMap((level) =>
      variants.map((variant) => ({ experiment: "schools" as const, level, profiles, ...variant })),
    );
  });
}

function enemyArms(
  rosters: readonly number[],
  kinds: readonly (keyof typeof GHOST_KIND)[],
  profiles: readonly string[],
): ArmSpec[] {
  return [
    ...rosters.map((roster) => ({
      experiment: "enemies" as const,
      arm: `roster:${roster}`,
      level: 5,
      profiles,
      roster,
    })),
    ...kinds.map((kind) => ({
      experiment: "enemies" as const,
      arm: `ghost:${kind}`,
      level: 5,
      profiles,
      ghosts: [GHOST_KIND[kind]],
    })),
  ];
}

export function presetArms(preset: PresetId): ArmSpec[] {
  const all = Array.from({ length: ROSTER_COUNT }, (_, i) => i);
  if (preset === "smoke") {
    return [
      { experiment: "builds", arm: "build", profiles: [...SMOKE_PROFILES, "casual@novice"] },
      ...singleArms(SMOKE_UPGRADES, [5], SMOKE_PROFILES, false),
      ...pairArms(SMOKE_PAIRS, SMOKE_PROFILES),
      ...schoolArms(["speed"], [5], SMOKE_PROFILES),
      ...enemyArms([0], ["blinky"], SMOKE_PROFILES),
    ];
  }
  if (preset === "pilot") {
    return [
      { experiment: "builds", arm: "build", profiles: [...EXPERT_PROFILE_IDS, "casual@novice"] },
      ...singleArms(TESTABLE_UPGRADES, [5], EXPERT_PROFILE_IDS, false),
      ...pairArms(pairsOf(SMOKE_UPGRADES), EXPERT_PROFILE_IDS),
      ...schoolArms(SCHOOLS, [5], EXPERT_PROFILE_IDS),
      ...enemyArms(all, GHOST_KINDS, EXPERT_PROFILE_IDS),
    ];
  }
  return [
    { experiment: "builds", arm: "build", profiles: BUILD_PROFILE_IDS },
    ...singleArms(TESTABLE_UPGRADES, [3, 5, 8], PROFILE_IDS, true),
    ...pairArms(pairsOf(TESTABLE_UPGRADES), EXPERT_PROFILE_IDS),
    ...schoolArms(SCHOOLS, [5, 8], PROFILE_IDS),
    ...enemyArms(all, GHOST_KINDS, PROFILE_IDS),
  ];
}

function runsOf(arms: readonly ArmSpec[], experiments: readonly ExperimentId[]): number {
  return arms
    .filter((arm) => experiments.includes(arm.experiment))
    .reduce((sum, arm) => sum + arm.profiles.length, 0);
}

export class BudgetError extends Error {}

export function seedsFor(
  preset: PresetId,
  arms: readonly ArmSpec[],
  throughput: Throughput | null,
  budgetHours: number | null,
): { seeds: Record<ExperimentId, number>; rerun: { pairs: number; seeds: number } } {
  if (preset === "smoke") {
    return {
      seeds: { builds: 30, singles: 10, pairs: 10, schools: 10, enemies: 10 },
      rerun: { pairs: 2, seeds: 20 },
    };
  }
  if (throughput === null || budgetHours === null) {
    throw new BudgetError(`The ${preset} preset needs a measured throughput and a budget`);
  }
  const min = MIN_SEEDS[preset];
  const budget = budgetHours * 3600 * throughput.workers;
  const size = (share: number, runs: number, cost: number): number =>
    runs === 0 ? 0 : Math.max(min, Math.floor((share * budget) / (runs * cost)));
  const forced = size(
    SHARES.forced,
    runsOf(arms, ["singles", "schools"]),
    throughput.forcedSeconds,
  );
  const pairs = size(SHARES.pairs, runsOf(arms, ["pairs"]), throughput.forcedSeconds);
  const enemies = size(SHARES.enemies, runsOf(arms, ["enemies"]), throughput.forcedSeconds);
  const pairProfiles = arms.find((arm) => arm.experiment === "pairs")?.profiles.length ?? 0;
  const rerunPairs = Math.min(
    RERUN_PAIRS,
    Math.floor(runsOf(arms, ["pairs"]) / Math.max(1, pairProfiles) / 2),
  );
  const rerunSeeds = Math.min(
    pairs * RERUN_MULTIPLIER,
    size(SHARES.rerun, rerunPairs * pairProfiles, throughput.forcedSeconds),
  );
  const forcedSpend =
    throughput.forcedSeconds *
    (forced * runsOf(arms, ["singles", "schools"]) +
      pairs * runsOf(arms, ["pairs"]) +
      enemies * runsOf(arms, ["enemies"]) +
      rerunSeeds * rerunPairs * pairProfiles);
  return {
    seeds: {
      builds: size(
        Math.max(0, budget - forcedSpend) / budget,
        runsOf(arms, ["builds"]),
        throughput.buildSeconds,
      ),
      singles: forced,
      schools: forced,
      pairs,
      enemies,
    },
    rerun: { pairs: rerunPairs, seeds: rerunSeeds },
  };
}

function seedName(index: number): string {
  return `bal-${index}`;
}

export function jobsFor(arm: ArmSpec, seeds: number, firstSeed = 0): Job[] {
  return arm.profiles.flatMap((profile) =>
    Array.from({ length: seeds }, (_, i) => ({
      experiment: arm.experiment,
      arm: arm.arm,
      profile,
      seed: seedName(firstSeed + i),
      ...(arm.level === undefined ? {} : { level: arm.level }),
      ...(arm.upgrades === undefined ? {} : { upgrades: arm.upgrades }),
      ...(arm.ghosts === undefined ? {} : { ghosts: arm.ghosts }),
      ...(arm.roster === undefined ? {} : { roster: arm.roster }),
    })),
  );
}

function estimateSeconds(jobs: readonly Job[], throughput: Throughput): number {
  const cost = jobs.reduce(
    (sum, job) =>
      sum + (job.experiment === "builds" ? throughput.buildSeconds : throughput.forcedSeconds),
    0,
  );
  return cost / throughput.workers;
}

export type PlanRequest = {
  preset: PresetId;
  throughput: Throughput | null;
  budgetHours: number | null;
  only?: readonly ExperimentId[];
  profiles?: readonly string[];
};

export function planJobs({
  preset,
  throughput,
  budgetHours,
  only = EXPERIMENTS,
  profiles,
}: PlanRequest): Plan {
  const arms = presetArms(preset)
    .filter((arm) => only.includes(arm.experiment))
    .map((arm) =>
      profiles === undefined
        ? arm
        : { ...arm, profiles: arm.profiles.filter((id) => profiles.includes(id)) },
    )
    .filter((arm) => arm.profiles.length > 0);
  const { seeds, rerun } = seedsFor(preset, arms, throughput, budgetHours);
  const seedIndex = (job: Job) => Number(job.seed.slice("bal-".length));
  const jobs = arms
    .flatMap((arm) => jobsFor(arm, seeds[arm.experiment]))
    .sort((a, b) => seedIndex(a) - seedIndex(b));
  const pairProfiles = arms.find((arm) => arm.experiment === "pairs")?.profiles.length ?? 0;
  const rerunJobs = rerun.pairs * rerun.seeds * pairProfiles;
  const estimatedSeconds =
    throughput === null
      ? null
      : estimateSeconds(jobs, throughput) +
        (rerunJobs * throughput.forcedSeconds) / throughput.workers;
  if (
    estimatedSeconds !== null &&
    budgetHours !== null &&
    estimatedSeconds > budgetHours * 3600 * 1.1
  ) {
    const lines = EXPERIMENTS.filter((id) => only.includes(id)).map((id) => {
      const part = estimateSeconds(
        jobs.filter((job) => job.experiment === id),
        throughput!,
      );
      return `  ${id}: ${(part / 3600).toFixed(2)} h`;
    });
    throw new BudgetError(
      [
        `Plan needs about ${(estimatedSeconds / 3600).toFixed(2)} h but the budget is ${budgetHours} h,`,
        "even at the minimum seed counts. Trim with --only or --profiles, or raise --budget-hours.",
        ...lines,
      ].join("\n"),
    );
  }
  return { preset, arms, seedsPerArm: seeds, rerun, jobs, estimatedSeconds };
}
