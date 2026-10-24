import type { GhostKindId } from "../../../domain/ghostKind";
import { effectiveGhostMode, type GhostAiMode } from "../../../domain/ghostMode";
import { ghostDirStep, pickGhostDirection, type GhostDir } from "../../../domain/ghostPath";
import { cellCenterX, cellCenterY, type SolidGrid } from "../../../domain/maze";
import type { Tuning } from "../../../domain/tuning";
import type { Direction } from "../../components/Input";
import { resolveGhostTarget } from "../../systems/ghostAi";
import type { PowerPelletAffordance } from "./affordances";
import { CARDINALS, neighbor, reverseOf, type CardinalDirection, type Grid } from "./navigate";

const CATCH_TILES = 0.7;
const DISCOUNT = 0.93;
const DEATH_SCORE = -1000;
const NODE_BUDGET = 800;
const SAFE_GAP = 6;
const STRAIGHT_AHEAD = 100;
const SHIELD_BOUNCE_STEPS = 2;
export const SURVIVABLE_SCORE = DEATH_SCORE / 2;

export type PlannerGhost = {
  eid: number;
  kind: GhostKindId;
  col: number;
  row: number;
  dir: GhostDir;
  progress: number;
  speed: number;
  frightenedSteps: number;
  frozenSteps: number;
  delaySteps: number;
  leaving: boolean;
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

export type ModeFlip = { atStep: number; mode: GhostAiMode };

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
  modeFlip: ModeFlip | null;
  pelletsRemaining: number;
  tuning: Tuning;
  invulnSteps: number;
  shields: number;
  speedMul: number;
  speedSteps: number;
  cellSpeedMul: { pellet: number; empty: number };
  pellets: Uint8Array;
  power: Uint8Array;
  fruit: number | null;
  pelletDist: Int32Array;
  depth: number;
  readsGhosts: boolean;
  speedOf: (ghost: PlannerGhost, pelletsRemaining: number) => number;
  affordance: PowerPelletAffordance | null;
};

type Ghost = PlannerGhost;

const colOf = (grid: Grid, cell: number) => cell % grid.cols;
const rowOf = (grid: Grid, cell: number) => Math.floor(cell / grid.cols);

function wrap(grid: Grid, col: number, row: number): { col: number; row: number } {
  return {
    col: ((col % grid.cols) + grid.cols) % grid.cols,
    row: ((row % grid.rows) + grid.rows) % grid.rows,
  };
}

export function tickGhost(
  state: PlannerState,
  ghost: Ghost,
  amount: number,
  elapsedSteps: number,
  player: { col: number; row: number; facing: Direction },
  blinky: { col: number; row: number },
  mode: GhostAiMode = state.mode,
  pelletsRemaining: number = state.pelletsRemaining,
): void {
  if (ghost.delaySteps > 0) {
    ghost.delaySteps -= elapsedSteps;
    if (ghost.delaySteps <= 0) {
      ghost.leaving = false;
      ghost.speed = state.speedOf(ghost, pelletsRemaining);
      decide(state, ghost, player, blinky, mode, pelletsRemaining);
    }
    return;
  }
  if (ghost.frozenSteps > 0) {
    ghost.frozenSteps -= elapsedSteps;
    return;
  }
  if (ghost.frightenedSteps > 0) {
    return;
  }
  advanceGhost(state, ghost, amount, player, blinky, mode, pelletsRemaining);
}

export function advanceGhost(
  state: PlannerState,
  ghost: Ghost,
  amount: number,
  player: { col: number; row: number; facing: Direction },
  blinky: { col: number; row: number },
  mode: GhostAiMode = state.mode,
  pelletsRemaining: number = state.pelletsRemaining,
): void {
  ghost.progress += amount;
  while (ghost.progress >= 1) {
    ghost.progress -= 1;
    const { dx, dy } = ghostDirStep(ghost.dir);
    const next = wrap(state.grid, ghost.col + dx, ghost.row + dy);
    ghost.col = next.col;
    ghost.row = next.row;
    ghost.speed = state.speedOf(ghost, pelletsRemaining);
    decide(state, ghost, player, blinky, mode, pelletsRemaining);
  }
}

