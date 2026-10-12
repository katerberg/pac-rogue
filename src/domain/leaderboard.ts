import { dateLabelFromRecordedAt, type HighScoreColumn } from "./highScoresView";
import { formatReach } from "./runAnalytics";

export type GlobalScoreRow = {
  pellets: number;
  reach: number;
  country: string;
  receivedAt: string;
  mine: boolean;
};

export type ScoreTab = "local" | "global";

export type GlobalBoard =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; rows: GlobalScoreRow[] }
  | { kind: "offline" }
  | { kind: "error" };

export const GLOBAL_SCORE_COLUMNS: readonly HighScoreColumn<GlobalScoreRow>[] = [
  { id: "pellets", header: "PELLETS", align: "right", text: (row) => String(row.pellets) },
  { id: "level", header: "LVL", align: "right", text: (row) => formatReach(row.reach) },
  {
    id: "date",
    header: "DATE",
    align: "left",
    text: (row) => dateLabelFromRecordedAt(row.receivedAt),
  },
  { id: "country", header: "CC", align: "left", text: (row) => row.country },
];

function isScoreRow(value: unknown): value is GlobalScoreRow {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    Number.isInteger(row.pellets) &&
    Number.isInteger(row.reach) &&
    typeof row.country === "string" &&
    /^[A-Z]{2}$/.test(row.country) &&
    typeof row.receivedAt === "string" &&
    typeof row.mine === "boolean"
  );
}

export function parseGlobalScores(json: unknown): GlobalScoreRow[] | null {
  if (json === null || typeof json !== "object") {
    return null;
  }
  const { scores } = json as Record<string, unknown>;
  return Array.isArray(scores) && scores.every(isScoreRow) ? scores : null;
}

export function otherTab(tab: ScoreTab): ScoreTab {
  return tab === "local" ? "global" : "local";
}

export function globalBoardMessage(board: GlobalBoard): string | null {
  switch (board.kind) {
    case "idle":
    case "loading":
      return "LOADING...";
    case "ok":
      return board.rows.length === 0 ? "NO SCORES YET" : null;
    case "offline":
      return "GLOBAL OFFLINE";
    case "error":
      return "GLOBAL UNAVAILABLE";
  }
}
