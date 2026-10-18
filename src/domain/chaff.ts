import { GHOST_DIR, type GhostDir } from "./ghostPath";
import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  inBounds,
  isWalkable,
  type MazeLayout,
  type MazeTile,
} from "./maze";

export const CHAFF_MS = 5000;
export const CHAFF_ENHANCED_MS = 7000;
export const CHAFF_TILES_PER_SECOND = 6;
export const CHAFF_COLOR = 0xffe066;
export const CHAFF_ALPHA = 0.7;

export type ChaffStep = { dx: number; dy: number };

export type ChaffDecoy = {
  col: number;
  row: number;
  step: ChaffStep;
  progress: number;
};

export type ChaffState = {
  remainingMs: number;
  decoys: ChaffDecoy[];
};

export type ChaffTick = {
  state: ChaffState | null;
  burst: MazeTile[];
};

const STEPS: readonly ChaffStep[] = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

const STILL: ChaffStep = { dx: 0, dy: 0 };

function nearestWalkable(
  target: MazeTile,
  layout: MazeLayout,
  taken: readonly MazeTile[],
): MazeTile {
  let best: MazeTile = layout.playerSpawn;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      if (!isWalkable(col, row, layout.playerSolids)) {
        continue;
      }
      if (taken.some((t) => t.col === col && t.row === row)) {
        continue;
      }
      const dist = (col - target.col) ** 2 + (row - target.row) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = { col, row };
      }
    }
  }
  return best;
}

export function chaffSpawnTiles(
  corners: boolean,
  layout: MazeLayout = getActiveLayout(),
): MazeTile[] {
  const lastCol = layout.cols - 1;
  const lastRow = layout.rows - 1;
  const anchors: MazeTile[] = corners
    ? [
        { col: 0, row: 0 },
        { col: lastCol, row: 0 },
        { col: 0, row: lastRow },
        { col: lastCol, row: lastRow },
      ]
    : [{ col: Math.floor(lastCol / 2), row: Math.floor(lastRow / 2) }];
  const tiles: MazeTile[] = [];
  for (const anchor of anchors) {
    tiles.push(nearestWalkable(anchor, layout, tiles));
  }
  return tiles;
}

export function startChaff(
  durationMs: number,
  corners: boolean,
  layout: MazeLayout = getActiveLayout(),
): ChaffState {
  return {
    remainingMs: durationMs,
    decoys: chaffSpawnTiles(corners, layout).map((tile) => ({
      ...tile,
      step: STILL,
      progress: 0,
    })),
  };
}

function openSteps(decoy: ChaffDecoy, layout: MazeLayout): ChaffStep[] {
  return STEPS.filter(({ dx, dy }) => {
    const col = decoy.col + dx;
    const row = decoy.row + dy;
    return inBounds(col, row) && isWalkable(col, row, layout.playerSolids);
  });
}

function pickStep(decoy: ChaffDecoy, random: () => number, layout: MazeLayout): ChaffStep {
  const open = openSteps(decoy, layout);
  const forward = open.filter((s) => !(s.dx === -decoy.step.dx && s.dy === -decoy.step.dy));
  const choices = forward.length > 0 ? forward : open;
  return choices[Math.floor(random() * choices.length)] ?? STILL;
}

function advanceDecoy(
  decoy: ChaffDecoy,
  deltaMs: number,
  random: () => number,
  layout: MazeLayout,
): ChaffDecoy {
  let next = decoy;
  let progress = decoy.progress + (deltaMs / 1000) * CHAFF_TILES_PER_SECOND;
  if (next.step.dx === 0 && next.step.dy === 0) {
    next = { ...next, step: pickStep(next, random, layout), progress: 0 };
  }
  while (progress >= 1 && (next.step.dx !== 0 || next.step.dy !== 0)) {
    next = { ...next, col: next.col + next.step.dx, row: next.row + next.step.dy };
    next = { ...next, step: pickStep(next, random, layout) };
    progress -= 1;
  }
  return { ...next, progress };
}

export function decoyTile(decoy: ChaffDecoy): MazeTile {
  return decoy.progress < 0.5
    ? { col: decoy.col, row: decoy.row }
    : { col: decoy.col + decoy.step.dx, row: decoy.row + decoy.step.dy };
}

export function decoyPx(decoy: ChaffDecoy): { x: number; y: number } {
  return {
    x:
      cellCenterX(decoy.col) +
      (cellCenterX(decoy.col + decoy.step.dx) - cellCenterX(decoy.col)) * decoy.progress,
    y:
      cellCenterY(decoy.row) +
      (cellCenterY(decoy.row + decoy.step.dy) - cellCenterY(decoy.row)) * decoy.progress,
  };
}

export type ChaffSprite = { x: number; y: number; dx: number; dy: number; remainingMs: number };

export function chaffSprites(state: ChaffState | null): ChaffSprite[] {
  if (state === null) {
    return [];
  }
  return state.decoys.map((decoy) => ({
    ...decoyPx(decoy),
    dx: decoy.step.dx,
    dy: decoy.step.dy,
    remainingMs: state.remainingMs,
  }));
}

export function decoyFacing(decoy: ChaffDecoy): GhostDir {
  const { dx, dy } = decoy.step;
  if (dy < 0) {
    return GHOST_DIR.up;
  }
  if (dy > 0) {
    return GHOST_DIR.down;
  }
  if (dx < 0) {
    return GHOST_DIR.left;
  }
  return dx > 0 ? GHOST_DIR.right : GHOST_DIR.none;
}

export function nearestDecoy(
  decoys: readonly ChaffDecoy[],
  col: number,
  row: number,
): ChaffDecoy | null {
  let best: ChaffDecoy | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const decoy of decoys) {
    const tile = decoyTile(decoy);
    const dist = (tile.col - col) ** 2 + (tile.row - row) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = decoy;
    }
  }
  return best;
}

export function tickChaff(
  state: ChaffState | null,
  deltaMs: number,
  random: () => number,
  touchedTiles: readonly MazeTile[],
  layout: MazeLayout = getActiveLayout(),
): ChaffTick {
  if (state === null) {
    return { state: null, burst: [] };
  }
  const remainingMs = state.remainingMs - Math.max(0, deltaMs);
  if (remainingMs <= 0) {
    return { state: null, burst: state.decoys.map(decoyTile) };
  }
  const burst: MazeTile[] = [];
  const decoys: ChaffDecoy[] = [];
  for (const decoy of state.decoys) {
    const moved = advanceDecoy(decoy, deltaMs, random, layout);
    const tile = decoyTile(moved);
    if (touchedTiles.some((t) => t.col === tile.col && t.row === tile.row)) {
      burst.push(tile);
    } else {
      decoys.push(moved);
    }
  }
  return decoys.length === 0 ? { state: null, burst } : { state: { remainingMs, decoys }, burst };
}
