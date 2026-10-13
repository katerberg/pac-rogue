import { describe, expect, it } from "vitest";
import { BudgetError, planJobs, presetArms, TESTABLE_UPGRADES } from "./experiments";
import { EXPERT_PROFILE_IDS, PROFILE_IDS } from "./profiles";

const M1_MAX = { buildSeconds: 2.2, forcedSeconds: 0.75, workers: 9 };

function forcedEquivalents(jobs: readonly { experiment: string }[]): number {
  return jobs.reduce((sum, job) => sum + (job.experiment === "builds" ? 3 : 1), 0);
}

describe("presetArms", () => {
  it("builds the full matrix from the testable upgrades", () => {
    const arms = presetArms("full");
    const count = (experiment: string) =>
      arms.filter((arm) => arm.experiment === experiment).length;
    const upgrades = TESTABLE_UPGRADES.length;
    expect(count("singles")).toBe((upgrades * 2 + 1) * 3);
    expect(count("pairs")).toBe((upgrades * (upgrades - 1)) / 2);
    expect(count("schools")).toBe(6 * 2 * 2);
    expect(count("enemies")).toBe(12);
    expect(arms.find((arm) => arm.experiment === "pairs")!.profiles).toEqual(EXPERT_PROFILE_IDS);
    expect(arms.find((arm) => arm.experiment === "builds")!.profiles).toEqual(PROFILE_IDS);
  });

  it("never tests a School Specialist on its own", () => {
    expect(TESTABLE_UPGRADES.some((id) => id.endsWith("Specialist"))).toBe(false);
  });
});

describe("planJobs", () => {
  it("keeps smoke small enough for a few minutes", () => {
    const plan = planJobs({ preset: "smoke", throughput: null, budgetHours: null });
    expect(forcedEquivalents(plan.jobs)).toBeLessThan(1500);
    expect(plan.estimatedSeconds).toBeNull();
  });

  it("fits pilot inside its 30 minute budget", () => {
    const throughput = { buildSeconds: 0.3, forcedSeconds: 0.1, workers: 1 };
    const plan = planJobs({ preset: "pilot", throughput, budgetHours: 0.5 });
    expect(plan.estimatedSeconds!).toBeLessThanOrEqual(0.5 * 3600 * 1.1);
    expect(Math.min(...Object.values(plan.seedsPerArm))).toBeGreaterThanOrEqual(10);
  });

  it("sizes full to six hours on an M1 Max with at least 20 seeds per arm", () => {
    const plan = planJobs({ preset: "full", throughput: M1_MAX, budgetHours: 6 });
    expect(plan.estimatedSeconds!).toBeLessThanOrEqual(6 * 3600 * 1.1);
    expect(Math.min(...Object.values(plan.seedsPerArm))).toBeGreaterThanOrEqual(20);
  });

  it("refuses a budget the minimum seeds cannot fit", () => {
    expect(() => planJobs({ preset: "full", throughput: M1_MAX, budgetHours: 0.5 })).toThrow(
      BudgetError,
    );
  });

  it("filters experiments and profiles", () => {
    const plan = planJobs({
      preset: "smoke",
      throughput: null,
      budgetHours: null,
      only: ["singles"],
      profiles: ["cautious@expert"],
    });
    expect(new Set(plan.jobs.map((job) => job.experiment))).toEqual(new Set(["singles"]));
    expect(new Set(plan.jobs.map((job) => job.profile))).toEqual(new Set(["cautious@expert"]));
  });

  it("uses the same seeds in every arm", () => {
    const plan = planJobs({
      preset: "smoke",
      throughput: null,
      budgetHours: null,
      only: ["singles"],
    });
    const seedsOf = (arm: string) =>
      plan.jobs
        .filter((job) => job.arm === arm && job.profile === "cautious@expert")
        .map((job) => job.seed);
    expect(seedsOf("passiveExtraLife")).toEqual(seedsOf("none"));
  });
});
