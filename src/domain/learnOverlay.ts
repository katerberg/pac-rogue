import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { ghostMovementRules } from "./ghostMovement";
import { GHOST_DIR, pickGhostDirection, type GhostDir } from "./ghostPath";
import { GHOST_PHASE } from "./ghostPhase";
import {
  CLYDE_SHY_TILES,
  INKY_LOOKAHEAD_TILES,
  lookAheadTile,
  type GhostTarget,
} from "./ghostTarget";
import { cellCenterX, cellCenterY, getActiveLayout } from "./maze";

export const LEARN_PATH_MAX_STEPS = 48;
export const RETICLE_EASE_MS = 70;

export const GHOST_COLOR_BY_KIND: Record<GhostKindId, number> = {
  [GHOST_KIND.blinky]: 0xff0000,
  [GHOST_KIND.pinky]: 0xffb8ff,
  [GHOST_KIND.inky]: 0x00ffff,
  [GHOST_KIND.clyde]: 0xffb852,
};

export function clampTileToBoard(tile: GhostTarget, cols: number, rows: number): GhostTarget {
  return {
    col: Math.min(cols - 1, Math.max(0, tile.col)),
    row: Math.min(rows - 1, Math.max(0, tile.row)),
  };
}

function stepTile(tile: GhostTarget, dir: GhostDir): GhostTarget {
  switch (dir) {
    case GHOST_DIR.up:
      return { col: tile.col, row: tile.row - 1 };
    case GHOST_DIR.down:
      return { col: tile.col, row: tile.row + 1 };
    case GHOST_DIR.left:
      return { col: tile.col - 1, row: tile.row };
    case GHOST_DIR.right:
      return { col: tile.col + 1, row: tile.row };
    default:
      return tile;
  }
}

export function predictGhostPath(args: {
  start: GhostTarget;
  facing: GhostDir;
  target: GhostTarget;
  maxSteps?: number;
}): GhostTarget[] {
  const { cols, rows } = getActiveLayout();
  const rules = ghostMovementRules(GHOST_PHASE.active);
  const maxSteps = args.maxSteps ?? LEARN_PATH_MAX_STEPS;
  const path: GhostTarget[] = [args.start];
  let tile = args.start;
  let facing = args.facing;

  for (let step = 0; step < maxSteps; step += 1) {
    if (tile.col === args.target.col && tile.row === args.target.row) {
      break;
    }
    const dir = pickGhostDirection({
      x: cellCenterX(tile.col),
      y: cellCenterY(tile.row),
      facing,
      targetCol: args.target.col,
      targetRow: args.target.row,
      solids: rules.solids,
      canEnter: rules.canEnter,
    });
    const next = stepTile(tile, dir);
    const offBoard = next.col < 0 || next.col >= cols || next.row < 0 || next.row >= rows;
    const revisit = path.some((seen) => seen.col === next.col && seen.row === next.row);
    if (dir === GHOST_DIR.none || offBoard || revisit) {
      break;
    }
    path.push(next);
    tile = next;
    facing = dir;
  }
  return path;
}

export type TargetDerivation =
  | { kind: "none" }
  | { kind: "segment"; from: GhostTarget; to: GhostTarget }
  | { kind: "inky"; blinky: GhostTarget; pivot: GhostTarget; target: GhostTarget }
  | { kind: "circle"; center: GhostTarget; radiusTiles: number };

export function targetDerivation(
  kind: GhostKindId,
  input: { player: GhostTarget; playerFacing: GhostDir; blinky: GhostTarget; target: GhostTarget },
): TargetDerivation {
  switch (kind) {
    case GHOST_KIND.pinky:
      return { kind: "segment", from: input.player, to: input.target };
    case GHOST_KIND.inky:
      return {
        kind: "inky",
        blinky: input.blinky,
        pivot: lookAheadTile(
          input.player.col,
          input.player.row,
          input.playerFacing,
          INKY_LOOKAHEAD_TILES,
        ),
        target: input.target,
      };
    case GHOST_KIND.clyde:
      return { kind: "circle", center: input.player, radiusTiles: CLYDE_SHY_TILES };
    default:
      return { kind: "none" };
  }
}

export type PixelRect = { left: number; top: number; right: number; bottom: number };
export type PixelSegment = { x1: number; y1: number; x2: number; y2: number };

export function clipSegmentToRect(seg: PixelSegment, rect: PixelRect): PixelSegment | null {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, seg.x1 - rect.left],
    [dx, rect.right - seg.x1],
    [-dy, seg.y1 - rect.top],
    [dy, rect.bottom - seg.y1],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) {
        return null;
      }
      continue;
    }
    const t = q / p;
    if (p < 0) {
      t0 = Math.max(t0, t);
    } else {
      t1 = Math.min(t1, t);
    }
    if (t0 > t1) {
      return null;
    }
  }
  return {
    x1: seg.x1 + t0 * dx,
    y1: seg.y1 + t0 * dy,
    x2: seg.x1 + t1 * dx,
    y2: seg.y1 + t1 * dy,
  };
}

export type PixelPoint = { x: number; y: number };

export function easeToward(
  current: PixelPoint | null,
  goal: PixelPoint,
  deltaMs: number,
  tauMs: number = RETICLE_EASE_MS,
): PixelPoint {
  if (current === null) {
    return goal;
  }
  const k = 1 - Math.exp(-Math.max(0, deltaMs) / tauMs);
  return { x: current.x + (goal.x - current.x) * k, y: current.y + (goal.y - current.y) * k };
}
