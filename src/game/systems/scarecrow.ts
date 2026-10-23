import type { World } from "bitecs";
import { addScentLingers, tickScentLingers, type ScentLinger } from "../../domain/scarecrow";
import { scarecrowEffects, type RunUpgrades, type UpgradeId } from "../../domain/upgrades";
import { cellCenterX, cellCenterY, getActiveLayout } from "../../domain/maze";
import type { ScentField } from "./ghostAi";
import { fruitTiles } from "./collectFruit";

export function scentFieldFor(
  owned: readonly UpgradeId[],
  world: World,
  lingers: readonly ScentLinger[],
): ScentField | null {
  const { radiusTiles } = scarecrowEffects(owned);
  if (radiusTiles === null) {
    return null;
  }
  return { zones: [...fruitTiles(world), ...lingers], radiusTiles };
}

export function tickScarecrow(
  state: RunUpgrades,
  owned: readonly UpgradeId[],
  deltaMs: number,
): RunUpgrades {
  if (state.scentLingers.length === 0) {
    return state;
  }
  if (scarecrowEffects(owned).lingerMs === null) {
    return { ...state, scentLingers: [] };
  }
  return { ...state, scentLingers: tickScentLingers(state.scentLingers, deltaMs) };
}

export function leaveScent(
  state: RunUpgrades,
  owned: readonly UpgradeId[],
  pickedEids: readonly number[],
  tilesBefore: readonly { eid: number; col: number; row: number }[],
): RunUpgrades {
  const lingerMs = scarecrowEffects(owned).lingerMs;
  if (lingerMs === null || pickedEids.length === 0) {
    return state;
  }
  const picked = tilesBefore.filter((tile) => pickedEids.includes(tile.eid));
  return { ...state, scentLingers: addScentLingers(state.scentLingers, picked, lingerMs) };
}

export type ScentSprite = { x: number; y: number; radiusPx: number; remainingMs: number | null };

export function scentSprites(
  owned: readonly UpgradeId[],
  world: World,
  lingers: readonly ScentLinger[],
): ScentSprite[] {
  const { radiusTiles } = scarecrowEffects(owned);
  if (radiusTiles === null) {
    return [];
  }
  const radiusPx = radiusTiles * getActiveLayout().tileSize;
  const at = (zone: { col: number; row: number }) => ({
    x: cellCenterX(zone.col),
    y: cellCenterY(zone.row),
    radiusPx,
  });
  return [
    ...fruitTiles(world).map((zone) => ({ ...at(zone), remainingMs: null })),
    ...lingers.map((zone) => ({ ...at(zone), remainingMs: zone.remainingMs })),
  ];
}
