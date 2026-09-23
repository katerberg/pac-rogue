import { type World } from "bitecs";
import {
  PELLET_DROPPER_INTERVAL_MS,
  PELLET_DROPPER_TRAIL_LEN,
  TELEGRAPH_FLASH_MS,
  type RunCorruption,
} from "../../domain/corruption";
import type { GhostTarget } from "../../domain/ghostTarget";
import { pushTrailTile } from "../../domain/ghostTrail";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { worldToCol, worldToRow } from "../../domain/maze";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";
import { findGhostEidByKind } from "./corruptionGhost";

export type PelletDropperTick = {
  corruption: RunCorruption;
  spawnTiles: GhostTarget[];
};

export function tickPelletDropperTrail(
  world: World,
  state: RunCorruption,
  deltaMs: number,
  pelletsRemaining: number,
): PelletDropperTick {
  if (state.type !== "pelletDropper") {
    return { corruption: state, spawnTiles: [] };
  }

  if (state.pelletDropperPendingTiles !== null) {
    const flashMs = Math.max(0, state.pelletDropperFlashMs - Math.max(0, deltaMs));
    if (flashMs > 0) {
      return { corruption: { ...state, pelletDropperFlashMs: flashMs }, spawnTiles: [] };
    }
    return {
      corruption: { ...state, pelletDropperFlashMs: 0, pelletDropperPendingTiles: null },
      spawnTiles: state.pelletDropperPendingTiles,
    };
  }

  const eid = findGhostEidByKind(world, state.ghostKind);
  if (eid === null) {
    return { corruption: state, spawnTiles: [] };
  }

  const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
  if (phase === GHOST_PHASE.inHouse) {
    return { corruption: state, spawnTiles: [] };
  }

  const tile = { col: worldToCol(Position.x[eid] ?? 0), row: worldToRow(Position.y[eid] ?? 0) };
  const pushed = pushTrailTile(state.dropperTrail, tile, PELLET_DROPPER_TRAIL_LEN);
  const cycleMs = state.pelletDropperCycleMs + Math.max(0, deltaMs);

  if (cycleMs < PELLET_DROPPER_INTERVAL_MS || pelletsRemaining <= 0) {
    return {
      corruption: { ...state, dropperTrail: pushed.trail, pelletDropperCycleMs: cycleMs },
      spawnTiles: [],
    };
  }

  return {
    corruption: {
      ...state,
      dropperTrail: pushed.trail,
      pelletDropperCycleMs: 0,
      pelletDropperFlashMs: TELEGRAPH_FLASH_MS,
      pelletDropperPendingTiles: [...pushed.trail],
    },
    spawnTiles: [],
  };
}
