import { fruitArtIdOfPath, type FruitKind } from "../domain/fruitArt";

const artUrlByPath = import.meta.glob("../art/fruit/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const FRUIT_ART_URLS: ReadonlyMap<string, string> = new Map(
  Object.entries(artUrlByPath).map(([path, url]) => [fruitArtIdOfPath(path), url]),
);

export const FRUIT_KINDS: readonly FruitKind[] = Object.freeze([...FRUIT_ART_URLS.keys()].sort());
