import { describe, expect, it } from "vitest";
import { pickUniformPelletEids } from "./pelletCollectExtra";

describe("pickUniformPelletEids", () => {
  it("returns empty when count is non-positive or candidates empty", () => {
    expect(pickUniformPelletEids([1, 2, 3], 0, () => 0)).toEqual([]);
    expect(pickUniformPelletEids([1, 2, 3], -1, () => 0)).toEqual([]);
    expect(pickUniformPelletEids([], 3, () => 0)).toEqual([]);
  });

  it("returns all candidates when fewer than count remain", () => {
    expect(pickUniformPelletEids([10, 20], 3, () => 0)).toEqual([10, 20]);
  });

  it("picks exactly count without replacement", () => {
    const picked = pickUniformPelletEids([1, 2, 3, 4, 5], 3, () => 0);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
    for (const eid of picked) {
      expect([1, 2, 3, 4, 5]).toContain(eid);
    }
  });

  it("is deterministic for a seeded rng sequence", () => {
    const values = [0.9, 0.1, 0.5];
    let i = 0;
    const rng = () => values[i++]!;
    expect(pickUniformPelletEids([10, 20, 30, 40], 3, rng)).toEqual([40, 10, 30]);
  });

  it("never exceeds the candidate set", () => {
    const candidates = [7, 8, 9];
    const picked = pickUniformPelletEids(candidates, 99, () => 0.5);
    expect(picked).toHaveLength(3);
    expect(picked.sort((a, b) => a - b)).toEqual([7, 8, 9]);
  });
});
