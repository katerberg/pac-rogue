import {
  TILE_SIZE_PX,
  cellCenterX,
  cellCenterY,
  isWalkable,
  worldToCol,
  worldToRow,
  type SolidGrid,
} from "./maze";
import {
  SONIC_BOOM_RADIUS_TILES,
  getUpgradeDef,
  hasUpgrade,
  type RunUpgrades,
  type UpgradeId,
} from "./upgrades";

export type SonicBoomPlayer = { x: number; y: number; heading: { dc: number; dr: number } };
export type SonicBoomGhost = { eid: number; x: number; y: number };

export type SonicBoomStun = { eid: number; remainingMs: number };

const STEPS: readonly { dc: number; dr: number }[] = [
  { dc: 0, dr: -1 },
  { dc: 0, dr: 1 },
  { dc: -1, dr: 0 },
  { dc: 1, dr: 0 },
];

export function atTopSpeed(
  owned: readonly UpgradeId[],
  trailActive: boolean,
  onClearedTile: boolean,
): boolean {
  return trailActive || (hasUpgrade(owned, "passiveAfterburner") && onClearedTile);
}

export function sonicBoomActive(owned: readonly UpgradeId[]): boolean {
  return hasUpgrade(owned, "passiveSonicBoom");
}

export function sonicBoomStunMs(owned: readonly UpgradeId[]): number {
  for (const id of owned) {
    const ms = getUpgradeDef(id).sonicBoomStunMs;
    if (ms !== undefined) {
      return ms;
    }
  }
  return 0;
}

function sonicBoomHallwayTiles(owned: readonly UpgradeId[]): number {
  for (const id of owned) {
    const tiles = getUpgradeDef(id).sonicBoomHallwayTiles;
    if (tiles !== undefined) {
      return tiles;
    }
  }
  return 0;
}

export function sonicBoomTargets(
  owned: readonly UpgradeId[],
  player: SonicBoomPlayer,
  ghosts: readonly SonicBoomGhost[],
  solids?: SolidGrid,
): number[] {
  if (!sonicBoomActive(owned)) {
    return [];
  }
  const radius = SONIC_BOOM_RADIUS_TILES * TILE_SIZE_PX;
  const hit = new Set<number>();
  for (const ghost of ghosts) {
    if (Math.hypot(ghost.x - player.x, ghost.y - player.y) <= radius) {
      hit.add(ghost.eid);
    }
  }
  const reach = sonicBoomHallwayTiles(owned);
  const col = worldToCol(player.x);
  const row = worldToRow(player.y);
  if (reach > 0 && isWalkable(col, row, solids)) {
    const open = STEPS.filter((s) => isWalkable(col + s.dc, row + s.dr, solids));
    if (open.length >= 3) {
      const { dc, dr } = player.heading;
      for (const step of open) {
        if ((step.dc === dc && step.dr === dr) || (step.dc === -dc && step.dr === -dr)) {
          continue;
        }
        for (let n = 1; n <= reach; n += 1) {
          const c = col + step.dc * n;
          const r = row + step.dr * n;
          if (!isWalkable(c, r, solids)) {
            break;
          }
          for (const ghost of ghosts) {
            if (
              Math.abs(ghost.x - cellCenterX(c)) <= TILE_SIZE_PX / 2 &&
              Math.abs(ghost.y - cellCenterY(r)) <= TILE_SIZE_PX / 2
            ) {
              hit.add(ghost.eid);
            }
          }
        }
      }
    }
  }
  return [...hit];
}

export function applySonicStuns(
  state: RunUpgrades,
  eids: readonly number[],
  stunMs: number,
): RunUpgrades {
  if (eids.length === 0 || stunMs <= 0) {
    return state;
  }
  const kept = state.sonicStuns.filter((s) => !eids.includes(s.eid));
  return {
    ...state,
    sonicStuns: [...kept, ...eids.map((eid) => ({ eid, remainingMs: stunMs }))],
  };
}

export function tickSonicStuns(state: RunUpgrades, deltaMs: number): RunUpgrades {
  if (state.sonicStuns.length === 0) {
    return state;
  }
  const dt = Math.max(0, deltaMs);
  return {
    ...state,
    sonicStuns: state.sonicStuns
      .map((s) => ({ eid: s.eid, remainingMs: s.remainingMs - dt }))
      .filter((s) => s.remainingMs > 0),
  };
}

export function sonicStunnedEids(state: RunUpgrades): ReadonlySet<number> {
  return new Set(state.sonicStuns.map((s) => s.eid));
}

export function sonicStunRemainingMs(state: RunUpgrades): number {
  return Math.max(0, ...state.sonicStuns.map((s) => s.remainingMs));
}