function decide(
  state: PlannerState,
  ghost: Ghost,
  player: { col: number; row: number; facing: Direction },
  blinky: { col: number; row: number },
  mode: GhostAiMode,
  pelletsRemaining: number,
): void {
  const { dx, dy } = ghostDirStep(ghost.dir);
  const at = { col: ghost.col, row: ghost.row };
  const target = state.readsGhosts
    ? resolveGhostTarget(
        ghost.eid,
        mode,
        pelletsRemaining,
        { player: { ...player, facing: player.facing as GhostDir }, blinky, tuning: state.tuning },
        at,
      )
    : { col: at.col + dx * STRAIGHT_AHEAD, row: at.row + dy * STRAIGHT_AHEAD };
  ghost.dir = pickGhostDirection({
    x: cellCenterX(at.col),
    y: cellCenterY(at.row),
    facing: ghost.dir,
    targetCol: target.col,
    targetRow: target.row,
    solids: state.ghostSolids,
    canEnter: state.canEnter,
  });
}

function ghostPoint(ghost: Ghost): { x: number; y: number } {
  const { dx, dy } = ghostDirStep(ghost.dir);
  return { x: ghost.col + dx * ghost.progress, y: ghost.row + dy * ghost.progress };
}

function offsets(grid: Grid, a: { x: number; y: number }, b: { x: number; y: number }) {
  const rawX = Math.abs(a.x - b.x);
  const rawY = Math.abs(a.y - b.y);
  return { dx: Math.min(rawX, grid.cols - rawX), dy: Math.min(rawY, grid.rows - rawY) };
}

function gap(grid: Grid, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const { dx, dy } = offsets(grid, a, b);
  return dx + dy;
}

function reach(grid: Grid, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const { dx, dy } = offsets(grid, a, b);
  return Math.hypot(dx, dy);
}

const lethal = (ghost: Ghost) =>
  ghost.frightenedSteps <= 0 && ghost.frozenSteps <= 0 && ghost.delaySteps <= 0;

type Walk = {
  ghosts: Ghost[];
  steps: number;
  score: number;
  eaten: Set<number>;
  pelletsRemaining: number;
  invulnUntil: number;
  shields: number;
  speedMul: number;
  speedUntil: number;
};

function nearestGhosts(
  grid: Grid,
  ghosts: readonly Ghost[],
  at: { x: number; y: number },
): Ghost[] {
  return [...ghosts]
    .filter((ghost) => ghost.delaySteps <= 0)
    .sort((a, b) => reach(grid, at, ghostPoint(a)) - reach(grid, at, ghostPoint(b)));
}

function eatPowerPellet(
  state: PlannerState,
  walk: Walk,
  at: { x: number; y: number },
  weights: PlannerWeights,
  value: number,
): void {
  const power = state.affordance;
  if (power === null) {
    return;
  }
  const grid = state.grid;
  walk.invulnUntil = Math.max(walk.invulnUntil, walk.steps + power.invulnSteps);
  walk.shields += power.shieldGain;
  if (power.speedSteps > 0) {
    walk.speedMul = power.speedMul;
    walk.speedUntil = walk.steps + power.speedSteps;
  }
  if (power.frightSteps > 0) {
    for (const ghost of walk.ghosts) {
      if (ghost.delaySteps <= 0) {
        ghost.frightenedSteps = Math.max(ghost.frightenedSteps, power.frightSteps);
      }
    }
  }
  if (power.freezeSteps > 0) {
    const closest = nearestGhosts(grid, walk.ghosts, at)[0];
    if (closest !== undefined) {
      closest.frozenSteps = Math.max(closest.frozenSteps, power.freezeSteps);
    }
  }
  if (power.recall > 0) {
    const recalled = new Set(
      nearestGhosts(grid, walk.ghosts, at)
        .filter((ghost) => ghost.frozenSteps <= 0)
        .slice(0, power.recall),
    );
    walk.ghosts = walk.ghosts.filter((ghost) => !recalled.has(ghost));
  }
  if (power.warp || power.cornerTeleport) {
    walk.ghosts = walk.ghosts.filter((ghost) => ghost.delaySteps > 0);
  }
  walk.score += value * weights.pellet * power.extraPellets;
}

