import { parseLineArt, type LineArt } from "./lineArt";

export const DOTMAN_MOUTH_OPEN_HALF_DEG = 48;
/** Closed half-angle: chord on r12 stays ≥ default stroke so every ring keeps a gap. */
export const DOTMAN_MOUTH_CLOSED_HALF_DEG = 16;

export const DOTMAN_OUTER_RADIUS = 44;
export const DOTMAN_MID_RADIUS = 28;
export const DOTMAN_INNER_RADIUS = 12;
export const DOTMAN_BEND_RADIUS = 8;
export const DOTMAN_BODY_RADIUS = 47;
export const DOTMAN_VIEW = 100;

/** Travel (px) between mouth beats at chomp speed 1×. Higher speed → fewer px → faster chomp. */
export const DOTMAN_CHOMP_PIXELS_AT_1X = 12;
export const DOTMAN_CHOMP_SPEED_DEFAULT = 2;

export function dotManChompPixelsPerFrame(speed: number): number {
  return DOTMAN_CHOMP_PIXELS_AT_1X / Math.max(speed, 0.01);
}

/** Travel (px) per mouth beat at the default chomp speed (2×). */
export const DOTMAN_CHOMP_PIXELS_PER_FRAME = dotManChompPixelsPerFrame(DOTMAN_CHOMP_SPEED_DEFAULT);

const MOUTH_MID_HALF_DEG = (DOTMAN_MOUTH_OPEN_HALF_DEG + DOTMAN_MOUTH_CLOSED_HALF_DEG) / 2;

export const DOTMAN_CHOMP_MOUTH_HALF_DEG = [
  DOTMAN_MOUTH_OPEN_HALF_DEG,
  MOUTH_MID_HALF_DEG,
  DOTMAN_MOUTH_CLOSED_HALF_DEG,
  MOUTH_MID_HALF_DEG,
] as const;

/** Pixel Pac-Man texture frames for the same open→mid→closed→mid beat. */
export const DOTMAN_CHOMP_PIXEL_FRAMES = [1, 2, 3, 2] as const;

export type DotManChomp = { carry: number; cycleIndex: number };

export function dotManMouthHalfAngle(cycleIndex: number, moving: boolean): number {
  if (!moving) {
    return DOTMAN_MOUTH_OPEN_HALF_DEG;
  }
  return DOTMAN_CHOMP_MOUTH_HALF_DEG[cycleIndex % DOTMAN_CHOMP_MOUTH_HALF_DEG.length]!;
}

export function advanceDotManChomp(
  chomp: DotManChomp,
  distancePx: number,
  pixelsPerFrame: number = DOTMAN_CHOMP_PIXELS_PER_FRAME,
): DotManChomp {
  let carry = chomp.carry + distancePx;
  let cycleIndex = chomp.cycleIndex;
  while (carry >= pixelsPerFrame) {
    carry -= pixelsPerFrame;
    cycleIndex = (cycleIndex + 1) % DOTMAN_CHOMP_MOUTH_HALF_DEG.length;
  }
  return { carry, cycleIndex };
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function lip(radius: number, sign: 1 | -1, halfRad: number): string {
  const a = sign * halfRad;
  return `${fmt(DOTMAN_VIEW / 2 + radius * Math.cos(a))} ${fmt(DOTMAN_VIEW / 2 + radius * Math.sin(a))}`;
}

export function dotManMouthSvg(halfAngleDeg: number): string {
  const half = (halfAngleDeg * Math.PI) / 180;
  const ou = lip(DOTMAN_OUTER_RADIUS, -1, half);
  const ol = lip(DOTMAN_OUTER_RADIUS, 1, half);
  const mu = lip(DOTMAN_MID_RADIUS, -1, half);
  const ml = lip(DOTMAN_MID_RADIUS, 1, half);
  const iu = lip(DOTMAN_INNER_RADIUS, -1, half);
  const il = lip(DOTMAN_INNER_RADIUS, 1, half);
  const bu = lip(DOTMAN_BODY_RADIUS, -1, half);
  const bl = lip(DOTMAN_BODY_RADIUS, 1, half);
  const b = DOTMAN_BEND_RADIUS;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DOTMAN_VIEW} ${DOTMAN_VIEW}" width="${DOTMAN_VIEW}" height="${DOTMAN_VIEW}">
  <path id="body" stroke="none" fill="currentColor" fill-opacity="0.2"
    d="M50 50 L${bu} A${DOTMAN_BODY_RADIUS} ${DOTMAN_BODY_RADIUS} 0 1 0 ${bl} Z" />
  <path id="pipe" stroke="currentColor" fill="none" stroke-width="6.5" stroke-linecap="round"
    d="M${ou} A${DOTMAN_OUTER_RADIUS} ${DOTMAN_OUTER_RADIUS} 0 1 0 ${ol} A${b} ${b} 0 0 0 ${ml} A${DOTMAN_MID_RADIUS} ${DOTMAN_MID_RADIUS} 0 1 1 ${mu} A${b} ${b} 0 0 1 ${iu} A${DOTMAN_INNER_RADIUS} ${DOTMAN_INNER_RADIUS} 0 1 0 ${il}" />
</svg>
`;
}

const mouthArtByTenth = new Map<number, LineArt>();

export function dotManMouthArt(halfAngleDeg: number): LineArt {
  const key = Math.round(halfAngleDeg * 10);
  let art = mouthArtByTenth.get(key);
  if (art === undefined) {
    art = parseLineArt(dotManMouthSvg(key / 10));
    mouthArtByTenth.set(key, art);
  }
  return art;
}
