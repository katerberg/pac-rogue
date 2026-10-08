import { AUDIO_LEVEL_MAX } from "./audioSettings";
import { BONUS_COLORS, BONUS_NEON_TRACK, bonusBarGlowFilter, type NeonBarTube } from "./bonusBarFx";
import type { GhostStyle } from "./ghostArt";

const DIM_COLORS = {
  frame: 0x11116f,
  fill: 0x666600,
  highlight: 0x888855,
  track: 0x050520,
} as const;

/** NEON/LINED use the bonus-style capsule tube; PIXEL keeps the notched slider. */
export function settingsVolumeUsesNeonTube(style: GhostStyle): boolean {
  return style !== "pixel";
}

export function settingsVolumeTube(
  level: number,
  layout: { x: number; y: number; w: number; h: number },
  enabled: boolean,
): NeonBarTube {
  const fillFrac = Math.max(0, Math.min(1, level / AUDIO_LEVEL_MAX));
  if (!enabled) {
    return {
      x: layout.x,
      y: layout.y,
      w: layout.w,
      h: layout.h,
      fillFrac,
      fillColor: DIM_COLORS.fill,
      coreColor: DIM_COLORS.highlight,
      frameColor: DIM_COLORS.frame,
      trackColor: DIM_COLORS.track,
    };
  }
  return {
    x: layout.x,
    y: layout.y,
    w: layout.w,
    h: layout.h,
    fillFrac,
    fillColor: BONUS_COLORS.fill,
    coreColor: BONUS_COLORS.highlight,
    frameColor: BONUS_COLORS.frame,
    trackColor: BONUS_NEON_TRACK,
  };
}

/** Same knockout glow as the HUD bonus bar; NEON only. */
export const settingsVolumeGlowFilter = bonusBarGlowFilter;
