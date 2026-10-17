import { GHOST_DIR, type GhostDir } from "./ghostPath";
import { GHOST_ART_SIZE_PX, GHOST_PUPIL_TURN_MS } from "./ghostPupils";

const HORN_LEFT_EDGES_ART = [2, 11] as const;
const HORN_BASE_WIDTH_ART = 3;
const HORN_TIP_WIDTH_ART = 2;
const HORN_TIP_SHIFT_ART = 1;

export type HornRect = { x: number; y: number; w: number; h: number };

export type HornTurnState = { from: number; to: number; startMs: number };

export function ghostHornTarget(facing: GhostDir, prevTarget: number): number {
  if (facing === GHOST_DIR.left) {
    return 1;
  }
  return facing === GHOST_DIR.right ? 0 : prevTarget;
}

function currentLean(state: HornTurnState, nowMs: number): number {
  const t = Math.min(1, Math.max(0, (nowMs - state.startMs) / GHOST_PUPIL_TURN_MS));
  return state.from + (state.to - state.from) * (t * t * (3 - 2 * t));
}

export function stepGhostHornTurn(
  prev: HornTurnState | undefined,
  facing: GhostDir,
  nowMs: number,
): { state: HornTurnState; lean: number } {
  if (prev === undefined) {
    const target = ghostHornTarget(facing, 0);
    return { state: { from: target, to: target, startMs: nowMs }, lean: target };
  }
  const target = ghostHornTarget(facing, prev.to);
  const state =
    target === prev.to ? prev : { from: currentLean(prev, nowMs), to: target, startMs: nowMs };
  return { state, lean: currentLean(state, nowMs) };
}

export function ghostHornRects(
  cx: number,
  cy: number,
  displaySize: number,
  lean: number,
  lift = 0,
): HornRect[] {
  const scale = displaySize / GHOST_ART_SIZE_PX;
  const originX = cx - displaySize / 2;
  const originY = cy - displaySize / 2;
  return HORN_LEFT_EDGES_ART.flatMap((left) => [
    {
      x: originX + (left + lean * HORN_TIP_SHIFT_ART) * scale,
      y: originY + lift * scale,
      w: HORN_TIP_WIDTH_ART * scale,
      h: Math.max(0, 1 - lift) * scale,
    },
    { x: originX + left * scale, y: originY + scale, w: HORN_BASE_WIDTH_ART * scale, h: scale },
  ]);
}
