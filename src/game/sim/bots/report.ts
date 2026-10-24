import { baseIdOf, getUpgradeDef, type UpgradeId } from "../../../domain/upgrades";
import { DEATH_CAUSES, type DeathCause } from "./bot";
import type { EpisodeResult, ExperimentId } from "./episode";
import { armKey } from "./experiments";
import type { SkillTierId } from "./profiles";
import { meanCi, separated, synergy, wilson, type Interval } from "./stats";
import {
  TARGET_METRICS,
  TIER_TARGETS,
  checkTarget,
  targetMisses,
  tierActual,
  tierOf,
  type Band,
  type TargetMetric,
  type TierActual,
} from "./targets";

export const SUMMARY_VERSION = 2;
const CURVE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const STALL_LIMIT = 0.02;
const minRows = (runs: number, floor: number, share: number) =>
  Math.max(floor, Math.round(runs * share));

export type ArmMetrics = {
  n: number;
  clearRate: Interval;
  progress: Interval;
  deaths: Interval;
  levelReached: Interval;
  stalled: number;
  errors: number;
};

export type UpgradeValue = { id: string; took: Interval; passed: Interval; delta: number };
export type BuildSummary = {
  n: number;
  reachedBoss: Interval;
  levelReached: Interval;
  upgradeValue: UpgradeValue[];
  compositions: { key: string; levelReached: Interval }[];
  coOwned: { pair: string; n: number; lift: number }[];
  curve: { level: number; reached: number; deaths: number }[];
};
export type GhostLethality = { catches: number; outMinutes: number; perMinute: number };
export type DeathCauses = Record<string, Record<DeathCause, number>>;

export type SummaryMeta = {
  gitSha: string;
  createdAt: string;
  preset: string;
  budgetHours: number | null;
  seedsPerArm: Record<ExperimentId, number>;
  partial: boolean;
};

export type Summary = SummaryMeta & {
  version: typeof SUMMARY_VERSION;
  health: {
    episodes: number;
    stalled: number;
    errors: number;
    storeStalls: number;
    untrustworthy: boolean;
    errorSamples: string[];
  };
  arms: Record<string, Record<string, ArmMetrics>>;
  builds: Record<string, BuildSummary>;
  targets: Partial<Record<SkillTierId, TierActual>>;
  causes: Partial<Record<SkillTierId, DeathCauses>>;
  ghosts: Record<string, Record<string, GhostLethality>>;
};

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = groups.get(k);
    if (group === undefined) {
      groups.set(k, [item]);
    } else {
      group.push(item);
    }
  }
  return groups;
}

function armMetrics(results: readonly EpisodeResult[]): ArmMetrics {
  const success = (r: EpisodeResult) => r.outcome === "clear" || r.outcome === "reachedBoss";
  const clears = results.filter(success);
  return {
    n: results.length,
    clearRate: wilson(clears.length, results.length),
    progress: meanCi(results.map((r) => r.progress)),
    deaths: meanCi(results.map((r) => r.deaths.length)),
    levelReached: meanCi(results.map((r) => r.levelReached)),
    stalled: results.filter((r) => r.outcome === "stalled").length,
    errors: results.filter((r) => r.outcome === "error").length,
  };
}

function schoolOf(id: string): string {
  return getUpgradeDef(id as UpgradeId).school;
}

