import { describe, expect, it } from "vitest";
import type { EpisodeResult, Job } from "./episode";
import {
  compareSummaries,
  pairSynergies,
  renderReport,
  rerunPairs,
  summarize,
  type SummaryMeta,
} from "./report";

const meta: SummaryMeta = {
  gitSha: "abc1234",
  createdAt: "2026-10-13T00:00:00.000Z",
  preset: "smoke",
  budgetHours: null,
  seedsPerArm: { builds: 2, singles: 2, pairs: 2, schools: 2, enemies: 2 },
  partial: false,
};

function result(job: Partial<Job>, overrides: Partial<EpisodeResult> = {}): EpisodeResult {
  return {
    job: {
      experiment: "singles",
      arm: "none",
      profile: "cautious@average",
      seed: "bal-0",
      level: 5,
      ...job,
    },
    outcome: "death",
    levelReached: 5,
    progress: 0.5,
    simMs: 60_000,
    deaths: [{ level: 5, ghost: "blinky", ghostMode: "chase" }],
    ghostOutMs: { blinky: 60_000 },
    offers: [],
    finalLoadout: [],
    quartersSpent: 0,
    storeStall: false,
    ...overrides,
  };
}

const results: EpisodeResult[] = [
  result({ arm: "none" }, { progress: 0.4 }),
  result({ arm: "passiveExtraLife", upgrades: ["passiveExtraLife"] }, { progress: 0.5 }),
  result({ arm: "passiveGhostSlow", upgrades: ["passiveGhostSlow"] }, { progress: 0.6 }),
  result(
    { experiment: "pairs", arm: "passiveExtraLife+passiveGhostSlow" },
    { outcome: "clear", progress: 1 },
  ),
  result(
    { experiment: "builds", arm: "build", level: undefined },
    {
      levelReached: 6,
      offers: [
        { level: 2, offered: ["passiveExtraLife", "passiveGhostSlow"], took: "passiveGhostSlow" },
      ],
      finalLoadout: ["powerPelletInvuln", "passiveGhostSlow"],
    },
  ),
];

describe("summarize", () => {
  it("groups arms by profile and counts health", () => {
    const summary = summarize(results, meta);
    expect(summary.health).toMatchObject({
      episodes: 5,
      stalled: 0,
      errors: 0,
      untrustworthy: false,
    });
    expect(
      summary.arms["pairs|passiveExtraLife+passiveGhostSlow|L5"]!["cautious@average"]!.clearRate
        .value,
    ).toBe(1);
    expect(summary.ghosts["cautious@average"]!.blinky!.perMinute).toBeCloseTo(1, 6);
    expect(summary.builds["cautious@average"]!.levelReached.value).toBe(6);
    expect(summary.builds["cautious@average"]!.curve.find((point) => point.level === 6)).toEqual({
      level: 6,
      reached: 1,
      deaths: 0,
    });
  });

  it("marks a batch with too many stalls as untrustworthy", () => {
    const summary = summarize([result({}, { outcome: "stalled" }), result({})], meta);
    expect(summary.health.untrustworthy).toBe(true);
    expect(renderReport(summary)).toContain("UNTRUSTWORTHY");
  });

  it("computes pair synergy from the single and baseline arms", () => {
    const summary = summarize(results, meta);
    const [entry] = pairSynergies(summary);
    expect(entry!.value).toBeCloseTo(1 - 0.5 - 0.6 + 0.4, 10);
    expect(rerunPairs(summary, 5)).toEqual(["passiveExtraLife+passiveGhostSlow"]);
  });
});

describe("renderReport", () => {
  it("renders every section", () => {
    const report = renderReport(summarize(results, meta));
    for (const heading of [
      "## Health",
      "## Builds",
      "### Difficulty curve",
      "## Singles",
      "## Pairs",
      "## School Specialists",
      "## Enemies",
      "## Cross-profile spread",
    ]) {
      expect(report).toContain(heading);
    }
  });
});

describe("compareSummaries", () => {
  it("reports no changes between identical runs", () => {
    const summary = summarize(results, meta);
    expect(compareSummaries(summary, summary)).toContain("No metric moved");
  });

  it("lists metrics whose intervals separate", () => {
    const many = (progress: number) =>
      Array.from({ length: 40 }, (_, i) =>
        result({ seed: `bal-${i}` }, { progress: progress + (i % 2) * 0.01 }),
      );
    const text = compareSummaries(summarize(many(0.2), meta), summarize(many(0.8), meta));
    expect(text).toContain("singles|none|L5");
    expect(text).toContain("progress");
  });
});
