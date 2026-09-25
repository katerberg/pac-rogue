import { query, type World } from "bitecs";
import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  oppositeTunnelCell,
  tunnelMouthOutwardEdge,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { Facing } from "../components/Facing";
import { DIRECTION } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

const OUTWARD_DIRECTION = {
  up: DIRECTION.up,
  down: DIRECTION.down,
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
  const edge = tunnelMouthOutwardEdge(col, row, getActiveLayout().playerSolids);
  if (edge === null || Facing.direction[eid] !== OUTWARD_DIRECTION[edge]) {
    return;
  }

  const opposite = oppositeTunnelCell(col, row);
  if (opposite === null) {
    return;
  }

  Position.x[eid] = cellCenterX(opposite.col);
  Position.y[eid] = cellCenterY(opposite.row);
}
