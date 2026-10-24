import { ghostDirStep, pickGhostDirection, type GhostDir } from "../../../domain/ghostPath";
import type { GhostAiMode } from "../../../domain/ghostMode";
import { cellCenterX, cellCenterY, type SolidGrid } from "../../../domain/maze";
import type { Tuning } from "../../../domain/tuning";
import type { Direction } from "../../components/Input";
import { resolveGhostTarget } from "../../systems/ghostAi";
import { CARDINALS, neighbor, reverseOf, type CardinalDirection, type Grid } from "./navigate";

const CATCH_TILES = 0.75;
const DISCOUNT = 0.93;
const DEATH_SCORE = -1000;
const NODE_BUDGET = 800;
const SAFE_GAP = 6;
export const SURVIVABLE_SCORE = DEATH_SCORE / 2;

export type PlannerGhost = {
  eid: number;
  col: number;
  row: number;
  dir: GhostDir;
  progress: number;
  speed: number;
  frightenedSteps: number;
  blinky: boolean;
};

export type PlannerWeights = {
  pellet: number;
  power: number;
  fruit: number;
  frightChase: number;
  safety: number;
  margin: number;
};

export type PlannerState = {
  grid: Grid;
  ghostSolids: SolidGrid;
  canEnter: (x: number, y: number, dx: number, dy: number) => boolean;
  start: number;
  current: number;
  facing: Direction;
  leadSteps: number;
  ghosts: readonly PlannerGhost[];
  mode: GhostAiMode;
  pelletsRemaining: number;
  tuning: Tuning;
  invulnSteps: number;
  pellets: Uint8Array;
  power: Uint8Array;
  fruit: number | null;
  pelletDist: Int32Array;
  depth: number;
  readsGhosts: boolean;
};

const STRAIGHT_AHEAD = 100;

type Ghost = PlannerGhost;

const colOf = (grid: Grid, cell: number) => cell % grid.cols;
const rowOf = (grid: Grid, cell: number) => Math.floor(cell / grid.cols);

function wrap(grid: Grid, col: number, row: number): { col: number; row: number } {
  return {
    col: ((col % grid.cols) + grid.cols) % grid.cols,
    row: ((row % grid.rows) + grid.rows) % grid.rows,
  };
}

export function advanceGhost(
  state: PlannerState,
  ghost: Ghost,
  amount: number,
  player: { col: number; row: number; facing: Direction },
  blinky: { col: number; row: number },
): void {
  ghost.progress += amount;
  while (ghost.progress >= 1) {
    ghost.progress -= 1;
    const { dx, dy } = ghostDirStep(ghost.dir);
    const next = wrap(state.grid, ghost.col + dx, ghost.row + dy);
    ghost.col = next.col;
    ghost.row = next.row;
    const target = state.readsGhosts
      ? resolveGhostTarget(
          ghost.eid,
          state.mode,
          state.pelletsRemaining,
          {
            player: { ...player, facing: player.facing as GhostDir },
            blinky,
            tuning: state.tuning,
          },
          next,
        )
      : { col: next.col + dx * STRAIGHT_AHEAD, row: next.row + dy * STRAIGHT_AHEAD };
    ghost.dir = pickGhostDirection({
      x: cellCenterX(next.col),
      y: cellCenterY(next.row),
      facing: ghost.dir,
      targetCol: target.col,
      targetRow: target.row,
      solids: state.ghostSolids,
      canEnter: state.canEnter,
    });
  }
}

function ghostPoint(ghost: Ghost): { x: number; y: number } {
  const { dx, dy } = ghostDirStep(ghost.dir);
  return { x: ghost.col + dx * ghost.progress, y: ghost.row + dy * ghost.progress };
}

function gap(grid: Grid, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const rawX = Math.abs(a.x - b.x);
  const rawY = Math.abs(a.y - b.y);
  return Math.min(rawX, grid.cols - rawX) + Math.min(rawY, grid.rows - rawY);
}

type Walk = {
  ghosts: Ghost[];
  steps: number;
  score: number;
  eaten: Set<number>;
};

