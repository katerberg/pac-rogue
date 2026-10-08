import Phaser from "phaser";
import { BONUS_COLORS, type BonusBarGlow, type NeonBarTube } from "../../domain/bonusBarFx";

export const NEON_BAR_TUBE_INSET = 2;
export const NEON_BAR_TUBE_STROKE = 2;
export const NEON_BAR_TRACK_ALPHA = 0.45;
export const NEON_BAR_GLOW_QUALITY = 24;
export const NEON_BAR_GLOW_PAD_WORLD = 12;

export function paintNeonBarTube(
  gfx: Phaser.GameObjects.Graphics,
  tube: NeonBarTube,
  opts: { scale?: number; forGlow?: boolean } = {},
): void {
  const s = opts.scale ?? 1;
  const forGlow = opts.forGlow ?? false;
  const x = tube.x * s;
  const y = tube.y * s;
  const w = tube.w * s;
  const h = tube.h * s;
  const radius = h / 2;
  const innerX = x + NEON_BAR_TUBE_INSET;
  const innerY = y + NEON_BAR_TUBE_INSET;
  const innerH = h - NEON_BAR_TUBE_INSET * 2;
  const innerW = w - NEON_BAR_TUBE_INSET * 2;
  const innerR = innerH / 2;
  if (forGlow) {
    gfx.lineStyle(NEON_BAR_TUBE_STROKE + 1, BONUS_COLORS.fill, 1);
    gfx.strokeRoundedRect(x, y, w, h, radius);
    if (tube.fillFrac > 0) {
      const fillW = Math.min(innerW, Math.max(innerH, tube.fillFrac * innerW));
      gfx.fillStyle(BONUS_COLORS.fill, 1);
      gfx.fillRoundedRect(innerX, innerY, fillW, innerH, innerR);
    }
    return;
  }
  gfx.fillStyle(tube.trackColor, NEON_BAR_TRACK_ALPHA);
  gfx.fillRoundedRect(x, y, w, h, radius);
  gfx.lineStyle(NEON_BAR_TUBE_STROKE, tube.frameColor, 1);
  gfx.strokeRoundedRect(x, y, w, h, radius);
  if (tube.fillFrac <= 0) {
    return;
  }
  const fillW = Math.min(innerW, Math.max(innerH, tube.fillFrac * innerW));
  gfx.fillStyle(tube.fillColor, 1);
  gfx.fillRoundedRect(innerX, innerY, fillW, innerH, innerR);
  const coreH = Math.max(2, Math.round(innerH * 0.35));
  const coreY = innerY + (innerH - coreH) / 2;
  const corePad = innerR * 0.45;
  const coreW = Math.max(0, fillW - corePad * 2);
  if (coreW > 0) {
    gfx.fillStyle(tube.coreColor, 0.95);
    gfx.fillRoundedRect(innerX + corePad, coreY, coreW, coreH, coreH / 2);
  }
}

/** Install or refresh a knockout Glow on a tube Graphics object. Returns the cache key used. */
export function syncNeonBarTubeGlow(
  gfx: Phaser.GameObjects.Graphics,
  tube: NeonBarTube,
  glow: BonusBarGlow | null,
  px: number,
  prevKey: string,
): string {
  if (glow === null) {
    gfx.clear();
    gfx.setVisible(false);
    gfx.filters?.internal.clear();
    return `off:${px}`;
  }
  gfx.setVisible(true);
  gfx.setPosition(tube.x, tube.y);
  const local: NeonBarTube = { ...tube, x: 0, y: 0 };
  const key = `on:${px}:${glow.outerStrength}:${glow.distance}:${tube.w}:${tube.h}`;
  if (prevKey !== key) {
    try {
      const reach = Math.ceil(glow.distance * px);
      const pad = NEON_BAR_GLOW_PAD_WORLD;
      const filterW = Math.ceil((tube.w + 2 * pad) * px) + 2 * reach;
      const filterH = Math.ceil((tube.h + 2 * pad) * px) + 2 * reach;
      gfx.enableFilters();
      gfx.filtersAutoFocus = false;
      gfx.filtersFocusContext = false;
      gfx.setFilterSize(filterW, filterH);
      gfx.filterCamera.setZoom(px);
      gfx.filterCamera.centerOn(tube.w / 2, tube.h / 2);
      gfx.filters!.internal.clear();
      gfx.filters!.internal.addGlow(
        BONUS_COLORS.fill,
        glow.outerStrength,
        0,
        1,
        true,
        NEON_BAR_GLOW_QUALITY,
        reach,
      );
    } catch {
      gfx.clear();
      gfx.setVisible(false);
      return "";
    }
  }
  gfx.clear();
  paintNeonBarTube(gfx, local, { forGlow: true });
  return key;
}
