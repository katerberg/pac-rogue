import { query, type World } from "bitecs";
import { reverseGhostDir, type GhostDir } from "../../domain/ghostPath";
import { worldToCol, worldToRow } from "../../domain/maze";
import { agentLog } from "../../debug/agentLog";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
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
    const col = worldToCol(Position.x[eid] ?? 0);
    const row = worldToRow(Position.y[eid] ?? 0);
    // #region agent log
    agentLog({
      hypothesisId: "B",
      location: "ghostReverse.ts:forceGhostReverse",
      message: "mode reverse lock tile",
      data: {
        eid,
        kind: GhostKind.kind[eid] ?? -1,
        col,
        row,
        facing,
        reversed,
      },
    });
    // #endregion
    Facing.direction[eid] = reversed;
    Input.direction[eid] = reversed;
    Ghost.decidedCol[eid] = col;
    Ghost.decidedRow[eid] = row;
  }
}
