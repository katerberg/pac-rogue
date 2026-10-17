/** Travel (px) between mouth beats at chomp speed 1×. Higher speed → fewer px → faster chomp. */
export const DOTMAN_CHOMP_PIXELS_AT_1X = 12;
export const DOTMAN_CHOMP_SPEED_DEFAULT = 1.25;

export function dotManChompPixelsPerFrame(speed: number): number {
  return DOTMAN_CHOMP_PIXELS_AT_1X / Math.max(speed, 0.01);
}

/** Travel (px) per mouth beat at the default chomp speed. */
export const DOTMAN_CHOMP_PIXELS_PER_FRAME = dotManChompPixelsPerFrame(DOTMAN_CHOMP_SPEED_DEFAULT);

export const DOTMAN_CHOMP_BEATS = 4;

export const DOTMAN_VISOR_BOB_ART_PX = 1;

export type DotManChomp = { carry: number; cycleIndex: number };

export function advanceDotManChomp(
  chomp: DotManChomp,
  distancePx: number,
  pixelsPerFrame: number = DOTMAN_CHOMP_PIXELS_PER_FRAME,
): DotManChomp {
  let carry = chomp.carry + distancePx;
  let cycleIndex = chomp.cycleIndex;
  while (carry >= pixelsPerFrame) {
    carry -= pixelsPerFrame;
    cycleIndex = (cycleIndex + 1) % DOTMAN_CHOMP_BEATS;
  }
  return { carry, cycleIndex };
}

export function dotManVisorLift(
  chomp: DotManChomp,
  pixelsPerFrame: number = DOTMAN_CHOMP_PIXELS_PER_FRAME,
): number {
  const cycle = (chomp.cycleIndex + chomp.carry / pixelsPerFrame) / DOTMAN_CHOMP_BEATS;
  return (DOTMAN_VISOR_BOB_ART_PX * (1 - Math.cos(2 * Math.PI * cycle))) / 2;
}
