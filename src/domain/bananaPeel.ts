import { shieldCrackLook } from "./shieldCrack";
import { DEFAULT_CHARM_TUNING, tailLayoutFrom, type TailLayout } from "./charmTailParams";
import type { TailBead } from "./charmTail";

export const BANANA_PEEL_TEXTURE_KEY = "banana-peel";
export const BANANA_PEEL_PATH = "art/other/banana-peel.png";
export const BANANA_PEEL_ART_SIZE_PX = 16;
export const BANANA_PEEL_DISPLAY_SIZE_PX = 13;
export const PEEL_CATCH_MIN_OVERLAP_FRACTION = 0.3;

export type BananaPeelCrack = {
  x: number;
  y: number;
  startMs: number;
};

export type BananaPeelCrackHalf = {
  x: number;
  y: number;
  rotation: number;
  alpha: number;
  displayWidth: number;
  displayHeight: number;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
};

export function bananaPeelLayout(): TailLayout {
  return tailLayoutFrom({ ...DEFAULT_CHARM_TUNING, charmTail: true });
}

export function bananaPeelBeadRadiusPx(layout: TailLayout = bananaPeelLayout()): number {
  return Math.max(layout.radiusPx, DEFAULT_CHARM_TUNING.charmSize / 2);
}

export function bananaPeelSprites(beads: readonly TailBead[]): { x: number; y: number }[] {
  return beads.map((bead) => ({ x: bead.x, y: bead.y }));
}

export function bananaPeelCrackHalfPose(
  crack: { x: number; y: number },
  side: -1 | 1,
  displaySize: number,
  progress: number,
): BananaPeelCrackHalf {
  const look = shieldCrackLook(progress);
  const halfArt = BANANA_PEEL_ART_SIZE_PX / 2;
  return {
    x: crack.x + side * (displaySize / 4 + look.offsetX),
    y: crack.y + look.dropY,
    rotation: side * look.rotation,
    alpha: look.alpha,
    displayWidth: displaySize / 2,
    displayHeight: displaySize,
    cropX: side < 0 ? 0 : halfArt,
    cropY: 0,
    cropW: halfArt,
    cropH: BANANA_PEEL_ART_SIZE_PX,
  };
}
