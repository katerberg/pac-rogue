import { describe, expect, it } from "vitest";
import { pickEchoBases, tickEchoes } from "./echo";

describe("pickEchoBases", () => {
  const bases = ["powerPelletInvuln", "powerPelletFreeze", "powerPelletWallPass"] as const;

  it("picks one base by the rng roll", () => {
    expect(pickEchoBases("one", bases, () => 0)).toEqual(["powerPelletInvuln"]);
    expect(pickEchoBases("one", bases, () => 0.5)).toEqual(["powerPelletFreeze"]);
    expect(pickEchoBases("one", bases, () => 0.999)).toEqual(["powerPelletWallPass"]);
  });

  it("picks every base when echoing all", () => {
    expect(pickEchoBases("all", bases, () => 0)).toEqual([...bases]);
  });

  it("picks nothing without Echo or without bases", () => {
    expect(pickEchoBases(null, bases, () => 0)).toEqual([]);
    expect(pickEchoBases("one", [], () => 0)).toEqual([]);
  });
});

describe("tickEchoes", () => {
  it("counts down and releases due echoes in queue order", () => {
    const pending = [
      { remainingMs: 100, bases: ["powerPelletInvuln"] as const },
      { remainingMs: 300, bases: ["powerPelletFreeze"] as const },
      { remainingMs: 50, bases: ["powerPelletWallPass"] as const },
    ];
    const tick = tickEchoes(pending, 100);
    expect(tick.ready).toEqual([["powerPelletInvuln"], ["powerPelletWallPass"]]);
    expect(tick.pending).toEqual([{ remainingMs: 200, bases: ["powerPelletFreeze"] }]);
  });

  it("ignores negative deltas", () => {
    const pending = [{ remainingMs: 100, bases: ["powerPelletInvuln"] as const }];
    expect(tickEchoes(pending, -50).pending).toEqual(pending);
  });
});
