import { baseIdOf, getUpgradeDef, type UpgradeId } from "./upgrades";
import { schoolArtTextureKey } from "./schoolArt";

export const UPGRADE_ART_PIXELS = 48;

export function upgradeArtIdOfPath(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/\.png$/, "");
}

export function upgradeArtTextureKey(baseId: string): string {
  return `upgrade-${baseId}`;
}

export function upgradeIconTextureKey(id: UpgradeId, artIds: ReadonlySet<string>): string {
  const baseId = baseIdOf(id);
  return artIds.has(baseId)
    ? upgradeArtTextureKey(baseId)
    : schoolArtTextureKey(getUpgradeDef(id).school);
}
