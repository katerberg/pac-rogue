import { brightenColor } from "./playerTint";

/** How much lighter gutter bands are than the maze background (toward white). */
export const SIDEBAR_BRIGHTEN = 0.1;

/** Soft seam width in world pixels between solid sidebar and maze column. */
export const SIDEBAR_FADE_PX = 2;

export type SidebarBandRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
};

export function sidebarBackgroundColor(mazeBackground: number): number {
  return brightenColor(mazeBackground, SIDEBAR_BRIGHTEN);
}

/**
 * Full-height left/right gutter fills plus a stepped soft fade into the maze
 * column. Camera clear stays `mazeBackground`; only these rects are painted.
 */
export function sidebarBandRects(args: {
  playfieldWidth: number;
  playfieldHeight: number;
  mazeOffsetX: number;
  mazePixelWidth: number;
  mazeBackground: number;
}): readonly SidebarBandRect[] {
  const { playfieldWidth, playfieldHeight, mazeOffsetX, mazePixelWidth, mazeBackground } = args;
  if (playfieldWidth <= 0 || playfieldHeight <= 0) {
    return [];
  }

  const solid = sidebarBackgroundColor(mazeBackground);
  const mazeRight = mazeOffsetX + mazePixelWidth;
  const rects: SidebarBandRect[] = [];

  pushSide(rects, {
    solidStart: 0,
    solidEnd: mazeOffsetX,
    fadeTowardMaze: true,
    height: playfieldHeight,
    mazeBackground,
    solid,
  });
  pushSide(rects, {
    solidStart: mazeRight,
    solidEnd: playfieldWidth,
    fadeTowardMaze: false,
    height: playfieldHeight,
    mazeBackground,
    solid,
  });

  return rects;
}

function fadeBrighten(stepFromMaze: number): number {
  // stepFromMaze: 1 = nearest maze (dimmest lift), FADE_PX = farthest (strongest).
  return (SIDEBAR_BRIGHTEN * stepFromMaze) / (SIDEBAR_FADE_PX + 1);
}

function pushSide(
  rects: SidebarBandRect[],
  args: {
    solidStart: number;
    solidEnd: number;
    fadeTowardMaze: boolean;
    height: number;
    mazeBackground: number;
    solid: number;
  },
): void {
  const { solidStart, solidEnd, fadeTowardMaze, height, mazeBackground, solid } = args;
  const gutter = solidEnd - solidStart;
  if (gutter <= 0) {
    return;
  }

  const fadePx = Math.min(SIDEBAR_FADE_PX, gutter);
  const solidWidth = gutter - fadePx;

  if (fadeTowardMaze) {
    if (solidWidth > 0) {
      rects.push({ x: solidStart, y: 0, w: solidWidth, h: height, color: solid });
    }
    for (let i = 0; i < fadePx; i += 1) {
      // i=0 farthest from maze (stronger), i=fadePx-1 nearest maze (weaker).
      const stepFromMaze = fadePx - i;
      rects.push({
        x: solidStart + solidWidth + i,
        y: 0,
        w: 1,
        h: height,
        color: brightenColor(mazeBackground, fadeBrighten(stepFromMaze)),
      });
    }
    return;
  }

  for (let i = 0; i < fadePx; i += 1) {
    // i=0 nearest maze (weaker), i=fadePx-1 farthest among fade (stronger).
    const stepFromMaze = i + 1;
    rects.push({
      x: solidStart + i,
      y: 0,
      w: 1,
      h: height,
      color: brightenColor(mazeBackground, fadeBrighten(stepFromMaze)),
    });
  }
  if (solidWidth > 0) {
    rects.push({
      x: solidStart + fadePx,
      y: 0,
      w: solidWidth,
      h: height,
      color: solid,
    });
  }
}
