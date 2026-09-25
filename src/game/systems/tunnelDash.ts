import { query, type World } from "bitecs";
import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
  MAZE_COLS,
  tunnelDashOutwardEdge,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { Facing } from "../components/Facing";
import { DIRECTION } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

const OUTWARD_DIRECTION = {
  left: DIRECTION.left,
  right: DIRECTION.right,
} as const;

export function applyTunnelDash(world: World): void {
  const eid = query(world, [Player, Position, Facing])[0];
  if (eid === undefined) {
    return;
  }

  const col = worldToCol(Position.x[eid] ?? 0);
  const row = worldToRow(Position.y[eid] ?? 0);
  const solids = getActiveLayout().playerSolids;
  const edge = tunnelDashOutwardEdge(col, row, solids);
  if (edge === null || Facing.direction[eid] !== OUTWARD_DIRECTION[edge]) {
    return;
  }

  const mirroredCol = MAZE_COLS - 1 - col;
  if (!isWalkable(mirroredCol, row, solids)) {
    return;
  }

  Position.x[eid] = cellCenterX(mirroredCol);
  Position.y[eid] = cellCenterY(row);
}
