export const FRUIT_ART_PIXELS = 16;

export type FruitKind = string;

export function fruitArtIdOfPath(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/\.png$/, "");
}