function buildSummary(results: readonly EpisodeResult[]): BuildSummary {
  const levels = (runs: readonly EpisodeResult[]) => meanCi(runs.map((r) => r.levelReached));
  const overall = levels(results).value;
  const offered = new Set(results.flatMap((r) => r.offers.flatMap((offer) => offer.offered)));
  const upgradeValue = [...offered]
    .map((id) => {
      const took = results.filter((r) => r.offers.some((offer) => offer.took === id));
      const passed = results.filter(
        (r) =>
          r.offers.some((offer) => offer.offered.includes(id)) &&
          !r.offers.some((offer) => offer.took === id),
      );
      const tookLevels = levels(took);
      const passedLevels = levels(passed);
      return {
        id,
        took: tookLevels,
        passed: passedLevels,
        delta: tookLevels.value - passedLevels.value,
      };
    })
    .filter((value) => {
      const min = minRows(results.length, 3, 0.03);
      return value.took.n >= min && value.passed.n >= min;
    })
    .sort((a, b) => b.delta - a.delta);
  const compositionKey = (r: EpisodeResult) => {
    const counts = new Map<string, number>();
    for (const id of r.finalLoadout) {
      counts.set(schoolOf(id), (counts.get(schoolOf(id)) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([school, count]) => `${school}×${count}`)
      .join(" ");
  };
  const compositions = [...groupBy(results, compositionKey).entries()]
    .filter(([, runs]) => runs.length >= minRows(results.length, 3, 0.03))
    .map(([key, runs]) => ({ key, levelReached: levels(runs) }))
    .sort((a, b) => b.levelReached.value - a.levelReached.value)
    .slice(0, 15);
  const pairCounts = new Map<string, EpisodeResult[]>();
  for (const r of results) {
    const owned = [...new Set(r.finalLoadout.map((id) => baseIdOf(id as UpgradeId)))].sort();
    owned.forEach((a, i) =>
      owned.slice(i + 1).forEach((b) => {
        const key = `${a}+${b}`;
        pairCounts.set(key, [...(pairCounts.get(key) ?? []), r]);
      }),
    );
  }
  const coOwned = [...pairCounts.entries()]
    .filter(([, runs]) => runs.length >= minRows(results.length, 5, 0.05))
    .map(([pair, runs]) => ({ pair, n: runs.length, lift: levels(runs).value - overall }))
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 20);
  return {
    n: results.length,
    reachedBoss: wilson(results.filter((r) => r.outcome === "reachedBoss").length, results.length),
    levelReached: levels(results),
    upgradeValue,
    compositions,
    coOwned,
    curve: CURVE_LEVELS.map((level) => {
      const played = results.filter((r) => r.levelReached >= level);
      const deaths = played.reduce(
        (sum, r) => sum + r.deaths.filter((death) => death.level === level).length,
        0,
      );
      return {
        level,
        reached: played.length / Math.max(1, results.length),
        deaths: played.length === 0 ? 0 : deaths / played.length,
      };
    }),
  };
}

function deathCauses(results: readonly EpisodeResult[]): DeathCauses {
  const out: DeathCauses = {};
  for (const death of results.flatMap((r) => r.deaths)) {
    const level = String(death.level);
    out[level] ??= Object.fromEntries(DEATH_CAUSES.map((cause) => [cause, 0])) as Record<
      DeathCause,
      number
    >;
    out[level][death.cause] += 1;
  }
  return out;
}

function ghostLethality(results: readonly EpisodeResult[]): Record<string, GhostLethality> {
  const catches = new Map<string, number>();
  const outMs = new Map<string, number>();
  for (const r of results) {
    for (const death of r.deaths) {
      const kind = death.ghost ?? "unknown";
      catches.set(kind, (catches.get(kind) ?? 0) + 1);
    }
    for (const [kind, ms] of Object.entries(r.ghostOutMs)) {
      outMs.set(kind, (outMs.get(kind) ?? 0) + ms);
    }
  }
  const kinds = new Set([...catches.keys(), ...outMs.keys()]);
  return Object.fromEntries(
    [...kinds].map((kind) => {
      const outMinutes = (outMs.get(kind) ?? 0) / 60_000;
      const count = catches.get(kind) ?? 0;
      return [
        kind,
        { catches: count, outMinutes, perMinute: outMinutes === 0 ? 0 : count / outMinutes },
      ];
    }),
  );
}

export function summarize(results: readonly EpisodeResult[], meta: SummaryMeta): Summary {
  const stalled = results.filter((r) => r.outcome === "stalled").length;
  const errors = results.filter((r) => r.outcome === "error");
  const arms: Summary["arms"] = {};
  for (const [key, runs] of groupBy(results, (r) => armKey(r.job))) {
    arms[key] = Object.fromEntries(
      [...groupBy(runs, (r) => r.job.profile)].map(([profile, group]) => [
        profile,
        armMetrics(group),
      ]),
    );
  }
  const builds = results.filter((r) => r.job.experiment === "builds");
  const byTier = groupBy(builds, (r) => tierOf(r.job.profile));
  return {
    ...meta,
    version: SUMMARY_VERSION,
    health: {
      episodes: results.length,
      stalled,
      errors: errors.length,
      storeStalls: results.filter((r) => r.storeStall).length,
      untrustworthy: results.length > 0 && stalled / results.length > STALL_LIMIT,
      errorSamples: errors
        .slice(0, 5)
        .map((r) => `${r.job.profile} ${r.job.arm} ${r.job.seed}: ${r.error}`),
    },
    arms,
    builds: Object.fromEntries(
      [...groupBy(builds, (r) => r.job.profile)].map(([profile, runs]) => [
        profile,
        buildSummary(runs),
      ]),
    ),
    targets: Object.fromEntries([...byTier].map(([tier, runs]) => [tier, tierActual(runs)])),
    causes: Object.fromEntries([...byTier].map(([tier, runs]) => [tier, deathCauses(runs)])),
    ghosts: Object.fromEntries(
      [...groupBy(results, (r) => r.job.profile)].map(([profile, runs]) => [
        profile,
        ghostLethality(runs),
      ]),
    ),
  };
}

export type PairSynergy = { pair: string; profile: string; value: number; n: number };

export function pairSynergies(summary: Summary): PairSynergy[] {
  const out: PairSynergy[] = [];
  for (const [key, byProfile] of Object.entries(summary.arms)) {
    const [experiment, arm] = key.split("|");
    if (experiment !== "pairs") {
      continue;
    }
    const [a, b] = arm!.split("+");
    for (const [profile, metrics] of Object.entries(byProfile)) {
      const single = (name: string) => summary.arms[`singles|${name}|L5`]?.[profile]?.progress;
      const sa = single(a!);
      const sb = single(b!);
      const none = single("none");
      if (sa === undefined || sb === undefined || none === undefined) {
        continue;
      }
      out.push({
        pair: arm!,
        profile,
        value: synergy(metrics.progress.value, sa.value, sb.value, none.value),
        n: metrics.n,
      });
    }
  }
  return out;
}

function meanSynergyByPair(summary: Summary): { pair: string; value: number }[] {
  return [...groupBy(pairSynergies(summary), (s) => s.pair)]
    .map(([pair, list]) => ({
      pair,
      value: list.reduce((sum, s) => sum + s.value, 0) / list.length,
    }))
    .sort((a, b) => b.value - a.value);
}

export function rerunPairs(summary: Summary, count: number): string[] {
  return meanSynergyByPair(summary)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, count)
    .map((entry) => entry.pair);
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (x: number, digits = 2) => x.toFixed(digits);
const ci = (i: Interval, fmt: (x: number) => string = (x) => num(x)) =>
  `${fmt(i.value)} [${fmt(i.lo)}–${fmt(i.hi)}]`;

function table(header: readonly string[], rows: readonly (readonly string[])[]): string[] {
  if (rows.length === 0) {
    return ["_No rows with enough data._", ""];
  }
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
  ];
}

