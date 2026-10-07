import { DOTMAN_MOUTH_OPEN_HALF_DEG, dotManMouthArt } from "../../domain/dotManMouth";
import { rotateLineArt, type LineArt } from "../../domain/lineArt";

export const DOTMAN_LINE_ART = dotManMouthArt(DOTMAN_MOUTH_OPEN_HALF_DEG);

const byKey = new Map<string, LineArt>([[`0:${DOTMAN_MOUTH_OPEN_HALF_DEG}`, DOTMAN_LINE_ART]]);

export function dotManLineArt(
  degrees: number,
  mouthHalfAngleDeg: number = DOTMAN_MOUTH_OPEN_HALF_DEG,
): LineArt {
  const facing = ((Math.round(degrees) % 360) + 360) % 360;
  const mouth = Math.round(mouthHalfAngleDeg * 10) / 10;
  const key = `${facing}:${mouth}`;
  let art = byKey.get(key);
  if (art === undefined) {
    const mouthArt = dotManMouthArt(mouth);
    art = facing === 0 ? mouthArt : rotateLineArt(mouthArt, facing);
    byKey.set(key, art);
  }
  return art;
}
