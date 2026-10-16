import { describe, expect, it } from "vitest";
import {
  candidateSeed,
  candidatesFingerprint,
  decideCandidate,
  emptyCuratorState,
  exportPool,
  keptCount,
  nextUndecidedIndex,
  parseCandidatesFile,
  parseCuratorState,
  remainingCount,
  tunnelRowsFromLayout,
  undoLastDecision,
  type MazeCandidate,
  type MazeCandidatesFile,
} from "./mazeCandidate";

const sampleAscii = ["#.#", "...", "#.#"].join("\n");

function cand(id: number): MazeCandidate {
  return {
    id,
    seed: candidateSeed(id),
    seedUsed: candidateSeed(id),
    ascii: sampleAscii,
    pelletCount: 3,
    tunnels: [1],
  };
}

describe("mazeCandidate", () => {
  it("builds deterministic candidate seeds", () => {
    expect(candidateSeed(0)).toBe("pool-cand-0");
    expect(candidateSeed(42)).toBe("pool-cand-42");
  });

  it("finds tunnel rows from layout edge solids", () => {
    expect(
      tunnelRowsFromLayout({
        cols: 3,
        rows: 3,
        playerSolids: [
          [true, false, true],
          [false, false, false],
          [true, false, true],
        ],
      }),
    ).toEqual([1]);
    expect(
      tunnelRowsFromLayout({
        cols: 3,
        rows: 2,
        playerSolids: [
          [true, true, true],
          [true, false, true],
        ],
      }),
    ).toEqual([]);
  });

  it("fingerprints candidates by generatedAt, count, and seedUsed list", () => {
    const file: MazeCandidatesFile = {
      version: 1,
      generatedAt: "t",
      count: 2,
      candidates: [cand(0), cand(1)],
    };
    expect(candidatesFingerprint(file)).toBe(`t|2|${cand(0).seedUsed}\0${cand(1).seedUsed}`);
  });

  it("parses curator state and resets on fingerprint mismatch", () => {
    const fp = "a|2";
    const stored = JSON.stringify({
      candidatesFingerprint: fp,
      order: [0, 1],
      decisions: { "0": "yes", "1": "no" },
    });
    expect(parseCuratorState(stored, fp).decisions["0"]).toBe("yes");
    expect(parseCuratorState(stored, "other").order).toEqual([]);
    expect(parseCuratorState("not-json", fp).order).toEqual([]);
  });

  it("decides, undoes, and counts keep/remaining", () => {
    const candidates = [cand(0), cand(1), cand(2)];
    let state = emptyCuratorState("fp");
    expect(nextUndecidedIndex(candidates, state)).toBe(0);

    state = decideCandidate(state, 0, "yes");
    state = decideCandidate(state, 1, "no");
    expect(state).toEqual(decideCandidate(state, 0, "no"));
    expect(keptCount(state)).toBe(1);
    expect(remainingCount(candidates, state)).toBe(1);
    expect(nextUndecidedIndex(candidates, state)).toBe(2);

    state = undoLastDecision(state);
    expect(state.decisions["1"]).toBeUndefined();
    expect(nextUndecidedIndex(candidates, state)).toBe(1);
    expect(undoLastDecision(emptyCuratorState("fp"))).toEqual(emptyCuratorState("fp"));
  });

  it("exports only yes decisions", () => {
    const candidates = [cand(0), cand(1), cand(2)];
    let state = emptyCuratorState("fp");
    state = decideCandidate(state, 0, "yes");
    state = decideCandidate(state, 1, "no");
    state = decideCandidate(state, 2, "yes");
    const pool = exportPool(candidates, state, "2020-01-01T00:00:00.000Z");
    expect(pool.count).toBe(2);
    expect(pool.maps.map((m) => m.id)).toEqual([0, 2]);
    expect(pool.exportedAt).toBe("2020-01-01T00:00:00.000Z");
  });

  it("parses a candidates file", () => {
    const file: MazeCandidatesFile = {
      version: 1,
      generatedAt: "t",
      count: 1,
      candidates: [cand(0)],
    };
    expect(parseCandidatesFile(file)?.candidates[0]?.id).toBe(0);
    expect(parseCandidatesFile({ version: 99 })).toBeNull();
    expect(parseCandidatesFile(null)).toBeNull();
    expect(parseCandidatesFile({ ...file, count: 2 })).toBeNull();
    expect(
      parseCandidatesFile({
        ...file,
        count: 2,
        candidates: [cand(0), { ...cand(1), id: 0 }],
      }),
    ).toBeNull();
  });
});
