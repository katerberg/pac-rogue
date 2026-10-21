import { shieldCrackLook, shieldCrackProgress } from "./shieldCrack";

export const BUBBLE_SHIELD_SINGLE_KEY = "bubble-shield";
export const BUBBLE_SHIELD_MULTI_KEY = "bubble-shield-multiple";
export const BUBBLE_SHIELD_SINGLE_PATH = "art/other/bubble-shield.png";
export const BUBBLE_SHIELD_MULTI_PATH = "art/other/bubble-shield-multiple.png";
export const BUBBLE_SHIELD_ART_SIZE_PX = 16;
export const BUBBLE_SHIELD_PAD_PX = 4;

export type BubbleShieldCrack = {
  x: number;
  y: number;
  startMs: number;
  textureKey: string;
};

export type BubbleShieldCrackHalf = {
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

export function bubbleShieldTextureKey(shields: number): string | null {
  if (shields <= 0) {
    return null;
  }
  return shields === 1 ? BUBBLE_SHIELD_SINGLE_KEY : BUBBLE_SHIELD_MULTI_KEY;
}

export function bubbleShieldDisplaySize(playerSize: number): number {
  return playerSize + 2 * BUBBLE_SHIELD_PAD_PX;
}

export function bubbleShieldCracksAfterDrop(
  previousShields: number,
  shields: number,
  at: { x: number; y: number },
  nowMs: number,
  existing: readonly BubbleShieldCrack[],
): BubbleShieldCrack[] {
  const cracks = existing.filter((crack) => shieldCrackProgress(nowMs - crack.startMs) < 1);
  if (shields >= previousShields) {
    return [...cracks];
  }
  const textureKey = bubbleShieldTextureKey(previousShields);
  if (textureKey === null) {
    return [...cracks];
  }
  const lost = previousShields - shields;
  const next = [...cracks];
  for (let i = 0; i < lost; i += 1) {
    next.push({ x: at.x, y: at.y, startMs: nowMs, textureKey });
  }
  return next;
}

export function bubbleShieldCrackHalfPose(
  crack: { x: number; y: number },
  side: -1 | 1,
  displaySize: number,
  progress: number,
): BubbleShieldCrackHalf {
  const look = shieldCrackLook(progress);
  const halfArt = BUBBLE_SHIELD_ART_SIZE_PX / 2;
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
    cropH: BUBBLE_SHIELD_ART_SIZE_PX,
  };
}
