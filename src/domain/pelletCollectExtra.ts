import { isSolid, worldToCol, worldToRow, type SolidGrid } from "./maze";

export type PelletCollectCandidate = {
  eid: number;
  x: number;
  y: number;
};

type FacingStep = {
  col: number;
  row: number;
};

function forwardCorridorExcludedKeys(
  playerCol: number,
  playerRow: number,
  step: FacingStep,
  solids: SolidGrid,
): Set<string> {
  const excluded = new Set<string>();
  if (step.col === 0 && step.row === 0) {
    return excluded;
  }
  let col = playerCol + step.col;
  let row = playerRow + step.row;
  while (!isSolid(col, row, solids)) {
    excluded.add(`${col},${row}`);
    col += step.col;
    row += step.row;
  }
  return excluded;
}

export function pickClosestOffForwardPelletEids(
  candidates: readonly PelletCollectCandidate[],
  playerX: number,
  playerY: number,
  facingStep: FacingStep,
  solids: SolidGrid,
  count: number,
): number[] {
  if (count <= 0 || candidates.length === 0) {
    return [];
  }

  const excluded = forwardCorridorExcludedKeys(
    worldToCol(playerX),
    worldToRow(playerY),
    facingStep,
    solids,
  );

  const eligible: { eid: number; distSq: number }[] = [];
  for (const candidate of candidates) {
    const key = `${worldToCol(candidate.x)},${worldToRow(candidate.y)}`;
    if (excluded.has(key)) {
      continue;
    }
    const dx = candidate.x - playerX;
    const dy = candidate.y - playerY;
    eligible.push({ eid: candidate.eid, distSq: dx * dx + dy * dy });
  }

  eligible.sort((a, b) => a.distSq - b.distSq || a.eid - b.eid);
  return eligible.slice(0, count).map((entry) => entry.eid);
}
