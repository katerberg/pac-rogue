import { hasComponent, query, removeEntity, type World } from "bitecs";
import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  MAZE_COLS,
  tunnelDashOutwardEdge,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { Facing } from "../components/Facing";
import { DIRECTION } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";

const OUTWARD_DIRECTION = {
  left: DIRECTION.left,
  right: DIRECTION.right,
} as const;

export type TunnelDashResult = {
  sweptPelletEids: number[];
  sweptPowerRemoved: number;
  sweptPowerPositions: { x: number; y: number }[];
};

const NO_DASH: TunnelDashResult = {
  sweptPelletEids: [],
  sweptPowerRemoved: 0,
  sweptPowerPositions: [],
};

export function applyTunnelDash(world: World): TunnelDashResult {
  const eid = query(world, [Player, Position, Facing])[0];
  if (eid === undefined) {
    return NO_DASH;
  }

  const col = worldToCol(Position.x[eid] ?? 0);
  const row = worldToRow(Position.y[eid] ?? 0);
  const solids = getActiveLayout().playerSolids;
  const edge = tunnelDashOutwardEdge(col, row, solids);
  if (edge === null || Facing.direction[eid] !== OUTWARD_DIRECTION[edge]) {
    return NO_DASH;
  }

  const sweepFromCol = edge === "left" ? 0 : col;
  const sweepToCol = edge === "left" ? col : MAZE_COLS - 1;
  const destCol = edge === "left" ? MAZE_COLS - 1 : 0;

  const sweptPelletEids: number[] = [];
  const sweptPowerPositions: { x: number; y: number }[] = [];
  let sweptPowerRemoved = 0;
  for (const pelletEid of query(world, [Pellet, Position])) {
    const pelletRow = worldToRow(Position.y[pelletEid] ?? 0);
    if (pelletRow !== row) {
      continue;
    }
    const pelletCol = worldToCol(Position.x[pelletEid] ?? 0);
    if (pelletCol < sweepFromCol || pelletCol > sweepToCol) {
      continue;
    }
    sweptPelletEids.push(pelletEid);
    if (hasComponent(world, pelletEid, PowerPellet)) {
      sweptPowerRemoved += 1;
      sweptPowerPositions.push({ x: Position.x[pelletEid] ?? 0, y: Position.y[pelletEid] ?? 0 });
    }
  }
  for (const pelletEid of sweptPelletEids) {
    removeEntity(world, pelletEid);
  }

  Position.x[eid] = cellCenterX(destCol);
  Position.y[eid] = cellCenterY(row);

  return { sweptPelletEids, sweptPowerRemoved, sweptPowerPositions };
}