function profilesIn(summary: Summary, prefix: string): string[] {
  const set = new Set<string>();
  for (const [key, byProfile] of Object.entries(summary.arms)) {
    if (key.startsWith(prefix)) {
      Object.keys(byProfile).forEach((p) => set.add(p));
    }
  }
  return [...set].sort();
}

function levelsOf(summary: Summary, experiment: string): string[] {
  return [
    ...new Set(
      Object.keys(summary.arms)
        .filter((key) => key.startsWith(`${experiment}|`))
        .map((key) => key.split("|")[2]!),
    ),
  ].sort();
}

function deltaCell(arm: ArmMetrics | undefined, none: ArmMetrics | undefined): string {
  if (arm === undefined || none === undefined) {
    return "–";
  }
  const mark = separated(arm.progress, none.progress) ? "*" : "";
  return `${num(arm.progress.value - none.progress.value)}${mark} (${pct(arm.clearRate.value)})`;
}

function singlesSection(summary: Summary): string[] {
  const lines = ["## Singles", ""];
  const profiles = profilesIn(summary, "singles|");
  lines.push(
    "Each cell: change in board progress vs the no-upgrade arm (`*` = intervals separated), then clear rate.",
    "",
  );
  for (const level of levelsOf(summary, "singles")) {
    const none = summary.arms[`singles|none|${level}`];
    lines.push(`### Level ${level.slice(1)}`, "");
    if (none !== undefined) {
      lines.push(
        ...table(
          ["Baseline", ...profiles],
          [
            [
              "none",
              ...profiles.map((p) =>
                none[p] ? `${num(none[p].progress.value)} (${pct(none[p].clearRate.value)})` : "–",
              ),
            ],
          ],
        ),
      );
    }
    const rows = Object.entries(summary.arms)
      .filter(
        ([key]) =>
          key.startsWith("singles|") && key.endsWith(`|${level}`) && !key.includes("|none|"),
      )
      .map(([key, byProfile]) => {
        const deltas = profiles.map((p) =>
          byProfile[p] && none?.[p] ? byProfile[p].progress.value - none[p].progress.value : 0,
        );
        const mean = deltas.reduce((s, d) => s + d, 0) / Math.max(1, deltas.length);
        return { name: key.split("|")[1]!, byProfile, mean };
      })
      .sort((a, b) => b.mean - a.mean);
    lines.push(
      ...table(
        ["Upgrade", "Mean Δ", ...profiles],
        rows.map((row) => [
          row.name,
          num(row.mean),
          ...profiles.map((p) => deltaCell(row.byProfile[p], none?.[p])),
        ]),
      ),
    );
  }
  return lines;
}

function spreadSection(summary: Summary): string[] {
  const rows: { name: string; level: string; spread: number; best: string; worst: string }[] = [];
  for (const level of levelsOf(summary, "singles")) {
    const none = summary.arms[`singles|none|${level}`];
    for (const [key, byProfile] of Object.entries(summary.arms)) {
      if (!key.startsWith("singles|") || !key.endsWith(`|${level}`) || key.includes("|none|")) {
        continue;
      }
      const deltas = Object.entries(byProfile)
        .filter(([p]) => none?.[p] !== undefined)
        .map(([p, m]) => ({ p, d: m.progress.value - none![p]!.progress.value }))
        .sort((a, b) => b.d - a.d);
      if (deltas.length < 2) {
        continue;
      }
      rows.push({
        name: key.split("|")[1]!,
        level: level.slice(1),
        spread: deltas[0]!.d - deltas.at(-1)!.d,
        best: `${deltas[0]!.p} ${num(deltas[0]!.d)}`,
        worst: `${deltas.at(-1)!.p} ${num(deltas.at(-1)!.d)}`,
      });
    }
  }
  rows.sort((a, b) => b.spread - a.spread);
  return [
    "## Cross-profile spread",
    "",
    "Upgrades whose value depends most on who plays them (max − min Δ progress across profiles).",
    "",
    ...table(
      ["Upgrade", "Level", "Spread", "Best for", "Worst for"],
      rows.slice(0, 15).map((r) => [r.name, r.level, num(r.spread), r.best, r.worst]),
    ),
  ];
}

