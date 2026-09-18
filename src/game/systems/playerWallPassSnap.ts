import { query, type World } from "bitecs";
import {
  getActiveLayout,
  isWalkable,
  nearestWalkableCellCenter,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";

export function snapPlayerToNearestWalkable(world: World): void {
  const players = query(world, [Player, Position, Velocity]);
  const eid = players[0];
  if (eid === undefined) {
    return;
  }
  const x = Position.x[eid] ?? 0;
  const y = Position.y[eid] ?? 0;
  const solids = getActiveLayout().playerSolids;
  const col = worldToCol(x);
  const row = worldToRow(y);
  if (isWalkable(col, row, solids)) {
    return;
  }
  const center = nearestWalkableCellCenter(x, y, solids);
  Position.x[eid] = center.x;
  Position.y[eid] = center.y;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
}
