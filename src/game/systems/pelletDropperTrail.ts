import { type World } from "bitecs";
import {
  PELLET_DROPPER_COUNT,
  PELLET_DROPPER_INTERVAL_MS,
  TELEGRAPH_FLASH_MS,
  type RunCorruption,
} from "../../domain/corruption";
import type { GhostTarget } from "../../domain/ghostTarget";
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

  const dt = Math.max(0, deltaMs);
  if (state.pelletDropperFlashMs > 0) {
    const flashMs = Math.max(0, state.pelletDropperFlashMs - dt);
    return {
      corruption: {
        ...state,
        pelletDropperFlashMs: flashMs,
        pelletDropperDropsLeft: flashMs > 0 ? 0 : PELLET_DROPPER_COUNT,
        pelletDropperLastTile: null,
      },
      spawnTiles: [],
    };
  }

  const eid = findGhostEidByKind(world, state.ghostKind);
  if (eid === null) {
    return { corruption: state, spawnTiles: [] };
  }

  const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
  if (phase === GHOST_PHASE.inHouse) {
    return { corruption: { ...state, pelletDropperLastTile: null }, spawnTiles: [] };
  }

  const tile = { col: worldToCol(Position.x[eid] ?? 0), row: worldToRow(Position.y[eid] ?? 0) };
  const last = state.pelletDropperLastTile;
  const leftTile = last !== null && (last.col !== tile.col || last.row !== tile.row) ? last : null;
  const moved = { ...state, pelletDropperLastTile: tile };

  if (state.pelletDropperDropsLeft > 0) {
    if (leftTile === null) {
      return { corruption: moved, spawnTiles: [] };
    }
    return {
      corruption: { ...moved, pelletDropperDropsLeft: state.pelletDropperDropsLeft - 1 },
      spawnTiles: [leftTile],
    };
  }

  const cycleMs = state.pelletDropperCycleMs + dt;
  if (cycleMs < PELLET_DROPPER_INTERVAL_MS || pelletsRemaining <= 0) {
    return { corruption: { ...moved, pelletDropperCycleMs: cycleMs }, spawnTiles: [] };
  }

  return {
    corruption: { ...moved, pelletDropperCycleMs: 0, pelletDropperFlashMs: TELEGRAPH_FLASH_MS },
    spawnTiles: [],
  };
}
