import { TILE_SIZE, isWalkable, worldToCol, worldToRow, type SolidGrid } from "./maze";
import {
  SLIPSTREAM_MS,
  SLIPSTREAM_PLAYER_SPEED_MUL,
  getUpgradeDef,
  hasUpgrade,
  type RunUpgrades,
  type UpgradeId,
} from "./upgrades";

export type SlipstreamPoint = { x: number; y: number };
export type SlipstreamGhost = SlipstreamPoint & { eid: number };

const STEPS: readonly { dc: number; dr: number }[] = [
  { dc: 0, dr: -1 },
  { dc: 0, dr: 1 },
  { dc: -1, dr: 0 },
  { dc: 1, dr: 0 },
];

function slipstreamRangeTiles(owned: readonly UpgradeId[]): number {
  for (const id of owned) {
    const tiles = getUpgradeDef(id).slipstreamRangeTiles;
    if (tiles !== undefined) {
      return tiles;
    }
  }
  return 0;
}

function slipstreamGhostMul(owned: readonly UpgradeId[]): number {
  for (const id of owned) {
    const mul = getUpgradeDef(id).slipstreamGhostSpeedMul;
    if (mul !== undefined) {
      return mul;
    }
  }
  return 1;
}

export function atJunction(player: SlipstreamPoint, solids?: SolidGrid): boolean {
  const col = worldToCol(player.x);
  const row = worldToRow(player.y);
  return (
    isWalkable(col, row, solids) &&
    STEPS.filter((s) => isWalkable(col + s.dc, row + s.dr, solids)).length >= 3
  );
}

export function slipstreamTargets(
  owned: readonly UpgradeId[],
  player: SlipstreamPoint,
  ghosts: readonly SlipstreamGhost[],
  solids?: SolidGrid,
): number[] {
  const reach = slipstreamRangeTiles(owned) * TILE_SIZE;
  if (reach <= 0 || !atJunction(player, solids)) {
    return [];
  }
  return ghosts
    .filter((ghost) => Math.hypot(ghost.x - player.x, ghost.y - player.y) <= reach)
    .map((ghost) => ghost.eid);
}

export function applySlipstreams(state: RunUpgrades, eids: readonly number[]): RunUpgrades {
  if (eids.length === 0) {
    return state;
  }
  return {
    ...state,
    slipstreams: [
      ...state.slipstreams.filter((s) => !eids.includes(s.eid)),
      ...eids.map((eid) => ({ eid, remainingMs: SLIPSTREAM_MS })),
    ],
  };
}

export function tickSlipstreams(state: RunUpgrades, deltaMs: number): RunUpgrades {
  if (state.slipstreams.length === 0) {
    return state;
  }
  const dt = Math.max(0, deltaMs);
  return {
    ...state,
    slipstreams: state.slipstreams
      .map((s) => ({ eid: s.eid, remainingMs: s.remainingMs - dt }))
      .filter((s) => s.remainingMs > 0),
  };
}

export function slipstreamGhostSpeedMul(
  state: RunUpgrades,
  owned: readonly UpgradeId[],
  eid: number,
): number {
  return state.slipstreams.some((s) => s.eid === eid) ? slipstreamGhostMul(owned) : 1;
}

export function slipstreamPlayerSpeedMul(state: RunUpgrades, owned: readonly UpgradeId[]): number {
  return hasUpgrade(owned, "passiveSlipstream") && state.slipstreams.length > 0
    ? SLIPSTREAM_PLAYER_SPEED_MUL
    : 1;
}

export function slipstreamGhostEids(state: RunUpgrades): number[] {
  return state.slipstreams.map((s) => s.eid);
}

export function slipstreamRemainingMs(state: RunUpgrades): number {
  return Math.max(0, ...state.slipstreams.map((s) => s.remainingMs));
}
