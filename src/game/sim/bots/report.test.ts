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
      "## Executive summary",
      "### Most overperforming",
      "### Most underperforming",
      "### Watchouts",
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

  it("ranks over and under performers in the executive summary", () => {
    const many = (arm: string, profile: string, progress: number, n = 40) =>
      Array.from({ length: n }, (_, i) =>
        result(
          {
            arm,
            profile,
            seed: `${arm}-${profile}-${i}`,
            upgrades: arm === "none" ? [] : ([arm] as Job["upgrades"]),
          },
          { progress: progress + (i % 2) * 0.005 },
        ),
      );
    const batch = [
      ...many("none", "cautious@average", 0.4),
      ...many("none", "casual@expert", 0.45),
      ...many("passiveGhostSlow", "cautious@average", 0.85),
      ...many("passiveGhostSlow", "casual@expert", 0.9),
      ...many("passiveExtraLife", "cautious@average", 0.25),
      ...many("passiveExtraLife", "casual@expert", 0.3),
      result(
        { experiment: "builds", arm: "build", profile: "casual@expert", level: undefined },
        {
          levelReached: 7,
          offers: [
            {
              level: 2,
              offered: ["passiveGhostSlow", "passiveExtraLife"],
              took: "passiveGhostSlow",
            },
          ],
          finalLoadout: ["passiveGhostSlow"],
        },
      ),
      ...Array.from({ length: 20 }, (_, i) =>
        result(
          {
            experiment: "builds",
            arm: "build",
            profile: "casual@expert",
            seed: `build-pass-${i}`,
            level: undefined,
          },
          {
            levelReached: 4,
            offers: [
              {
                level: 2,
                offered: ["passiveGhostSlow", "passiveExtraLife"],
                took: "passiveExtraLife",
              },
            ],
            finalLoadout: ["passiveExtraLife"],
          },
        ),
      ),
    ];
    const report = renderReport(
      summarize(batch, { ...meta, seedsPerArm: { ...meta.seedsPerArm, singles: 60 } }),
    );
    expect(report).toContain("**Takeaway:** OK — health gate passed.");
    const overIdx = report.indexOf("### Most overperforming");
    const underIdx = report.indexOf("### Most underperforming");
    const overBlock = report.slice(overIdx, underIdx);
    const underBlock = report.slice(underIdx, report.indexOf("### Watchouts"));
    expect(overBlock).toContain("passiveGhostSlow");
    expect(overBlock).toContain("mean Δ progress");
    expect(underBlock).toContain("passiveExtraLife");
  });

  it("flags thin samples in the takeaway", () => {
    const report = renderReport(summarize(results, meta));
    expect(report).toContain("thin sample");
  });

  it("calls out difficulty spikes in watchouts", () => {
    const builds = Array.from({ length: 30 }, (_, i) =>
      result(
        {
          experiment: "builds",
          arm: "build",
          profile: "cautious@average",
          seed: `curve-${i}`,
          level: undefined,
        },
        {
          levelReached: i < 25 ? 5 : 7,
          progress: i < 25 ? 0.5 : 1,
          deaths:
            i < 25
              ? [
                  { level: 5, ghost: "blinky", ghostMode: "chase" },
                  { level: 5, ghost: "blinky", ghostMode: "chase" },
                ]
              : [],
          offers: [],
          finalLoadout: [],
        },
      ),
    );
    const report = renderReport(summarize(builds, meta));
    expect(report).toContain("**Difficulty spike");
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
