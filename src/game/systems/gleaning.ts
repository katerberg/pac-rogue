import { query, removeEntity, type World } from "bitecs";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { worldToCol, worldToRow } from "../../domain/maze";
import type { Cell } from "../../domain/pennies";
import { Crumb } from "../components/Crumb";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Pellet } from "../components/Pellet";
import { Position } from "../components/Position";

export function pelletCells(world: World): Cell[] {
  return [...query(world, [Pellet, Position])].map((eid) => ({
    col: worldToCol(Position.x[eid] ?? 0),
    row: worldToRow(Position.y[eid] ?? 0),
  }));
}

export function crumbGhostCells(world: World, edibleGhostEids?: ReadonlySet<number>): Cell[] {
  return [...query(world, [Ghost, GhostPhase, Position])]
    .filter(
      (eid) => GhostPhase.value[eid] === GHOST_PHASE.active && edibleGhostEids?.has(eid) !== true,
    )
    .map((eid) => ({
      col: worldToCol(Position.x[eid] ?? 0),
      row: worldToRow(Position.y[eid] ?? 0),
    }));
}

export function takeCrumbsAt(world: World, cell: Cell | null): number[] {
  if (cell === null) {
    return [];
  }
  const taken = [...query(world, [Crumb, Position])].filter(
    (eid) =>
      worldToCol(Position.x[eid] ?? 0) === cell.col &&
      worldToRow(Position.y[eid] ?? 0) === cell.row,
  );
  for (const eid of taken) {
    removeEntity(world, eid);
  }
  return taken;
}
