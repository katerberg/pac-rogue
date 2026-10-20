import { brightenColor } from "./playerTint";

export const SIDEBAR_BRIGHTEN = 0.1;
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

/** Camera clear stays `mazeBackground`; only these rects are painted. */
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
  return (SIDEBAR_BRIGHTEN * stepFromMaze) / SIDEBAR_FADE_PX;
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
