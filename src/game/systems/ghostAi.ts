import { DEFAULT_TUNING, type Tuning } from "../../domain/tuning";
import { hasComponent, query, type World } from "bitecs";
import { corridorOccupied } from "../../domain/bossGhostBlocking";
import {
  GHOST_DIR,
  ghostDirStep,
  openGhostDirsAt,
  pickGhostDirection,
  reverseGhostDir,
  type GhostCanEnter,
  type GhostDir,
} from "../../domain/ghostPath";
import { nearestBody, type BodyTile } from "../../domain/mirror";
import { GHOST_AI_MODE, type GhostAiMode } from "../../domain/ghostMode";
import { ghostMovementRules } from "../../domain/ghostMovement";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import {
  blinkyTarget,
  clydeTarget,
  inkyTarget,
  pinkyTarget,
  spunkyTarget,
  wardyTarget,
  GHOST_PHASE,
  type GhostTarget,
} from "../../domain/ghostTarget";
import {
  TURN_ALIGN_EPS,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isAlignedForTurn,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import {
  inScentZone,
  scentBlocksStep,
  scentRouteStep,
  type ScentZone,
} from "../../domain/scarecrow";
import { decoyFacing, decoyTile, nearestDecoy, type ChaffDecoy } from "../../domain/chaff";
import type { DroppedWall } from "../../domain/wallDrop";
import { BossGhost } from "../components/BossGhost";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { occupiedBossGhostTiles } from "./bossGhosts";
import { chainPartnerEid } from "./bossChain";

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

export type GhostAiContext = {
  player: { col: number; row: number; facing: GhostDir };
  blinky: { col: number; row: number };
  tuning?: Tuning;
  decoys?: readonly ChaffDecoy[];
};

export function ghostAiContext(
  world: World,
  tuning: Tuning = DEFAULT_TUNING,
  decoys: readonly ChaffDecoy[] = [],
): GhostAiContext {
  return { player: playerTileAndFacing(world), blinky: blinkyTile(world), tuning, decoys };
}

export function resolveGhostTarget(
  eid: number,
  mode: GhostAiMode,
  pelletsRemaining: number,
  ctx: GhostAiContext,
  tile?: { col: number; row: number },
): GhostTarget {
  const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
  const kind = (GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId;
  const col = tile?.col ?? worldToCol(Position.x[eid] ?? 0);
  const row = tile?.row ?? worldToRow(Position.y[eid] ?? 0);
  const { blinky, tuning } = ctx;
  const decoy = nearestDecoy(ctx.decoys ?? [], col, row);
  const player = decoy === null ? ctx.player : { ...decoyTile(decoy), facing: decoyFacing(decoy) };

  if (kind === GHOST_KIND.pinky) {
    return pinkyTarget({
      phase,
      mode,
      playerCol: player.col,
      playerRow: player.row,
      playerFacing: player.facing,
      ghostCol: col,
      ghostRow: row,
      tuning,
    });
  }
  if (kind === GHOST_KIND.spunky) {
    return spunkyTarget({
      phase,
      mode,
      playerCol: player.col,
      playerRow: player.row,
      ghostCol: col,
      ghostRow: row,
    });
  }
  if (kind === GHOST_KIND.wardy) {
    return wardyTarget({
      phase,
      mode,
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
      mode,
      playerCol: player.col,
      playerRow: player.row,
      playerFacing: player.facing,
      blinkyCol: blinky.col,
      blinkyRow: blinky.row,
      ghostCol: col,
      ghostRow: row,
      tuning,
    });
  }
  if (kind === GHOST_KIND.clyde) {
    return clydeTarget({
      phase,
      mode,
      playerCol: player.col,
      playerRow: player.row,
      ghostCol: col,
      ghostRow: row,
      tuning,
    });
  }
  return blinkyTarget({
    phase,
    mode,
    pelletsRemaining,
    playerCol: player.col,
    playerRow: player.row,
    ghostCol: col,
    ghostRow: row,
    tuning,
  });
}

function avoidingCanEnter(
  x: number,
  y: number,
  rules: ReturnType<typeof ghostMovementRules>,
  blocked: (dx: number, dy: number) => boolean,
): GhostCanEnter {
  const anyFree = openGhostDirsAt(x, y, rules.solids, rules.canEnter).some((dir) => {
    const { dx, dy } = ghostDirStep(dir);
    return !blocked(dx, dy);
  });
  if (!anyFree) {
    return rules.canEnter;
  }
  return (px, py, dx, dy) => rules.canEnter(px, py, dx, dy) && !blocked(dx, dy);
}

export function bossAwareCanEnter(
  world: World,
  eid: number,
  x: number,
  y: number,
  rules: ReturnType<typeof ghostMovementRules>,
): GhostCanEnter {
  const occupied = occupiedBossGhostTiles(world, eid, chainPartnerEid(world, eid));
  if (occupied.size === 0) {
    return rules.canEnter;
  }
  const col = worldToCol(x);
  const row = worldToRow(y);
  return avoidingCanEnter(x, y, rules, (dx, dy) =>
    corridorOccupied(col, row, dx, dy, occupied, rules.solids),
  );
}

export type ScentField = { zones: readonly ScentZone[]; radiusTiles: number };

export function scentAwareCanEnter(
  x: number,
  y: number,
  rules: ReturnType<typeof ghostMovementRules>,
  field: ScentField,
): GhostCanEnter {
  const from = { col: worldToCol(x), row: worldToRow(y) };
  return avoidingCanEnter(x, y, rules, (dx, dy) =>
    scentBlocksStep(
      field.zones,
      from,
      { col: from.col + dx, row: from.row + dy },
      field.radiusTiles,
    ),
  );
}

export function scentRouteDir(
  x: number,
  y: number,
  target: GhostTarget,
  rules: ReturnType<typeof ghostMovementRules>,
  field: ScentField,
  facing: GhostDir,
): Direction | null {
  const col = worldToCol(x);
  const row = worldToRow(y);
  const blocked = (c: number, r: number) => inScentZone(field.zones, c, r, field.radiusTiles);
  if (blocked(col, row)) {
    return null;
  }
  const layout = getActiveLayout();
  const step = scentRouteStep({
    from: { col, row },
    target,
    cols: layout.cols,
    rows: layout.rows,
    passable: (c, r, dx, dy) => rules.canEnter(cellCenterX(c), cellCenterY(r), dx, dy),
    blocked,
  });
  if (step === null) {
    return null;
  }
  const dir = ([GHOST_DIR.up, GHOST_DIR.left, GHOST_DIR.down, GHOST_DIR.right] as const).find(
    (d) => ghostDirStep(d).dx === step.dx && ghostDirStep(d).dy === step.dy,
  );
  if (dir === undefined) {
    return null;
  }
  if (dir === reverseGhostDir(facing)) {
    const forward = openGhostDirsAt(x, y, rules.solids, rules.canEnter).filter((d) => d !== dir);
    if (forward.length > 0) {
      return null;
    }
  }
  return dir as Direction;
}

export function ghostAi(
  world: World,
  mode: GhostAiMode,
  pelletsRemaining: number,
  tuning: Tuning = DEFAULT_TUNING,
  blockTunnels = false,
  frightenedEids: ReadonlySet<number> = new Set(),
  blockTunnelRow: number | null = null,
  droppedWall: DroppedWall | null = null,
  bodies: readonly BodyTile[] = [],
  decoys: readonly ChaffDecoy[] = [],
  scent: ScentField | null = null,
): void {
  const ctx = ghostAiContext(world, tuning, decoys);

  for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Position, Input, Facing])) {
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
    if (
      phase === GHOST_PHASE.inHouse ||
      (phase === GHOST_PHASE.active && frightenedEids.has(eid))
    ) {
      continue;
    }

    const x = Position.x[eid] ?? 0;
    const y = Position.y[eid] ?? 0;
    if (!isAlignedForTurn(x, y, TURN_ALIGN_EPS)) {
      continue;
    }

    const col = worldToCol(x);
    const row = worldToRow(y);
    const rules = ghostMovementRules(phase, blockTunnels, blockTunnelRow, droppedWall, { x, y });
    const facingNow = (Facing.direction[eid] ?? DIRECTION.none) as GhostDir;
    const alreadyDecided = Ghost.decidedCol[eid] === col && Ghost.decidedRow[eid] === row;
    if (alreadyDecided) {
      const opens = openGhostDirsAt(x, y, rules.solids, rules.canEnter);
      if (facingNow === DIRECTION.none || opens.includes(facingNow)) {
        continue;
      }
    }

    const isBossGhost = hasComponent(world, eid, BossGhost);
    const ghostCtx =
      bodies.length === 0
        ? ctx
        : { ...ctx, player: nearestBody({ col, row }, ctx.player, bodies, rules.solids) };
    const target =
      isBossGhost && phase === GHOST_PHASE.active && mode === GHOST_AI_MODE.scatter
        ? { col: BossGhost.scatterCol[eid] ?? 0, row: BossGhost.scatterRow[eid] ?? 0 }
        : resolveGhostTarget(eid, mode, pelletsRemaining, ghostCtx);

    const storedFacing = facingNow;
    const intent = (Input.direction[eid] ?? DIRECTION.none) as GhostDir;
    const facing = storedFacing !== DIRECTION.none ? storedFacing : intent;
    const bossCanEnter =
      isBossGhost && phase === GHOST_PHASE.active
        ? bossAwareCanEnter(world, eid, x, y, rules)
        : rules.canEnter;
    const canEnter =
      scent !== null && scent.zones.length > 0 && phase === GHOST_PHASE.active
        ? scentAwareCanEnter(x, y, { ...rules, canEnter: bossCanEnter }, scent)
        : bossCanEnter;
    const routed =
      scent !== null && scent.zones.length > 0 && phase === GHOST_PHASE.active
        ? scentRouteDir(x, y, target, { ...rules, canEnter: bossCanEnter }, scent, facing)
        : null;
    const next =
      routed ??
      (pickGhostDirection({
        x,
        y,
        facing,
        targetCol: target.col,
        targetRow: target.row,
        solids: rules.solids,
        canEnter,
      }) as Direction);

    if (next !== DIRECTION.none) {
      Input.direction[eid] = next;
      Ghost.decidedCol[eid] = col;
      Ghost.decidedRow[eid] = row;
    }
  }
}
