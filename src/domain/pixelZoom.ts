import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfield";

export function computePixelZoom(parentWidth: number, parentHeight: number): number {
  if (parentWidth <= 0 || parentHeight <= 0) {
    return 1;
  }

  return Math.min(parentWidth / PLAYFIELD_WIDTH, parentHeight / PLAYFIELD_HEIGHT);
}
