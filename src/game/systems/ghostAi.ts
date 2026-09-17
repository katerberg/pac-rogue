import { query, type World } from "bitecs";
import { openGhostDirsAt, pickGhostDirection, type GhostDir } from "../../domain/ghostPath";
import type { GhostAiMode } from "../../domain/ghostMode";
import { ghostMovementRules } from "../../domain/ghostMovement";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { blinkyTarget, clydeTarget, pinkyTarget, GHOST_PHASE } from "../../domain/ghostTarget";
import { TURN_ALIGN_EPS, isAlignedForTurn, worldToCol, worldToRow } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

function playerTileAndFacing(world: World): {
  col: number;
  row: number;
  facing: GhostDir;
} {
  const players = query(world, [Player, Position, Facing]);
  const eid = players[0];
  if (eid === undefined) {
    return { col: 0, row: 0, facing: DIRECTION.none as GhostDir };
  }
  return {
    col: worldToCol(Position.x[eid] ?? 0),
    row: worldToRow(Position.y[eid] ?? 0),
    facing: (Facing.direction[eid] ?? DIRECTION.none) as GhostDir,
  };
}

export function ghostAi(
  world: World,
  mode: GhostAiMode,
  pelletsRemaining: number,
  opts: { ignoreElroy?: boolean } = {},
): void {
  const player = playerTileAndFacing(world);

  for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Position, Input, Facing])) {
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
    if (phase === GHOST_PHASE.inHouse) {
      continue;
    }

    const x = Position.x[eid] ?? 0;
    const y = Position.y[eid] ?? 0;
    const kind = (GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId;
    if (!isAlignedForTurn(x, y, TURN_ALIGN_EPS)) {
      continue;
    }

    const col = worldToCol(x);
    const row = worldToRow(y);
    const rules = ghostMovementRules(phase);
    const facingNow = (Facing.direction[eid] ?? DIRECTION.none) as GhostDir;
    const alreadyDecided = Ghost.decidedCol[eid] === col && Ghost.decidedRow[eid] === row;
    if (alreadyDecided) {
      const opens = openGhostDirsAt(x, y, rules.solids, rules.canEnter);
      if (facingNow === DIRECTION.none || opens.includes(facingNow)) {
        continue;
      }
    }

    let target;
    if (kind === GHOST_KIND.pinky) {
      target = pinkyTarget({
        phase,
        mode,
        playerCol: player.col,
        playerRow: player.row,
        playerFacing: player.facing,
      });
    } else if (kind === GHOST_KIND.clyde) {
      target = clydeTarget({
        phase,
        mode,
        playerCol: player.col,
        playerRow: player.row,
        ghostCol: col,
        ghostRow: row,
      });
    } else {
      target = blinkyTarget({
        phase,
        mode,
        pelletsRemaining,
        playerCol: player.col,
        playerRow: player.row,
        ignoreElroy: opts.ignoreElroy,
      });
    }

    const storedFacing = facingNow;
    const intent = (Input.direction[eid] ?? DIRECTION.none) as GhostDir;
    const facing = storedFacing !== DIRECTION.none ? storedFacing : intent;
    const next = pickGhostDirection({
      x,
      y,
      facing,
      targetCol: target.col,
      targetRow: target.row,
      solids: rules.solids,
      canEnter: rules.canEnter,
    }) as Direction;

    if (next !== DIRECTION.none) {
      Input.direction[eid] = next;
      Ghost.decidedCol[eid] = col;
      Ghost.decidedRow[eid] = row;
    }
  }
}