function stepWorld(
  state: PlannerState,
  walk: Walk,
  from: number,
  to: number,
  facing: Direction,
  weights: PlannerWeights,
): boolean {
  const grid = state.grid;
  const pelletAhead = state.pellets[to] === 1 && !walk.eaten.has(to);
  const slow =
    (pelletAhead ? 1 / 0.9 : 1) /
    (pelletAhead ? state.cellSpeedMul.pellet : state.cellSpeedMul.empty);
  const playerTile = { col: colOf(grid, to), row: rowOf(grid, to), facing };
  const blinky = walk.ghosts.find((ghost) => ghost.blinky) ?? playerTile;
  const fromPoint = { x: colOf(grid, from), y: rowOf(grid, from) };
  const toPoint = { x: playerTile.col, y: playerTile.row };
  const wrapsX = Math.abs(toPoint.x - fromPoint.x) > 1;
  const midPoint = wrapsX
    ? toPoint
    : { x: (fromPoint.x + toPoint.x) / 2, y: (fromPoint.y + toPoint.y) / 2 };
  walk.steps += 1;
  const value = DISCOUNT ** walk.steps;
  const eatsPower = state.power[to] === 1 && !walk.eaten.has(to);
  if (eatsPower) {
    eatPowerPellet(state, walk, toPoint, weights, value);
  }
  const mode = effectiveGhostMode(
    state.modeFlip !== null && walk.steps >= state.modeFlip.atStep
      ? state.modeFlip.mode
      : state.mode,
    walk.pelletsRemaining,
  );
  const playerMul = walk.steps <= walk.speedUntil ? walk.speedMul : 1;
  for (const half of [midPoint, toPoint]) {
    for (const ghost of walk.ghosts) {
      tickGhost(
        state,
        ghost,
        (ghost.speed * slow) / 2 / playerMul,
        0.5,
        playerTile,
        blinky,
        mode,
        walk.pelletsRemaining,
      );
      if (
        walk.steps > walk.invulnUntil &&
        lethal(ghost) &&
        reach(grid, half, ghostPoint(ghost)) < CATCH_TILES + weights.margin
      ) {
        if (walk.shields > 0) {
          walk.shields -= 1;
          walk.invulnUntil = walk.steps + SHIELD_BOUNCE_STEPS;
        } else {
          return false;
        }
      }
    }
  }
  if (!walk.eaten.has(to)) {
    walk.eaten.add(to);
    if (state.pellets[to] === 1) {
      walk.pelletsRemaining -= 1;
    }
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
    if (lethal(ghost)) {
      nearest = Math.min(nearest, gap(grid, endPoint, ghostPoint(ghost)));
    }
  }
  const pelletDist = state.pelletDist[end]!;
  const endgame = 1 + 10 / (state.pelletsRemaining + 1);
  const reachScore = pelletDist < 0 ? 0 : (weights.pellet * endgame) / (1 + pelletDist);
  return walk.score + reachScore + weights.safety * nearest;
}

function cloneWalk(walk: Walk): Walk {
  return {
    ...walk,
    ghosts: walk.ghosts.map((ghost) => ({ ...ghost })),
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
    pelletsRemaining: state.pelletsRemaining,
    invulnUntil: state.invulnSteps,
    shields: state.shields,
    speedMul: state.speedMul,
    speedUntil: state.speedSteps,
  };
  const player = {
    col: colOf(grid, state.start),
    row: rowOf(grid, state.start),
    facing: state.facing,
  };
  const blinky = base.ghosts.find((ghost) => ghost.blinky) ?? player;
  for (const ghost of base.ghosts) {
    tickGhost(
      state,
      ghost,
      (ghost.speed * state.leadSteps) / Math.max(1, state.speedMul),
      state.leadSteps,
      player,
      blinky,
    );
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
