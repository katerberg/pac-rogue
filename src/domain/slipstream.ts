import { TILE_SIZE, isWalkable, worldToCol, worldToRow, type SolidGrid } from "./maze";
import { getUpgradeDef, type RunUpgrades, type UpgradeId } from "./upgrades";

export type SlipstreamPlayer = { x: number; y: number };
export type SlipstreamGhost = { eid: number; x: number; y: number };

const STEPS: readonly { dc: number; dr: number }[] = [
  { dc: 0, dr: -1 },
  { dc: 0, dr: 1 },
  { dc: -1, dr: 0 },
  { dc: 1, dr: 0 },
];

export function slipstreamRangeTiles(owned: readonly UpgradeId[]): number {
  for (const id of owned) {
    const tiles = getUpgradeDef(id).slipstreamRangeTiles;
    if (tiles !== undefined) {
      return tiles;
    }
  }
  return 0;
}

function slipstreamMs(owned: readonly UpgradeId[]): number {
  for (const id of owned) {
    const ms = getUpgradeDef(id).slipstreamMs;
    if (ms !== undefined) {
      return ms;
    }
  }
  return 0;
}

function slipstreamHalts(owned: readonly UpgradeId[]): boolean {
  return owned.some((id) => getUpgradeDef(id).slipstreamHalts === true);
}

function ownedMul(
  owned: readonly UpgradeId[],
  read: (id: UpgradeId) => number | undefined,
): number {
  for (const id of owned) {
    const mul = read(id);
    if (mul !== undefined) {
      return mul;
    }
  }
  return 1;
}

export function atJunction(player: SlipstreamPlayer, solids?: SolidGrid): boolean {
  const col = worldToCol(player.x);
  const row = worldToRow(player.y);
  return (
    isWalkable(col, row, solids) &&
    STEPS.filter((s) => isWalkable(col + s.dc, row + s.dr, solids)).length >= 3
  );
}

export function slipstreamTargets(
  owned: readonly UpgradeId[],
  player: SlipstreamPlayer,
  ghosts: readonly SlipstreamGhost[],
  solids?: SolidGrid,
): number[] {
  const range = slipstreamRangeTiles(owned) * TILE_SIZE;
  if (range <= 0 || !atJunction(player, solids)) {
    return [];
  }
  return ghosts
    .filter((g) => Math.hypot(g.x - player.x, g.y - player.y) <= range)
    .map((g) => g.eid);
}

export function applySlipstream(
  state: RunUpgrades,
  owned: readonly UpgradeId[],
  eids: readonly number[],
): RunUpgrades {
  const ms = slipstreamMs(owned);
  if (eids.length === 0 || ms <= 0) {
    return state;
  }
  return {
    ...state,
    slipstreamHits: [
      ...state.slipstreamHits.filter((h) => !eids.includes(h.eid)),
      ...eids.map((eid) => ({ eid, remainingMs: ms })),
    ],
  };
}

export function tickSlipstream(state: RunUpgrades, deltaMs: number): RunUpgrades {
  if (state.slipstreamHits.length === 0) {
    return state;
  }
  const dt = Math.max(0, deltaMs);
  return {
    ...state,
    slipstreamHits: state.slipstreamHits
      .map((h) => ({ eid: h.eid, remainingMs: h.remainingMs - dt }))
      .filter((h) => h.remainingMs > 0),
  };
}

export function slipstreamRemainingMs(state: RunUpgrades): number {
  return Math.max(0, ...state.slipstreamHits.map((h) => h.remainingMs));
}

export function slipstreamPlayerMul(state: RunUpgrades, owned: readonly UpgradeId[]): number {
  return slipstreamRemainingMs(state) > 0
    ? ownedMul(owned, (id) => getUpgradeDef(id).slipstreamPlayerMul)
    : 1;
}

export function slipstreamGhostMul(
  state: RunUpgrades,
  owned: readonly UpgradeId[],
  eid: number,
): number {
  return state.slipstreamHits.some((h) => h.eid === eid)
    ? ownedMul(owned, (id) => getUpgradeDef(id).slipstreamGhostMul)
    : 1;
}

export function slipstreamHeldEids(
  state: RunUpgrades,
  owned: readonly UpgradeId[],
): ReadonlySet<number> {
  return slipstreamHalts(owned) ? new Set(state.slipstreamHits.map((h) => h.eid)) : new Set();
}

export function slipstreamedEids(state: RunUpgrades): number[] {
  return state.slipstreamHits.map((h) => h.eid);
}
