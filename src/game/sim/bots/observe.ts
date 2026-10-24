import { hasComponent, query, type World } from "bitecs";
import { GHOST_KIND } from "../../../domain/ghostKind";
import { GHOST_PHASE } from "../../../domain/ghostPhase";
import { GHOST_AI_MODE } from "../../../domain/ghostMode";
import { ghostMovementRules } from "../../../domain/ghostMovement";
import { ghostDirStep, type GhostDir } from "../../../domain/ghostPath";
import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  worldToCol,
  worldToRow,
  type MazeLayout,
} from "../../../domain/maze";
import { Facing } from "../../components/Facing";
import { Fruit } from "../../components/Fruit";
import { Ghost } from "../../components/Ghost";
import { GhostKind } from "../../components/GhostKind";
import { GhostPhase } from "../../components/GhostPhase";
import { DIRECTION, type Direction } from "../../components/Input";
import { OptionalPellet } from "../../components/OptionalPellet";
import { Pellet } from "../../components/Pellet";
import { Player } from "../../components/Player";
import { Position } from "../../components/Position";
import { PowerPellet } from "../../components/PowerPellet";
import { playerSpeed as playerSpeedPx } from "../../../domain/playfield";
import { speedLevelMultiplier } from "../../../domain/tuning";
import { playerSpeedMultiplier } from "../../../domain/upgrades";
import { Speed } from "../../components/Speed";
import { nameOf } from "../../systems/worldSnapshot";
import type { PlaySim } from "../playSim";
import type { PlannerState } from "./planner";
import type { SkillTier } from "./profiles";
import {
  CARDINALS,
  cellIndex,
  gridFrom,
  neighbor,
  type CardinalDirection,
  type Grid,
} from "./navigate";

export type GhostSample = {
  eid: number;
  kind: string;
  x: number;
  y: number;
  phase: number;
  speed: number;
  facing: Direction;
};

export function sampleGhosts(world: World): GhostSample[] {
  return Array.from(query(world, [Ghost, Position]), (eid) => ({
    eid,
    kind: nameOf(GHOST_KIND, GhostKind.kind[eid]),
    x: Position.x[eid] ?? 0,
    y: Position.y[eid] ?? 0,
    phase: GhostPhase.value[eid] ?? GHOST_PHASE.inHouse,
    speed: Speed.px[eid] ?? 0,
    facing: (Facing.direction[eid] ?? DIRECTION.none) as Direction,
  }));
}

export function playerEid(world: World): number | undefined {
  return query(world, [Player, Position])[0];
}

type GridCache = { layout: MazeLayout; wallPass: boolean; grid: Grid; tunnels: number[] };

function borderCells(grid: Grid): number[] {
  const cells: number[] = [];
  for (let index = 0; index < grid.open.length; index += 1) {
    const col = index % grid.cols;
    const row = Math.floor(index / grid.cols);
    const onBorder = col === 0 || row === 0 || col === grid.cols - 1 || row === grid.rows - 1;
    if (onBorder && grid.open[index] === 1) {
      cells.push(index);
    }
  }
  return cells;
}

export function cellOf(grid: Grid, x: number, y: number): number | null {
  const col = worldToCol(x);
  const row = worldToRow(y);
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) {
    return null;
  }
  return cellIndex(grid, col, row);
}

export class Observer {
  private cache: GridCache | null = null;
  private wallPass = false;

  grid(wallPass = this.wallPass): { grid: Grid; tunnels: number[] } {
    const layout = getActiveLayout();
    if (this.cache === null || this.cache.layout !== layout || this.cache.wallPass !== wallPass) {
      const grid = gridFrom(wallPass ? layout.wallPassPlayerSolids : layout.playerSolids);
      this.cache = { layout, wallPass, grid, tunnels: borderCells(grid) };
    }
    return this.cache;
  }

