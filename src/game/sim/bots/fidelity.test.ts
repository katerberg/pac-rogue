import { describe, expect, it } from "vitest";
import { measureGhostPrediction, summarizeFidelity } from "./fidelity";

describe("measureGhostPrediction", { timeout: 180_000 }, () => {
  it("places active ghosts exactly and keeps the prediction error bounded over three seeds", () => {
    const samples = ["fid-1", "fid-2", "fid-3"].flatMap((seed) =>
      measureGhostPrediction({
        profile: "cautious@expert",
        seed,
        level: 5,
        frames: 60 * 90,
        everyFrames: 20,
        horizons: [0, 15, 30, 60],
      }),
    );
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
    expect(summary["h15|phase:active"]!.over2).toBeLessThan(0.1);
    expect(summary["h30|phase:active"]!.over2).toBeLessThan(0.2);
    expect(summary["h60|phase:active"]!.over2).toBeLessThan(0.35);
    expect(summary["h60|phase:leaving"]!.mean).toBeLessThan(3);
    expect(summary["h60|flip:true"]!.mean).toBeLessThan(3);
  });
});
