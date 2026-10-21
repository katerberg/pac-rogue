import { upgradeArtIdOfPath, upgradeIconTextureKey } from "../domain/upgradeArt";
import type { UpgradeId } from "../domain/upgrades";

const artUrlByPath = import.meta.glob("../art/upgrades/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const UPGRADE_ART_URLS: ReadonlyMap<string, string> = new Map(
  Object.entries(artUrlByPath).map(([path, url]) => [upgradeArtIdOfPath(path), url]),
);

const UPGRADE_ART_IDS: ReadonlySet<string> = new Set(UPGRADE_ART_URLS.keys());

export function upgradeIconTexture(id: UpgradeId): string {
  return upgradeIconTextureKey(id, UPGRADE_ART_IDS);
}
