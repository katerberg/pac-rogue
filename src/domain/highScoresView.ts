import type { RunHistory } from "./runHistory";

export type HighScoreRow = {
  score: number;
  dateLabel: string;
  clearedAt: string;
};

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

export function dateLabelFromClearedAt(clearedAt: string): string {
  const match = ISO_DATE_PREFIX.exec(clearedAt);
  if (match === null) {
    return "????-??-??";
  }
  return match[0];
}

export function toHighScoreRows(history: RunHistory): HighScoreRow[] {
  return history.runs
    .map((run) => ({
      score: run.score,
      clearedAt: run.clearedAt,
      dateLabel: dateLabelFromClearedAt(run.clearedAt),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.clearedAt.localeCompare(a.clearedAt);
    });
}

export function formatHighScoreLine(row: HighScoreRow): string {
  return `${row.score}  ${row.dateLabel}`;
}
