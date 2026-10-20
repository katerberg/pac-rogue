import { describe, expect, it } from "vitest";
import { createRunRandom } from "../../../domain/runRandom";
import { defaultPlayOptions } from "../../../domain/playOptions";
import { pickStartingUpgrade } from "../../../domain/upgrades";
import { PlaySim } from "../playSim";
import { IDLE_INPUT } from "../simInput";
import { FRAME_MS } from "../simTesting";
import { gaussianFrom } from "./bot";
import { runJob } from "./episode";
import { Observer } from "./observe";
import { PERSONAS } from "./profiles";
import { StoreBot } from "./storeBot";

describe("runJob", { timeout: 60_000 }, () => {
  it("replays the same episode from the same job", () => {
    const job = {
      experiment: "singles" as const,
      arm: "passiveExtraLife",
      profile: "casual@average",
      seed: "bal-3",
      level: 5,
      upgrades: ["passiveExtraLife" as const],
    };
    expect(runJob(job)).toEqual(runJob(job));
  });

  it("starts build runs at the level-2 offer with the seeded starting upgrade", () => {
    const seed = "bal-1";
    const result = runJob({ experiment: "builds", arm: "build", profile: "cautious@expert", seed });
    const start = pickStartingUpgrade([], createRunRandom(seed).stream("startingUpgrade"))!;
    expect(result.offers[0]?.level).toBe(2);
    expect(result.levelReached).toBeGreaterThanOrEqual(3);
    expect(result.finalLoadout.some((id) => id.startsWith(start))).toBe(true);
  });

  it("plays differently at different skill tiers on the same seed", () => {
    const job = { experiment: "singles" as const, arm: "none", seed: "bal-4", level: 3 };
    const average = runJob({ ...job, profile: "cautious@average" });
    const expert = runJob({ ...job, profile: "cautious@expert" });
    expect(average.simMs).not.toBe(expert.simMs);
  });

  it("keeps the route search bounded while Wall Pass opens the maze", () => {
    const result = runJob({
      experiment: "schools",
      arm: "school:speed",
      profile: "cautious@expert",
      seed: "bal-0",
      level: 5,
      upgrades: ["passiveAfterburner", "powerPelletWallPass", "powerPelletSpeedBurst"],
    });
    expect(result.outcome).not.toBe("error");
  }, 20_000);

  it("plays one-level tests without stalling", () => {
    const outcomes = ["bal-0", "bal-1", "bal-2"].map(
      (seed) =>
        runJob({
          experiment: "singles",
          arm: "none",
          profile: "speedrunner@expert",
          seed,
          level: 3,
        }).outcome,
    );
    expect(
      outcomes.filter((outcome) => outcome === "clear" || outcome === "death").length,
    ).toBeGreaterThanOrEqual(2);
    expect(outcomes).not.toContain("error");
  });
});

describe("StoreBot", { timeout: 60_000 }, () => {
  it("shops, takes the free life on the way out, then leaves the store", () => {
    const sim = new PlaySim(
      { ...defaultPlayOptions(), store: 1, quarters: 10, lives: 1 },
      "store-bot",
    );
    sim.start();
    const bot = new StoreBot(
      PERSONAS.cautious,
      createRunRandom("store-bot").stream("bot"),
      new Observer(),
    );
    const livesBefore = sim.hud().lives;
    for (let i = 0; i < 60 * 30 && sim.storeState() !== null; i += 1) {
      sim.step({ ...IDLE_INPUT, ...bot.input(sim, FRAME_MS) }, FRAME_MS);
    }
    expect(sim.storeState()).toBeNull();
    expect(sim.hud().lives).toBeGreaterThan(livesBefore);
    expect(bot.purchases).toBeGreaterThan(0);
    expect(bot.stalled).toBe(false);
  });

  it("leaves without buying when nothing is affordable", () => {
    const sim = new PlaySim(
      { ...defaultPlayOptions(), store: 1, quarters: 0, lives: 3 },
      "store-bot-broke",
    );
    sim.start();
    const bot = new StoreBot(
      PERSONAS.cautious,
      createRunRandom("store-bot-broke").stream("bot"),
      new Observer(),
    );
    for (let i = 0; i < 60 * 30 && sim.storeState() !== null; i += 1) {
      sim.step({ ...IDLE_INPUT, ...bot.input(sim, FRAME_MS) }, FRAME_MS);
    }
    expect(sim.storeState()).toBeNull();
    expect(bot.purchases).toBe(0);
    expect(bot.stalled).toBe(false);
  });
});

describe("gaussianFrom", () => {
  it("draws roughly standard normal values", () => {
    const draw = gaussianFrom(createRunRandom("gauss").stream("bot"));
    const values = Array.from({ length: 4000 }, draw);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    expect(Math.abs(mean)).toBeLessThan(0.06);
    expect(sd).toBeGreaterThan(0.93);
    expect(sd).toBeLessThan(1.07);
  });
});
