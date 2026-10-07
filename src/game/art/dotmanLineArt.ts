import dotmanSvg from "./dotman.svg?raw";
import { parseLineArt, rotateLineArt, type LineArt } from "../../domain/lineArt";

export const DOTMAN_LINE_ART = parseLineArt(dotmanSvg);

const byDegree = new Map<number, LineArt>([[0, DOTMAN_LINE_ART]]);

export function dotManLineArt(degrees: number): LineArt {
  const key = ((Math.round(degrees) % 360) + 360) % 360;
  let art = byDegree.get(key);
  if (art === undefined) {
    art = rotateLineArt(DOTMAN_LINE_ART, key);
    byDegree.set(key, art);
  }
  return art;
}
