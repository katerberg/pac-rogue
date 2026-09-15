import { query, type World } from "bitecs";
import { pickGhostDirection, type GhostDir } from "../../domain/ghostPath";
import type { GhostAiMode } from "../../domain/ghostMode";
import { blinkyTarget, GHOST_PHASE } from "../../domain/ghostTarget";
import {
  MAZE_GHOST_SOLIDS,
  TURN_ALIGN_EPS,
  isAlignedForTurn,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

function playerTile(world: World): { col: number; row: number } {
  const players = query(world, [Player, Position]);
  const eid = players[0];
  if (eid === undefined) {
    return { col: 0, row: 0 };
  }
  return {
    col: worldToCol(Position.x[eid] ?? 0),
    row: worldToRow(Position.y[eid] ?? 0),
  };
}

export function ghostAi(world: World, mode: GhostAiMode, pelletsRemaining: number): void {
  const player = playerTile(world);

  for (const eid of query(world, [Ghost, GhostPhase, Position, Input, Facing])) {
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
    if (phase === GHOST_PHASE.inHouse) {
      continue;
    }

    const x = Position.x[eid] ?? 0;
    const y = Position.y[eid] ?? 0;
    if (!isAlignedForTurn(x, y, TURN_ALIGN_EPS)) {
      continue;
    }

    const target = blinkyTarget({
      phase,
      mode,
      pelletsRemaining,
      playerCol: player.col,
      playerRow: player.row,
    });

    const facing = (Facing.direction[eid] ?? DIRECTION.none) as GhostDir;
    const next = pickGhostDirection({
      x,
      y,
      facing,
      targetCol: target.col,
      targetRow: target.row,
      solids: MAZE_GHOST_SOLIDS,
    }) as Direction;

    if (next !== DIRECTION.none) {
      Input.direction[eid] = next;
    }
  }
}