const METRIC_LABELS: Record<TargetMetric, string> = {
  reachL3: "Reach L3",
  reachL6: "Reach L6",
  reachBoss: "Reach boss",
  win: "Win",
};
const band = (b: Band) => `${pct(b.lo)}–${pct(b.hi)}`;

function tiersIn(summary: Summary): SkillTierId[] {
  return (Object.keys(TIER_TARGETS) as SkillTierId[]).filter(
    (tier) => summary.targets[tier] !== undefined,
  );
}

function targetsSection(summary: Summary): string[] {
  const rows = tiersIn(summary).map((tier) => {
    const actual = summary.targets[tier]!;
    return [
      `${tier} (${TIER_TARGETS[tier].standsFor})`,
      String(actual.n),
      ...TARGET_METRICS.map((metric) => {
        const measured = actual.metrics[metric];
        const target = TIER_TARGETS[tier].bands[metric];
        if (measured === null) {
          return `– vs ${band(target)} (runs stop at the boss)`;
        }
        const check = checkTarget(target, measured);
        return `${ci(measured, pct)} vs ${band(target)} ${check.verdict}${check.separated ? "*" : ""}`;
      }),
    ];
  });
  return [
    "## Targets",
    "",
    "Build runs per skill tier against the reach targets in `targets.ts`. Each cell: share of runs [95% interval] vs the target band, then ok / above / below (`*` = the whole interval is outside the band).",
    "",
    ...table(["Tier", "Runs", ...TARGET_METRICS.map((m) => METRIC_LABELS[m])], rows),
  ];
}

function causesSection(summary: Summary): string[] {
  const lines = [
    "### Death causes",
    "",
    "Build-run deaths per level by what the bot's last plan said: cornered (no surviving route at the last junction), execution (wrong turn or a press that missed the corner), horizon (a mode flip or a ghost the plan did not see), model (the route also survives a re-plan with exact ghost positions, so the ghosts moved differently than the planner simulates), reaction (the same re-plan rejects the route, so the delayed ghost positions hid the catch), hazard (lava or boss).",
    "",
  ];
  for (const tier of tiersIn(summary)) {
    const byLevel = summary.causes[tier] ?? {};
    const levels = Object.keys(byLevel).sort((a, b) => Number(a) - Number(b));
    lines.push(
      `#### ${tier}`,
      "",
      ...table(
        ["Level", ...DEATH_CAUSES, "Total"],
        levels.map((level) => {
          const counts = byLevel[level]!;
          const total = DEATH_CAUSES.reduce((sum, cause) => sum + counts[cause], 0);
          return [
            level,
            ...DEATH_CAUSES.map((cause) =>
              counts[cause] === 0 ? "0" : `${counts[cause]} (${pct(counts[cause] / total)})`,
            ),
            String(total),
          ];
        }),
      ),
    );
  }
  return lines;
}

function buildsSection(summary: Summary): string[] {
  const lines = ["## Builds", ""];
  const profiles = Object.keys(summary.builds).sort();
  lines.push(
    "Runs start at level 1 with the game's own starting upgrade and play to the level-9 boss.",
    "",
    ...table(
      ["Profile", "Runs", "Reached boss", "Mean level reached"],
      profiles.map((p) => {
        const b = summary.builds[p]!;
        return [p, String(b.n), ci(b.reachedBoss, pct), ci(b.levelReached)];
      }),
    ),
    "### Difficulty curve",
    "",
    "Each cell: share of runs that reached the level, then mean deaths on it among runs that played it. Level 9 is reaching the boss.",
    "",
    ...table(
      ["Profile", ...CURVE_LEVELS.map((level) => `L${level}`)],
      profiles.map((p) => [
        p,
        ...summary.builds[p]!.curve.map((point) =>
          point.level === 9
            ? pct(point.reached)
            : `${pct(point.reached)} / ${num(point.deaths, 1)}`,
        ),
      ]),
    ),
    ...causesSection(summary),
    "### Upgrade value (took it vs offered it and passed)",
    "",
    "Δ is mean level reached when the bot took the upgrade minus when it was offered and passed. `casual` picks at random, so its rows are the least biased.",
    "",
  );
  for (const p of profiles) {
    const values = summary.builds[p]!.upgradeValue;
    const shown = [
      ...values.slice(0, 8),
      ...values.slice(-5).filter((v) => !values.slice(0, 8).includes(v)),
    ];
    lines.push(
      `#### ${p}`,
      "",
      ...table(
        ["Upgrade", "Δ level", "Took (n)", "Passed (n)"],
        shown.map((v) => [
          v.id,
          num(v.delta),
          `${num(v.took.value)} (${v.took.n})`,
          `${num(v.passed.value)} (${v.passed.n})`,
        ]),
      ),
    );
  }
  lines.push("### Strongest final school mixes", "");
  for (const p of profiles) {
    lines.push(
      `#### ${p}`,
      "",
      ...table(
        ["Final loadout schools", "Runs", "Mean level reached"],
        summary.builds[p]!.compositions.map((c) => [
          c.key,
          String(c.levelReached.n),
          ci(c.levelReached),
        ]),
      ),
    );
  }
  lines.push(
    "### Co-owned pairs",
    "",
    "Lift = mean level reached with both owned minus the profile's mean. Long runs collect more upgrades, so read this as a lead, not proof.",
    "",
  );
  for (const p of profiles) {
    lines.push(
      `#### ${p}`,
      "",
      ...table(
        ["Pair", "Runs", "Lift"],
        summary.builds[p]!.coOwned.map((c) => [c.pair, String(c.n), num(c.lift)]),
      ),
    );
  }
  return lines;
}

