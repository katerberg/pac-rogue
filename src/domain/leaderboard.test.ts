import { describe, expect, it } from "vitest";
import {
  GLOBAL_SCORE_COLUMNS,
  globalBoardView,
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
    const message = (board: Parameters<typeof globalBoardView>[0]) =>
      globalBoardView(board).emptyMessage;
    expect(message({ kind: "idle" })).toBe("LOADING...");
    expect(message({ kind: "loading" })).toBe("LOADING...");
    expect(message({ kind: "ok", rows: [] })).toBe("NO SCORES YET");
    expect(message({ kind: "offline" })).toBe("GLOBAL OFFLINE");
    expect(message({ kind: "error" })).toBe("GLOBAL UNAVAILABLE");
    expect(globalBoardView({ kind: "error" }).rows).toEqual([]);
  });

  it("finds the player's own row", () => {
    const board = { kind: "ok" as const, rows: [ROW, { ...ROW, mine: true }] };
    expect(globalBoardView(board)).toMatchObject({ rows: board.rows, mineRow: 1 });
    expect(globalBoardView({ kind: "ok", rows: [ROW] }).mineRow).toBeNull();
  });
});
