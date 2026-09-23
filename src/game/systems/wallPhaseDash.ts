import { query, type World } from "bitecs";
import {
  TELEGRAPH_FLASH_MS,
  WALL_PHASE_CYCLE_MS,
  type RunCorruption,
} from "../../domain/corruption";
import { ghostMovementRules } from "../../domain/ghostMovement";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { wallPhaseDashLungeTarget } from "../../domain/wallPhaseDash";
import { cellCenterX, cellCenterY, worldToCol, worldToRow } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { findGhostEidByKind } from "./corruptionGhost";

export function tickWallPhaseDash(
  world: World,
  state: RunCorruption,
  deltaMs: number,
): RunCorruption {
  if (state.type !== "wallPhaseDash") {
    return state;
  }

  if (state.wallPhasePendingTarget !== null) {
    const flashMs = Math.max(0, state.wallPhaseFlashMs - Math.max(0, deltaMs));
    if (flashMs > 0) {
      return { ...state, wallPhaseFlashMs: flashMs };
    }

    const eid = findGhostEidByKind(world, state.ghostKind);
    if (eid !== null) {
      Position.x[eid] = cellCenterX(state.wallPhasePendingTarget.col);
      Position.y[eid] = cellCenterY(state.wallPhasePendingTarget.row);
      Ghost.decidedCol[eid] = Number.NaN;
      Ghost.decidedRow[eid] = Number.NaN;
    }
    return { ...state, wallPhaseFlashMs: 0, wallPhasePendingTarget: null };
  }

  const cycleMs = state.wallPhaseCycleMs + Math.max(0, deltaMs);
  if (cycleMs < WALL_PHASE_CYCLE_MS) {
    return { ...state, wallPhaseCycleMs: cycleMs };
  }

  const ghostEid = findGhostEidByKind(world, state.ghostKind);
  const playerEid = query(world, [Player, Position])[0];
  if (ghostEid === null || playerEid === undefined) {
    return { ...state, wallPhaseCycleMs: 0 };
  }

  const phase = GhostPhase.value[ghostEid] ?? GHOST_PHASE.inHouse;
  if (phase === GHOST_PHASE.inHouse) {
    return { ...state, wallPhaseCycleMs: 0 };
  }

  const col = worldToCol(Position.x[ghostEid] ?? 0);
  const row = worldToRow(Position.y[ghostEid] ?? 0);
  const playerCol = worldToCol(Position.x[playerEid] ?? 0);
  const playerRow = worldToRow(Position.y[playerEid] ?? 0);
  const solids = ghostMovementRules(phase).solids;
  const target = wallPhaseDashLungeTarget(col, row, playerCol, playerRow, solids);
  if (target === null) {
    return { ...state, wallPhaseCycleMs: 0 };
  }

  return {
    ...state,
    wallPhaseCycleMs: 0,
    wallPhaseFlashMs: TELEGRAPH_FLASH_MS,
    wallPhasePendingTarget: target,
  };
}
