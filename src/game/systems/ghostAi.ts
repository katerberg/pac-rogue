import { hasComponent, query, type World } from "bitecs";
import { corridorOccupied } from "../../domain/bossGhostBlocking";
import {
  ghostDirStep,
  openGhostDirsAt,
  pickGhostDirection,
  type GhostCanEnter,
  type GhostDir,
} from "../../domain/ghostPath";
import { GHOST_AI_MODE, type GhostAiMode } from "../../domain/ghostMode";
import { ghostMovementRules } from "../../domain/ghostMovement";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import type { CorruptionId } from "../../domain/corruption";
import {
  blinkyTarget,
  clydeTarget,
  inkyTarget,
  pinkyTarget,
  GHOST_PHASE,
  type GhostTarget,
} from "../../domain/ghostTarget";
import {
  TURN_ALIGN_EPS,
  getActiveLayout,
  isAlignedForTurn,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { BossGhost } from "../components/BossGhost";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { occupiedBossGhostTiles } from "./bossGhosts";

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

function blinkyTile(world: World): { col: number; row: number } {
  for (const eid of query(world, [Ghost, GhostKind, Position])) {
    if ((GhostKind.kind[eid] ?? GHOST_KIND.blinky) === GHOST_KIND.blinky) {
      return {
        col: worldToCol(Position.x[eid] ?? 0),
        row: worldToRow(Position.y[eid] ?? 0),
      };
    }
  }
  return getActiveLayout().ghostHouseSpawn;
}

type GhostCorruptionOpt = { ghostKind: GhostKindId; type: CorruptionId };

export type GhostAiContext = {
  player: { col: number; row: number; facing: GhostDir };
  blinky: { col: number; row: number };
};

export function ghostAiContext(world: World): GhostAiContext {
  return { player: playerTileAndFacing(world), blinky: blinkyTile(world) };
}

export function resolveGhostTarget(
  eid: number,
  mode: GhostAiMode,
  pelletsRemaining: number,
  ctx: GhostAiContext,
  opts: { ignoreElroy?: boolean; corruption?: GhostCorruptionOpt } = {},
): GhostTarget {
  const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
  const kind = (GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId;
  const col = worldToCol(Position.x[eid] ?? 0);
  const row = worldToRow(Position.y[eid] ?? 0);
  const corruptionType = kind === opts.corruption?.ghostKind ? opts.corruption.type : null;
  const effectiveMode: GhostAiMode = corruptionType === "falseScatter" ? GHOST_AI_MODE.chase : mode;
  const { player, blinky } = ctx;

  if (kind === GHOST_KIND.pinky) {
    return pinkyTarget({
      phase,
      mode: effectiveMode,
      playerCol: player.col,
      playerRow: player.row,
      playerFacing: player.facing,
      ghostCol: col,
      ghostRow: row,
    });
  }
  if (kind === GHOST_KIND.inky) {
    return inkyTarget({
      phase,
      mode: effectiveMode,
      playerCol: player.col,
      playerRow: player.row,
      playerFacing: player.facing,
      blinkyCol: blinky.col,
      blinkyRow: blinky.row,
      ghostCol: col,
      ghostRow: row,
    });
  }
  if (kind === GHOST_KIND.clyde) {
    return clydeTarget({
      phase,
      mode: effectiveMode,
      playerCol: player.col,
      playerRow: player.row,
      ghostCol: col,
      ghostRow: row,
    });
  }
  return blinkyTarget({
    phase,
    mode: effectiveMode,
    pelletsRemaining,
    playerCol: player.col,
    playerRow: player.row,
    ghostCol: col,
    ghostRow: row,
    ignoreElroy: opts.ignoreElroy,
  });
}

// Closes any direction whose corridor (up to the next junction) holds another boss ghost,
// unless that would close every direction.
function bossAwareCanEnter(
  world: World,
  eid: number,
  x: number,
  y: number,
  rules: ReturnType<typeof ghostMovementRules>,
): GhostCanEnter {
  const occupied = occupiedBossGhostTiles(world, eid);
  if (occupied.size === 0) {
    return rules.canEnter;
  }
  const col = worldToCol(x);
  const row = worldToRow(y);
  const blocked = (dx: number, dy: number) =>
    corridorOccupied(col, row, dx, dy, occupied, rules.solids);
  const anyFree = openGhostDirsAt(x, y, rules.solids, rules.canEnter).some((dir) => {
    const { dx, dy } = ghostDirStep(dir);
    return !blocked(dx, dy);
  });
  if (!anyFree) {
    return rules.canEnter;
  }
  return (px, py, dx, dy) => rules.canEnter(px, py, dx, dy) && !blocked(dx, dy);
}

export function ghostAi(
  world: World,
  mode: GhostAiMode,
  pelletsRemaining: number,
  opts: {
    ignoreElroy?: boolean;
    corruption?: GhostCorruptionOpt;
  } = {},
): void {
  const ctx = ghostAiContext(world);

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

    const corruptionType = kind === opts.corruption?.ghostKind ? opts.corruption.type : null;
    const freeRetarget = corruptionType === "freeRetargetReverse";

    const col = worldToCol(x);
    const row = worldToRow(y);
    const rules = ghostMovementRules(phase);
    const facingNow = (Facing.direction[eid] ?? DIRECTION.none) as GhostDir;
    const alreadyDecided = Ghost.decidedCol[eid] === col && Ghost.decidedRow[eid] === row;
    if (!freeRetarget && alreadyDecided) {
      const opens = openGhostDirsAt(x, y, rules.solids, rules.canEnter);
      if (facingNow === DIRECTION.none || opens.includes(facingNow)) {
        continue;
      }
    }

    const isBossGhost = hasComponent(world, eid, BossGhost);
    const target =
      isBossGhost && phase === GHOST_PHASE.active && mode === GHOST_AI_MODE.scatter
        ? { col: BossGhost.scatterCol[eid] ?? 0, row: BossGhost.scatterRow[eid] ?? 0 }
        : resolveGhostTarget(eid, mode, pelletsRemaining, ctx, opts);

    const storedFacing = facingNow;
    const intent = (Input.direction[eid] ?? DIRECTION.none) as GhostDir;
    const facing = storedFacing !== DIRECTION.none ? storedFacing : intent;
    const canEnter =
      isBossGhost && phase === GHOST_PHASE.active
        ? bossAwareCanEnter(world, eid, x, y, rules)
        : rules.canEnter;
    const next = pickGhostDirection({
      x,
      y,
      facing,
      targetCol: target.col,
      targetRow: target.row,
      solids: rules.solids,
      canEnter,
      allowReverse: freeRetarget,
    }) as Direction;

    if (next !== DIRECTION.none) {
      Input.direction[eid] = next;
      Ghost.decidedCol[eid] = col;
      Ghost.decidedRow[eid] = row;
    }
  }
}