  plannerState(
    sim: PlaySim,
    ghosts: readonly GhostSample[],
    decision: { current: number; cell: number; distPx: number; facing: Direction },
    skill: Pick<SkillTier, "depth" | "readsGhosts">,
  ): PlannerState {
    const world = sim.world;
    const render = sim.renderOptions();
    this.wallPass = render.wallPassActive;
    const { grid } = this.grid();
    const layout = getActiveLayout();
    const cellsOf = (eids: Iterable<number>): number[] => {
      const cells: number[] = [];
      for (const eid of eids) {
        const cell = cellOf(grid, Position.x[eid] ?? 0, Position.y[eid] ?? 0);
        if (cell !== null) {
          cells.push(cell);
        }
      }
      return cells;
    };
    const regular = [...query(world, [Pellet, Position])].filter(
      (eid) => !hasComponent(world, eid, PowerPellet),
    );
    const required = regular.filter((eid) => !hasComponent(world, eid, OptionalPellet));
    const pellets = cellsOf(required.length > 0 ? required : regular);
    const powerPellets = cellsOf(query(world, [PowerPellet, Position]));
    const snapshot = sim.snapshot();
    const playerSpeed =
      playerSpeedPx(sim.tuning) *
      speedLevelMultiplier(sim.currentLevel(), sim.tuning) *
      playerSpeedMultiplier(sim.hud().upgrades);
    const stepMs = (layout.tileSize / playerSpeed) * 1000;
    const frightened = render.frightenedGhosts;
    const mark = (cells: readonly number[]) => {
      const set = new Uint8Array(grid.open.length);
      cells.forEach((cell) => (set[cell] = 1));
      return set;
    };
    const exitCell = cellIndex(grid, layout.ghostHouseExit.col, layout.ghostHouseExit.row);
    const rules = ghostMovementRules(GHOST_PHASE.active);
    return {
      grid,
      ghostSolids: rules.solids,
      canEnter: rules.canEnter,
      start: decision.cell,
      current: decision.current,
      facing: decision.facing,
      leadSteps: decision.distPx / layout.tileSize,
      ghosts: ghosts
        .filter((ghost) => ghost.phase !== GHOST_PHASE.inHouse)
        .map((ghost) => {
          const placed = ghostPlacement(grid, ghost, exitCell, layout.tileSize);
          return {
            eid: ghost.eid,
            ...placed,
            speed: render.frozenGhostEid === ghost.eid ? 0 : Math.max(ghost.speed, 1) / playerSpeed,
            frightenedSteps:
              frightened != null && frightened.eids.includes(ghost.eid)
                ? frightened.remainingMs / stepMs
                : 0,
            blinky: ghost.kind === "blinky",
          };
        }),
      mode: GHOST_AI_MODE[snapshot.ghostMode as keyof typeof GHOST_AI_MODE] ?? GHOST_AI_MODE.chase,
      pelletsRemaining: snapshot.pelletsRemaining,
      tuning: sim.tuning,
      invulnSteps: render.playerInvulnRemainingMs / stepMs,
      pellets: mark(pellets),
      power: mark(powerPellets),
      fruit: cellsOf(query(world, [Fruit, Position]))[0] ?? null,
      pelletDist: multiSourceBfs(grid, [...pellets, ...powerPellets]),
      depth: skill.depth,
      readsGhosts: skill.readsGhosts,
    };
  }
}

function ghostPlacement(
  grid: Grid,
  ghost: GhostSample,
  exitCell: number,
  tileSize: number,
): { col: number; row: number; dir: GhostDir; progress: number } {
  const cell = cellOf(grid, ghost.x, ghost.y);
  const dir = (
    CARDINALS.includes(ghost.facing as CardinalDirection) ? ghost.facing : DIRECTION.left
  ) as GhostDir;
  if (cell === null || ghost.phase !== GHOST_PHASE.active) {
    return { col: exitCell % grid.cols, row: Math.floor(exitCell / grid.cols), dir, progress: 0 };
  }
  const col = cell % grid.cols;
  const row = Math.floor(cell / grid.cols);
  const { dx, dy } = ghostDirStep(dir);
  const along = ((ghost.x - cellCenterX(col)) * dx + (ghost.y - cellCenterY(row)) * dy) / tileSize;
  return along >= 0
    ? { col, row, dir, progress: along }
    : { col: col - dx, row: row - dy, dir, progress: 1 + along };
}

function multiSourceBfs(grid: Grid, sources: readonly number[]): Int32Array {
  const dist = new Int32Array(grid.open.length).fill(-1);
  const queue = new Int32Array(grid.open.length);
  let tail = 0;
  for (const cell of sources) {
    if (dist[cell] === -1) {
      dist[cell] = 0;
      queue[tail] = cell;
      tail += 1;
    }
  }
  for (let head = 0; head < tail; head += 1) {
    const at = queue[head]!;
    for (const direction of CARDINALS) {
      const next = neighbor(grid, at, direction);
      if (next !== -1 && dist[next] === -1) {
        dist[next] = dist[at]! + 1;
        queue[tail] = next;
        tail += 1;
      }
    }
  }
  return dist;
}
