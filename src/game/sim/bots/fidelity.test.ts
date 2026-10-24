import { describe, expect, it } from "vitest";
import { measureGhostPrediction, summarizeFidelity } from "./fidelity";

describe("measureGhostPrediction", { timeout: 120_000 }, () => {
  it("places active ghosts exactly and predicts a quarter second within a tile", () => {
    const samples = measureGhostPrediction({
      profile: "cautious@expert",
      seed: "fid-1",
      level: 5,
      frames: 60 * 90,
      everyFrames: 20,
      horizons: [0, 15, 30, 60],
    });
    const summary = summarizeFidelity(samples);
    if (process.env.FIDELITY_DEBUG) {
      for (const [key, b] of Object.entries(summary).sort(([a], [c]) => a.localeCompare(c))) {
        console.log(
          key.padEnd(28),
          `n=${b.n}`,
          `mean=${b.mean.toFixed(2)}`,
          `>2=${(b.over2 * 100).toFixed(0)}%`,
        );
      }
    }
    expect(summary["h0|phase:active"]!.mean).toBeLessThan(0.01);
    expect(summary["h15|phase:active"]!.mean).toBeLessThan(1);
  });
});
