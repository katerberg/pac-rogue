import { hasComponent, query, type World } from "bitecs";
import { GHOST_KIND } from "../../../domain/ghostKind";
import { GHOST_PHASE } from "../../../domain/ghostPhase";
import { getActiveLayout, worldToCol, worldToRow, type MazeLayout } from "../../../domain/maze";
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
import {
  CARDINALS,
  cellIndex,
  gridFrom,
  neighbor,
  reverseOf,
  type BoardView,
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

  view(sim: PlaySim, ghosts: readonly GhostSample[]): BoardView {
    const world = sim.world;
    const render = sim.renderOptions();
    this.wallPass = render.wallPassActive;
    const { grid, tunnels } = this.grid();
    const layout = getActiveLayout();
    const exitCell = cellIndex(grid, layout.ghostHouseExit.col, layout.ghostHouseExit.row);
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
    const fruit = cellsOf(query(world, [Fruit, Position]))[0] ?? null;
    const playerSpeed =
      playerSpeedPx(sim.tuning) *
      speedLevelMultiplier(sim.currentLevel(), sim.tuning) *
      playerSpeedMultiplier(sim.hud().upgrades);
    const frightened = new Set(render.frightenedGhosts?.eids ?? []);
    return {
      grid,
      pellets: cellsOf(required.length > 0 ? required : regular),
      powerPellets: cellsOf(query(world, [PowerPellet, Position])),
      fruit,
      tunnelCells: tunnels,
      invulnerable: render.playerInvulnRemainingMs > 300,
      ghosts: ghosts.map((ghost) => {
        const cell = cellOf(grid, ghost.x, ghost.y);
        const isFrightened = frightened.has(ghost.eid);
        const frozen = render.frozenGhostEid === ghost.eid;
        const onGrid = cell !== null && grid.open[cell] === 1;
        const behind = reverseOf(ghost.facing);
        return {
          cell: onGrid ? cell : exitCell,
          behind:
            onGrid && CARDINALS.includes(behind as CardinalDirection)
              ? neighbor(grid, cell, behind as CardinalDirection)
              : -1,
          speedRatio: (Math.max(ghost.speed, 1) / playerSpeed) * (frozen ? 0.3 : 1),
          dangerous: ghost.phase !== GHOST_PHASE.inHouse && !isFrightened,
          frightened: isFrightened,
        };
      }),
    };
  }
}
