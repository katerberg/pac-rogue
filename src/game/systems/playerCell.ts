import { query, type World } from "bitecs";
import { worldToCol, worldToRow } from "../../domain/maze";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export function playerCell(world: World): { col: number; row: number } | null {
  const eid = query(world, [Player, Position])[0];
  if (eid === undefined) {
    return null;
  }
  return { col: worldToCol(Position.x[eid] ?? 0), row: worldToRow(Position.y[eid] ?? 0) };
}
