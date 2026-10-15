import type { UpgradeSchool } from "./upgrades";

const SCHOOL_ART_PIXELS = 16;
const WATERMARK_FILL = 0.75;

export const SCHOOL_WATERMARK_ALPHA = 0.16;

export function schoolArtPath(school: UpgradeSchool): string | null {
  return school === "neutral" ? null : `art/schools/${school}.png`;
}

export function schoolArtTextureKey(school: UpgradeSchool): string {
  return `school-${school}`;
}

export function schoolArtSize(cardWidth: number, cardHeight: number): number {
  const wholePixels = Math.floor(
    (Math.min(cardWidth, cardHeight) * WATERMARK_FILL) / SCHOOL_ART_PIXELS,
  );
  return Math.max(1, wholePixels) * SCHOOL_ART_PIXELS;
}
