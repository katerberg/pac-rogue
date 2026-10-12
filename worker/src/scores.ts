import type { GlobalScoreRow } from "../../src/domain/leaderboard";
import { MAX_LEVEL } from "../../src/domain/levelRules";
import { COMPLETE_REACH } from "../../src/domain/runAnalytics";

export const BOARD_LIMIT = 50;

const REACH = `CASE WHEN outcome = 'complete' THEN ${COMPLETE_REACH} ELSE MIN(final_level, ${MAX_LEVEL}) END`;

export const UPSERT_BEST = `INSERT INTO bests (install_id, run_id, pellets, reach, country, received_at)
  SELECT install_id, id, pellets, ${REACH}, country, received_at FROM runs
  WHERE id = ? AND install_id = ? AND hidden_reason IS NULL AND outcome IN ('death', 'complete')
  ON CONFLICT(install_id) DO UPDATE SET
    run_id = excluded.run_id,
    pellets = excluded.pellets,
    reach = excluded.reach,
    country = excluded.country,
    received_at = excluded.received_at
  WHERE excluded.pellets > bests.pellets
    OR (excluded.pellets = bests.pellets AND excluded.reach > bests.reach)`;

export const SELECT_BOARD = `SELECT install_id, pellets, reach, country, received_at FROM bests
  ORDER BY pellets DESC, reach DESC, received_at ASC LIMIT ?`;

export type BoardDbRow = {
  install_id: string;
  pellets: number;
  reach: number;
  country: string;
  received_at: string;
};

export function toBoardRow(row: BoardDbRow, requester: string | null): GlobalScoreRow {
  return {
    pellets: row.pellets,
    reach: row.reach,
    country: row.country,
    receivedAt: row.received_at.slice(0, 10),
    mine: requester !== null && row.install_id === requester,
  };
}