function pairsSection(summary: Summary): string[] {
  const ranked = meanSynergyByPair(summary);
  const all = pairSynergies(summary);
  const profiles = [...new Set(all.map((s) => s.profile))].sort();
  const row = (entry: { pair: string; value: number }) => [
    entry.pair,
    num(entry.value),
    ...profiles.map((p) => {
      const s = all.find((x) => x.pair === entry.pair && x.profile === p);
      return s === undefined ? "–" : `${num(s.value)} (n=${s.n})`;
    }),
  ];
  const top = ranked.slice(0, 20);
  const bottom = ranked.slice(20).slice(-20).reverse();
  return [
    "## Pairs",
    "",
    "Synergy on board progress at level 5: pair − A − B + none. Positive means the two together beat the sum of their parts.",
    "",
    "### Strongest synergies",
    "",
    ...table(["Pair", "Mean", ...profiles], top.map(row)),
    ...(bottom.length === 0
      ? []
      : ["### Weakest synergies", "", ...table(["Pair", "Mean", ...profiles], bottom.map(row))]),
  ];
}

function schoolsSection(summary: Summary): string[] {
  const rows: string[][] = [];
  for (const [key, byProfile] of Object.entries(summary.arms)) {
    const [experiment, arm, level] = key.split("|");
    if (experiment !== "schools" || arm!.endsWith("+specialist")) {
      continue;
    }
    const withSpecialist = summary.arms[`schools|${arm}+specialist|${level}`];
    for (const [profile, metrics] of Object.entries(byProfile)) {
      const plus = withSpecialist?.[profile];
      rows.push([
        arm!.replace("school:", ""),
        level!.slice(1),
        profile,
        num(metrics.progress.value),
        plus === undefined ? "–" : num(plus.progress.value),
        plus === undefined
          ? "–"
          : `${num(plus.progress.value - metrics.progress.value)}${separated(plus.progress, metrics.progress) ? "*" : ""}`,
      ]);
    }
  }
  return [
    "## School Specialists",
    "",
    ...table(["School", "Level", "Profile", "3 upgrades", "+ Specialist", "Δ"], rows),
  ];
}

function enemiesSection(summary: Summary): string[] {
  const profiles = profilesIn(summary, "enemies|");
  const arms = Object.entries(summary.arms).filter(([key]) => key.startsWith("enemies|"));
  const kinds = [...new Set(Object.values(summary.ghosts).flatMap((g) => Object.keys(g)))].sort();
  return [
    "## Enemies",
    "",
    "Clear rate and deaths per episode at level 5 for each roster and single-ghost board.",
    "",
    ...table(
      ["Board", ...profiles],
      arms.map(([key, byProfile]) => [
        key.split("|")[1]!,
        ...profiles.map((p) =>
          byProfile[p] === undefined
            ? "–"
            : `${pct(byProfile[p].clearRate.value)} / ${num(byProfile[p].deaths.value, 1)}`,
        ),
      ]),
    ),
    "### Ghost lethality (all experiments)",
    "",
    "Catches per minute the ghost spent outside the house.",
    "",
    ...table(
      ["Ghost", ...Object.keys(summary.ghosts).sort()],
      kinds.map((kind) => [
        kind,
        ...Object.keys(summary.ghosts)
          .sort()
          .map((p) => {
            const g = summary.ghosts[p]![kind];
            return g === undefined ? "–" : `${num(g.perMinute)} (${g.catches})`;
          }),
      ]),
    ),
  ];
}

const EXEC_TOP = 5;
const SIGNAL_SEEDS = 50;
const SPIKE_DROP = 0.2;
const LETHALITY_RATIO = 1.75;
const SPREAD_FLOOR = 0.15;
const SPECIALIST_DELTA = 0.1;

type SinglesLead = {
  name: string;
  level: string;
  mean: number;
  spread: number;
  separated: number;
  profiles: number;
  minN: number;
  best: string;
  worst: string;
};

