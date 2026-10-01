import { query, type World } from "bitecs";
import type { Cell } from "../../domain/bonusBar";
import { worldToCol, worldToRow } from "../../domain/maze";
import { Pellet } from "../components/Pellet";
import { Position } from "../components/Position";

export function pelletAtCell(world: World, cell: Cell): boolean {
  for (const eid of query(world, [Pellet, Position])) {
    if (
      worldToCol(Position.x[eid] ?? 0) === cell.col &&
      worldToRow(Position.y[eid] ?? 0) === cell.row
    ) {
      return true;
    }
  }
  return false;
}