function stepWorld(
  state: PlannerState,
  walk: Walk,
  from: number,
  to: number,
  facing: Direction,
  weights: PlannerWeights,
): boolean {
  const grid = state.grid;
  const slow = state.pellets[to] === 1 && !walk.eaten.has(to) ? 1 / 0.9 : 1;
  const playerTile = { col: colOf(grid, to), row: rowOf(grid, to), facing };
  const blinky = walk.ghosts.find((ghost) => ghost.blinky) ?? playerTile;
  const fromPoint = { x: colOf(grid, from), y: rowOf(grid, from) };
  const toPoint = { x: playerTile.col, y: playerTile.row };
  const wrapsX = Math.abs(toPoint.x - fromPoint.x) > 1;
  const midPoint = wrapsX
    ? toPoint
    : { x: (fromPoint.x + toPoint.x) / 2, y: (fromPoint.y + toPoint.y) / 2 };
  walk.steps += 1;
  const vulnerable = walk.steps > state.invulnSteps;
  for (const half of [midPoint, toPoint]) {
    for (const ghost of walk.ghosts) {
      if (ghost.frightenedSteps > 0) {
        continue;
      }
      advanceGhost(state, ghost, (ghost.speed * slow) / 2, playerTile, blinky);
      if (vulnerable && gap(grid, half, ghostPoint(ghost)) < CATCH_TILES + weights.margin) {
        return false;
      }
    }
  }
  const value = DISCOUNT ** walk.steps;
  if (!walk.eaten.has(to)) {
    walk.eaten.add(to);
    walk.score +=
      value * (state.pellets[to] === 1 ? weights.pellet : 0) +
      value * (state.power[to] === 1 ? weights.power : 0) +
      value * (state.fruit === to ? weights.fruit : 0);
  }
  for (const ghost of walk.ghosts) {
    if (ghost.frightenedSteps > 0) {
      ghost.frightenedSteps -= 1;
      if (gap(grid, toPoint, ghostPoint(ghost)) < 1) {
        walk.score += value * weights.frightChase;
      }
    }
  }
  return true;
}

function finalScore(state: PlannerState, walk: Walk, end: number, weights: PlannerWeights): number {
  const grid = state.grid;
  const endPoint = { x: colOf(grid, end), y: rowOf(grid, end) };
  let nearest = SAFE_GAP;
  for (const ghost of walk.ghosts) {
    if (ghost.frightenedSteps <= 0) {
      nearest = Math.min(nearest, gap(grid, endPoint, ghostPoint(ghost)));
    }
  }
  const pelletDist = state.pelletDist[end]!;
  const endgame = 1 + 10 / (state.pelletsRemaining + 1);
  const reach = pelletDist < 0 ? 0 : (weights.pellet * endgame) / (1 + pelletDist);
  return walk.score + reach + weights.safety * nearest;
}

function cloneWalk(walk: Walk): Walk {
  return {
    ghosts: walk.ghosts.map((ghost) => ({ ...ghost })),
    steps: walk.steps,
    score: walk.score,
    eaten: new Set(walk.eaten),
  };
}

function search(
  state: PlannerState,
  walk: Walk,
  cell: number,
  facing: Direction,
  remaining: number,
  weights: PlannerWeights,
  budget: { nodes: number },
): number {
  if (remaining === 0 || budget.nodes <= 0) {
    return finalScore(state, walk, cell, weights);
  }
  const back = reverseOf(facing);
  const options = CARDINALS.filter((dir) => dir !== back && neighbor(state.grid, cell, dir) !== -1);
  const moves =
    options.length === 0
      ? CARDINALS.filter((dir) => neighbor(state.grid, cell, dir) !== -1)
      : options;
  let best = DEATH_SCORE + walk.steps;
  for (const dir of moves) {
    const branch = moves.length === 1 ? walk : cloneWalk(walk);
    const next = neighbor(state.grid, cell, dir);
    budget.nodes -= 1;
    const alive = stepWorld(state, branch, cell, next, dir, weights);
    const value = alive
      ? search(state, branch, next, dir, remaining - 1, weights, budget)
      : DEATH_SCORE + branch.steps;
    best = Math.max(best, value);
  }
  return best;
}

export type PlannedExit = { direction: CardinalDirection; score: number };

export function planExits(state: PlannerState, weights: PlannerWeights): PlannedExit[] {
  const grid = state.grid;
  const base: Walk = {
    ghosts: state.ghosts.map((ghost) => ({ ...ghost })),
    steps: 0,
    score: 0,
    eaten: new Set(),
  };
  const player = {
    col: colOf(grid, state.start),
    row: rowOf(grid, state.start),
    facing: state.facing,
  };
  const blinky = base.ghosts.find((ghost) => ghost.blinky) ?? player;
  for (const ghost of base.ghosts.filter((g) => g.frightenedSteps <= 0)) {
    advanceGhost(state, ghost, ghost.speed * state.leadSteps, player, blinky);
  }
  const reverse = reverseOf(state.facing);
  const exits = CARDINALS.filter((dir) => neighbor(grid, state.start, dir) !== -1);
  return exits.map((direction) => {
    const walk = cloneWalk(base);
    const from =
      direction === reverse && state.current !== state.start ? state.current : state.start;
    const next =
      direction === reverse && state.current !== state.start
        ? neighbor(grid, state.current, direction)
        : neighbor(grid, state.start, direction);
    if (next === -1) {
      return { direction, score: DEATH_SCORE };
    }
    const alive = stepWorld(state, walk, from, next, direction, weights);
    const score = alive
      ? search(state, walk, next, direction, state.depth - 1, weights, {
          nodes: NODE_BUDGET / exits.length,
        })
      : DEATH_SCORE + walk.steps;
    return { direction, score };
  });
}
