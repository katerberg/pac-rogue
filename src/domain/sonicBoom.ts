import {
  TILE_SIZE,
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
  inFastZone: boolean,
): boolean {
  return trailActive || inFastZone || (hasUpgrade(owned, "passiveAfterburner") && onClearedTile);
}

export function sonicBoomStuns(owned: readonly UpgradeId[]): boolean {
  return owned.some((id) => getUpgradeDef(id).sonicBoomStuns === true);
}

export function sonicBoomHitMs(owned: readonly UpgradeId[]): number {
  for (const id of owned) {
    const ms = getUpgradeDef(id).sonicBoomHitMs;
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

export type SonicBoomBranch = { dc: number; dr: number; cells: { col: number; row: number }[] };

export function sonicBoomBranches(
  owned: readonly UpgradeId[],
  player: SonicBoomPlayer,
  solids?: SolidGrid,
): SonicBoomBranch[] {
  const reach = sonicBoomHallwayTiles(owned);
  const col = worldToCol(player.x);
  const row = worldToRow(player.y);
  if (reach <= 0 || !isWalkable(col, row, solids)) {
    return [];
  }
  const open = STEPS.filter((s) => isWalkable(col + s.dc, row + s.dr, solids));
  if (open.length < 3) {
    return [];
  }
  const { dc, dr } = player.heading;
  return open
    .filter((s) => !(s.dc === dc && s.dr === dr) && !(s.dc === -dc && s.dr === -dr))
    .map((step) => {
      const cells: SonicBoomBranch["cells"] = [];
      for (
        let n = 1;
        n <= reach && isWalkable(col + step.dc * n, row + step.dr * n, solids);
        n += 1
      ) {
        cells.push({ col: col + step.dc * n, row: row + step.dr * n });
      }
      return { dc: step.dc, dr: step.dr, cells };
    });
}

export function sonicBoomTargets(
  owned: readonly UpgradeId[],
  player: SonicBoomPlayer,
  ghosts: readonly SonicBoomGhost[],
  solids?: SolidGrid,
): number[] {
  if (!hasUpgrade(owned, "passiveSonicBoom")) {
    return [];
  }
  const radius = SONIC_BOOM_RADIUS_TILES * TILE_SIZE;
  const hit = new Set<number>();
  for (const ghost of ghosts) {
    if (Math.hypot(ghost.x - player.x, ghost.y - player.y) <= radius) {
      hit.add(ghost.eid);
    }
  }
  for (const { cells } of sonicBoomBranches(owned, player, solids)) {
    for (const { col, row } of cells) {
      for (const ghost of ghosts) {
        if (
          Math.abs(ghost.x - cellCenterX(col)) <= TILE_SIZE / 2 &&
          Math.abs(ghost.y - cellCenterY(row)) <= TILE_SIZE / 2
        ) {
          hit.add(ghost.eid);
        }
      }
    }
  }
  return [...hit];
}

export function applySonicHits(
  state: RunUpgrades,
  eids: readonly number[],
  hitMs: number,
  refresh: boolean,
): RunUpgrades {
  const targets = refresh
    ? eids
    : eids.filter((eid) => !state.sonicHits.some((h) => h.eid === eid));
  if (targets.length === 0 || hitMs <= 0) {
    return state;
  }
  return {
    ...state,
    sonicHits: [
      ...state.sonicHits.filter((h) => !targets.includes(h.eid)),
      ...targets.map((eid) => ({ eid, remainingMs: hitMs })),
    ],
  };
}

export function tickSonicHits(state: RunUpgrades, deltaMs: number): RunUpgrades {
  if (state.sonicHits.length === 0) {
    return state;
  }
  const dt = Math.max(0, deltaMs);
  return {
    ...state,
    sonicHits: state.sonicHits
      .map((s) => ({ eid: s.eid, remainingMs: s.remainingMs - dt }))
      .filter((s) => s.remainingMs > 0),
  };
}

const STUN_SHAKE_PX = 1.5;
const STUN_SHAKE_PERIOD_MS = 80;

export function sonicStunShakePx(remainingMs: number): number {
  return STUN_SHAKE_PX * Math.sin((2 * Math.PI * remainingMs) / STUN_SHAKE_PERIOD_MS);
}

type SpriteOffsets = Record<number, { x: number; y: number; rotation?: number }>;

export function sonicStunSpriteOffsets(
  state: RunUpgrades,
  owned: readonly UpgradeId[],
  base: SpriteOffsets | undefined,
): SpriteOffsets | undefined {
  if (state.sonicHits.length === 0 || !sonicBoomStuns(owned)) {
    return base;
  }
  return {
    ...Object.fromEntries(
      state.sonicHits.map((s) => [s.eid, { x: sonicStunShakePx(s.remainingMs), y: 0 }]),
    ),
    ...base,
  };
}

export function sonicStunnedEids(
  state: RunUpgrades,
  owned: readonly UpgradeId[],
): ReadonlySet<number> {
  return sonicBoomStuns(owned) ? new Set(state.sonicHits.map((s) => s.eid)) : new Set();
}

export function sonicHitRemainingMs(state: RunUpgrades): number {
  return Math.max(0, ...state.sonicHits.map((s) => s.remainingMs));
}