function singlesLeads(summary: Summary): SinglesLead[] {
  const leads: SinglesLead[] = [];
  for (const level of levelsOf(summary, "singles")) {
    const none = summary.arms[`singles|none|${level}`];
    if (none === undefined) {
      continue;
    }
    for (const [key, byProfile] of Object.entries(summary.arms)) {
      if (!key.startsWith("singles|") || !key.endsWith(`|${level}`) || key.includes("|none|")) {
        continue;
      }
      const deltas = Object.entries(byProfile)
        .filter(([p]) => none[p] !== undefined)
        .map(([p, m]) => ({
          p,
          d: m.progress.value - none[p]!.progress.value,
          separated: separated(m.progress, none[p]!.progress),
          n: m.n,
        }))
        .sort((a, b) => b.d - a.d);
      if (deltas.length === 0) {
        continue;
      }
      const top = deltas[0]!;
      const bottom = deltas.at(-1)!;
      leads.push({
        name: key.split("|")[1]!,
        level: level.slice(1),
        mean: deltas.reduce((s, d) => s + d.d, 0) / deltas.length,
        spread: top.d - bottom.d,
        separated: deltas.filter((d) => d.separated).length,
        profiles: deltas.length,
        minN: Math.min(...deltas.map((d) => d.n)),
        best: `${top.p} ${num(top.d)}`,
        worst: `${bottom.p} ${num(bottom.d)}`,
      });
    }
  }
  return leads;
}

function extremeByUpgrade(leads: readonly SinglesLead[]): SinglesLead[] {
  const best = new Map<string, SinglesLead>();
  for (const lead of leads) {
    const prev = best.get(lead.name);
    if (prev === undefined || Math.abs(lead.mean) > Math.abs(prev.mean)) {
      best.set(lead.name, lead);
    }
  }
  return [...best.values()];
}

function buildValueHint(summary: Summary, id: string): string | null {
  const profiles = Object.keys(summary.builds).sort();
  const preferred = profiles.find((p) => p.startsWith("casual@")) ?? profiles[0];
  if (preferred === undefined) {
    return null;
  }
  const row = summary.builds[preferred]!.upgradeValue.find((v) => v.id === id);
  if (row === undefined) {
    return null;
  }
  return `build value (${preferred}): ${num(row.delta)} levels (took n=${row.took.n}, passed n=${row.passed.n})`;
}

function formatLead(lead: SinglesLead, summary: Summary): string {
  const sep =
    lead.separated === 0
      ? "no separated profiles"
      : `separated for ${lead.separated}/${lead.profiles} profiles`;
  const parts = [
    `mean Δ progress ${num(lead.mean)} at L${lead.level} (${sep}; min n=${lead.minN})`,
    `best ${lead.best}, worst ${lead.worst}`,
  ];
  const build = buildValueHint(summary, lead.name);
  if (build !== null) {
    parts.push(build);
  }
  return `**${lead.name}** — ${parts.join("; ")}.`;
}

function pickLeads(leads: readonly SinglesLead[], direction: "over" | "under"): SinglesLead[] {
  const wantPositive = direction === "over";
  const ranked = [...leads].sort((a, b) => (wantPositive ? b.mean - a.mean : a.mean - b.mean));
  const signed = ranked.filter((l) => (wantPositive ? l.mean > 0 : l.mean < 0));
  const withSignal = signed.filter((l) => l.separated > 0);
  return (withSignal.length > 0 ? withSignal : signed).slice(0, EXEC_TOP);
}

function targetWatchouts(summary: Summary): string[] {
  return tiersIn(summary).flatMap((tier) =>
    targetMisses(tier, summary.targets[tier]!).map(
      (check) =>
        `**Target miss (${tier}):** ${METRIC_LABELS[check.metric]} ${pct(check.actual.value)}${check.separated ? "*" : ""} vs ${band(check.band)} (${check.verdict}; n=${check.actual.n}).`,
    ),
  );
}

function difficultyWatchouts(summary: Summary): string[] {
  const out: string[] = [];
  for (const [profile, build] of Object.entries(summary.builds).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    for (let i = 0; i < build.curve.length - 1; i++) {
      const from = build.curve[i]!;
      const to = build.curve[i + 1]!;
      const drop = from.reached - to.reached;
      if (drop >= SPIKE_DROP) {
        out.push(
          `**Difficulty spike (${profile}):** reach L${from.level}→L${to.level} drops ${pct(from.reached)} → ${pct(to.reached)} (Δ ${pct(drop)}); deaths on L${from.level} among runners: ${num(from.deaths, 1)}.`,
        );
      }
    }
  }
  return out.slice(0, EXEC_TOP);
}

function pairWatchouts(summary: Summary): string[] {
  const ranked = meanSynergyByPair(summary);
  if (ranked.length === 0) {
    return [];
  }
  const out: string[] = [];
  const top = ranked[0]!;
  if (top.value > 0.05) {
    out.push(
      `**Strong pair synergy:** ${top.pair} mean synergy ${num(top.value)} (pair − A − B + none on L5 progress).`,
    );
  }
  const bottom = ranked.at(-1)!;
  if (bottom.value < -0.05) {
    out.push(`**Weak / cancelling pair:** ${bottom.pair} mean synergy ${num(bottom.value)}.`);
  }
  return out;
}

