import { query, type World } from "bitecs";
import { reverseGhostDir, type GhostDir } from "../../domain/ghostPath";
import { worldToCol, worldToRow } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Position } from "../components/Position";

export function forceGhostReverse(world: World): void {
  for (const eid of query(world, [Ghost, Facing, Input, Position])) {
    const facing = (Facing.direction[eid] ?? DIRECTION.none) as GhostDir;
    const reversed = reverseGhostDir(facing) as Direction;
    if (reversed === DIRECTION.none) {
      continue;
    }
    Facing.direction[eid] = reversed;
    Input.direction[eid] = reversed;
    Ghost.decidedCol[eid] = worldToCol(Position.x[eid] ?? 0);
    Ghost.decidedRow[eid] = worldToRow(Position.y[eid] ?? 0);
  }
}
