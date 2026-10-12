import { describe, expect, it } from "vitest";
import {
  GLOBAL_SCORE_COLUMNS,
  globalBoardMessage,
  otherTab,
  parseGlobalScores,
  type GlobalScoreRow,
} from "./leaderboard";

const ROW: GlobalScoreRow = {
  pellets: 812,
  reach: 4,
  country: "US",
  receivedAt: "2026-10-12T01:02:03.000Z",
  mine: false,
};

function cells(row: GlobalScoreRow): string[] {
  return GLOBAL_SCORE_COLUMNS.map((column) => column.text(row));
}

describe("leaderboard", () => {
  it("parses a valid board", () => {
    expect(parseGlobalScores({ scores: [ROW, { ...ROW, mine: true }] })).toEqual([
      ROW,
      { ...ROW, mine: true },
    ]);
    expect(parseGlobalScores({ scores: [] })).toEqual([]);
  });

  it("rejects any malformed board", () => {
    expect(parseGlobalScores(null)).toBeNull();
    expect(parseGlobalScores({})).toBeNull();
    expect(parseGlobalScores({ scores: [{ ...ROW, pellets: "812" }] })).toBeNull();
    expect(parseGlobalScores({ scores: [{ ...ROW, country: "<b>" }] })).toBeNull();
    expect(parseGlobalScores({ scores: [{ ...ROW, mine: undefined }] })).toBeNull();
  });

  it("shows pellets, level reached, date and country, with WIN for a finished run", () => {
    expect(cells(ROW)).toEqual(["812", "L4", "2026-10-12", "US"]);
    expect(cells({ ...ROW, reach: 10 })[1]).toBe("WIN");
  });

  it("names every board state that has no rows to show", () => {
    expect(globalBoardMessage({ kind: "loading" })).toBe("LOADING...");
    expect(globalBoardMessage({ kind: "ok", rows: [] })).toBe("NO SCORES YET");
    expect(globalBoardMessage({ kind: "ok", rows: [ROW] })).toBeNull();
    expect(globalBoardMessage({ kind: "offline" })).toBe("GLOBAL OFFLINE");
    expect(globalBoardMessage({ kind: "error" })).toBe("GLOBAL UNAVAILABLE");
  });

  it("toggles between tabs", () => {
    expect(otherTab("local")).toBe("global");
    expect(otherTab("global")).toBe("local");
  });
});