function ghostWatchouts(summary: Summary): string[] {
  const out: string[] = [];
  for (const [profile, ghosts] of Object.entries(summary.ghosts).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const rows = Object.entries(ghosts)
      .filter(([, g]) => g.outMinutes > 0)
      .map(([kind, g]) => ({ kind, ...g }))
      .sort((a, b) => b.perMinute - a.perMinute);
    if (rows.length < 2) {
      continue;
    }
    const top = rows[0]!;
    const next = rows[1]!.perMinute;
    if (next <= 0) {
      if (top.catches >= 5) {
        out.push(
          `**Lethal ghost (${profile}):** ${top.kind} at ${num(top.perMinute)} catches/min (${top.catches} catches; others near zero).`,
        );
      }
      continue;
    }
    if (top.perMinute >= next * LETHALITY_RATIO) {
      out.push(
        `**Lethal ghost (${profile}):** ${top.kind} at ${num(top.perMinute)} catches/min (${num(top.perMinute / next, 1)}× next; ${top.catches} catches).`,
      );
    }
  }
  return out.slice(0, EXEC_TOP);
}

function spreadWatchouts(leads: readonly SinglesLead[]): string[] {
  return [...leads]
    .filter((l) => l.profiles >= 2 && l.spread >= SPREAD_FLOOR)
    .sort((a, b) => b.spread - a.spread)
    .slice(0, EXEC_TOP)
    .map(
      (l) =>
        `**Play-style dependent:** ${l.name} at L${l.level} spread ${num(l.spread)} (best ${l.best}, worst ${l.worst}).`,
    );
}

function specialistWatchouts(summary: Summary): string[] {
  const out: { text: string; abs: number }[] = [];
  for (const [key, byProfile] of Object.entries(summary.arms)) {
    const [experiment, arm, level] = key.split("|");
    if (experiment !== "schools" || arm!.endsWith("+specialist")) {
      continue;
    }
    const withSpecialist = summary.arms[`schools|${arm}+specialist|${level}`];
    if (withSpecialist === undefined) {
      continue;
    }
    for (const [profile, metrics] of Object.entries(byProfile)) {
      const plus = withSpecialist[profile];
      if (plus === undefined) {
        continue;
      }
      const delta = plus.progress.value - metrics.progress.value;
      if (Math.abs(delta) < SPECIALIST_DELTA) {
        continue;
      }
      out.push({
        text: `**School Specialist (${arm!.replace("school:", "")}, L${level!.slice(1)}, ${profile}):** Δ progress ${num(delta)}${separated(plus.progress, metrics.progress) ? "*" : ""} vs the 3-upgrade school arm.`,
        abs: Math.abs(delta),
      });
    }
  }
  return out
    .sort((a, b) => b.abs - a.abs)
    .slice(0, EXEC_TOP)
    .map((o) => o.text);
}

function rosterWatchouts(summary: Summary): string[] {
  const profiles = profilesIn(summary, "enemies|");
  if (profiles.length === 0) {
    return [];
  }
  const rosterArms = Object.entries(summary.arms).filter(([key]) =>
    key.startsWith("enemies|roster"),
  );
  if (rosterArms.length < 2) {
    return [];
  }
  const out: string[] = [];
  for (const profile of profiles) {
    const rows = rosterArms
      .map(([key, byProfile]) => ({
        board: key.split("|")[1]!,
        clear: byProfile[profile]?.clearRate.value,
      }))
      .filter((r): r is { board: string; clear: number } => r.clear !== undefined)
      .sort((a, b) => a.clear - b.clear);
    if (rows.length < 2) {
      continue;
    }
    const worst = rows[0]!;
    const best = rows.at(-1)!;
    if (best.clear - worst.clear >= 0.2) {
      out.push(
        `**Hard roster (${profile}):** ${worst.board} clears at ${pct(worst.clear)} vs ${best.board} at ${pct(best.clear)}.`,
      );
    }
  }
  return out.slice(0, EXEC_TOP);
}

function executiveSummarySection(summary: Summary): string[] {
  const h = summary.health;
  const singlesSeeds = summary.seedsPerArm.singles ?? 0;
  const thin = singlesSeeds > 0 && singlesSeeds < SIGNAL_SEEDS;
  const verdict = h.untrustworthy
    ? "UNTRUSTWORTHY — fix stalls before trusting rankings."
    : h.errors > 0
      ? `Errors present (${h.errors}) — treat rankings as provisional until bots are clean.`
      : summary.partial
        ? "PARTIAL — unfinished run; treat rankings as provisional."
        : thin
          ? `OK but thin sample (singles seeds/arm=${singlesSeeds} < ${SIGNAL_SEEDS}); rankings are leads, not proof.`
          : "OK — health gate passed.";

  const list = (items: readonly string[], empty: string) =>
    items.length === 0 ? [`_${empty}_`, ""] : [...items.map((item, i) => `${i + 1}. ${item}`), ""];

  if (h.untrustworthy) {
    return [
      "## Executive summary",
      "",
      `**Takeaway:** ${verdict}`,
      "",
      "_Rankings and watchouts omitted while the run is UNTRUSTWORTHY._",
      "",
    ];
  }

  const leads = extremeByUpgrade(singlesLeads(summary));
  const watchouts = [
    ...(h.errors > 0
      ? [
          `**Errors:** ${h.errors} episode(s) failed${h.errorSamples[0] ? ` (e.g. ${h.errorSamples[0]})` : ""}.`,
        ]
      : []),
    ...(h.storeStalls > 0
      ? [`**Store stalls:** ${h.storeStalls} episode(s) stalled in the store.`]
      : []),
    ...targetWatchouts(summary),
    ...difficultyWatchouts(summary),
    ...pairWatchouts(summary),
    ...ghostWatchouts(summary),
    ...rosterWatchouts(summary),
    ...spreadWatchouts(leads),
    ...specialistWatchouts(summary),
  ].slice(0, EXEC_TOP * 2);

  return [
    "## Executive summary",
    "",
    `**Takeaway:** ${verdict}`,
    "",
    "Targets (above) say whether each skill tier reaches the levels it should; the rankings below say which upgrades move that. Rankings use singles Δ board progress vs the no-upgrade arm (one row per upgrade at its strongest level). `*` / “separated” means 95% intervals do not overlap. Build value is mean level reached when taken vs offered and passed (`casual` is least biased).",
    "",
    "### Most overperforming",
    "",
    ...list(
      pickLeads(leads, "over").map((l) => formatLead(l, summary)),
      leads.length === 0 ? "No singles data." : "No positive singles Δ to report.",
    ),
    "### Most underperforming",
    "",
    ...list(
      pickLeads(leads, "under").map((l) => formatLead(l, summary)),
      leads.length === 0 ? "No singles data." : "No negative singles Δ to report.",
    ),
    "### Watchouts",
    "",
    ...list(watchouts, "Nothing jumped out beyond the upgrade rankings."),
  ];
}

export function renderReport(summary: Summary): string {
  const h = summary.health;
  const banner = [
    ...(h.untrustworthy
      ? [
          `> **UNTRUSTWORTHY:** ${h.stalled} of ${h.episodes} episodes stalled (over ${pct(STALL_LIMIT)}).`,
          "",
        ]
      : []),
    ...(summary.partial
      ? ["> **PARTIAL:** the run was interrupted; only finished episodes are counted.", ""]
      : []),
  ];
  return [
    `# Balance report: ${summary.preset}`,
    "",
    ...banner,
    `Commit \`${summary.gitSha}\`, ${summary.createdAt}. Budget: ${summary.budgetHours === null ? "fixed" : `${summary.budgetHours} h`}.`,
    `Seeds per arm: ${Object.entries(summary.seedsPerArm)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ")}.`,
    "",
    "## Health",
    "",
    ...table(
      ["Episodes", "Stalled", "Errors", "Store stalls"],
      [[String(h.episodes), String(h.stalled), String(h.errors), String(h.storeStalls)]],
    ),
    ...h.errorSamples.map((e) => `- ${e}`),
    ...(h.errorSamples.length > 0 ? [""] : []),
    ...targetsSection(summary),
    ...executiveSummarySection(summary),
    ...buildsSection(summary),
    ...singlesSection(summary),
    ...pairsSection(summary),
    ...schoolsSection(summary),
    ...enemiesSection(summary),
    ...spreadSection(summary),
  ].join("\n");
}

export function compareSummaries(before: Summary, after: Summary): string {
  if (before.version !== after.version) {
    throw new Error(`Cannot compare summary versions ${before.version} and ${after.version}`);
  }
  const rows: { key: string; profile: string; metric: string; from: Interval; to: Interval }[] = [];
  for (const [key, byProfile] of Object.entries(after.arms)) {
    for (const [profile, metrics] of Object.entries(byProfile)) {
      const old = before.arms[key]?.[profile];
      if (old === undefined) {
        continue;
      }
      for (const metric of ["clearRate", "progress", "deaths", "levelReached"] as const) {
        if (separated(old[metric], metrics[metric])) {
          rows.push({ key, profile, metric, from: old[metric], to: metrics[metric] });
        }
      }
    }
  }
  rows.sort((a, b) => Math.abs(b.to.value - b.from.value) - Math.abs(a.to.value - a.from.value));
  return [
    "# Balance comparison",
    "",
    `Before: \`${before.gitSha}\` ${before.createdAt} (${before.preset}). After: \`${after.gitSha}\` ${after.createdAt} (${after.preset}).`,
    "",
    "Only changes whose 95% intervals do not overlap are listed.",
    "",
    ...(rows.length === 0
      ? ["No metric moved beyond its 95% interval."]
      : table(
          ["Arm", "Profile", "Metric", "Before", "After", "Δ"],
          rows.map((r) => [
            r.key,
            r.profile,
            r.metric,
            ci(r.from),
            ci(r.to),
            num(r.to.value - r.from.value),
          ]),
        )),
  ].join("\n");
}
