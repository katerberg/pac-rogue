// Pixel art stays pixel-perfect only when every art pixel covers the same whole number of
// device pixels and the art's edges land on device-pixel boundaries.

const QUARTER_TURN = Math.PI / 2;
const TURN_EPSILON = 1e-6;

// Below half a device pixel per art pixel the art cannot be crisp, so it keeps its size.
export function crispDevicePx(devicePx: number, artPx: number): number {
  const perArtPx = Math.round(devicePx / artPx);
  return perArtPx < 1 ? devicePx : perArtPx * artPx;
}

export function crispWorldPx(worldPx: number, artPx: number, renderScale: number): number {
  return crispDevicePx(worldPx * renderScale, artPx) / renderScale;
}

export function snapToDevicePx(world: number, renderScale: number): number {
  return Math.round(world * renderScale) / renderScale;
}

function quarterTurns(rotation: number): number | null {
  const turns = Math.round(rotation / QUARTER_TURN);
  return Math.abs(rotation - turns * QUARTER_TURN) < TURN_EPSILON ? turns : null;
}

export type ArtQuad = {
  x: number;
  y: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
  rotation: number;
};

/** Local → device: `device = offset + local * scale`. */
export type DeviceTransform = { offsetX: number; offsetY: number; scaleX: number; scaleY: number };

/**
 * Resize a pixel-art quad to whole device pixels per art pixel and nudge its position so its
 * edges sit on the device grid. Arbitrary rotations or mirrored parents keep their position.
 */
export function crispArtQuad(
  quad: ArtQuad,
  artWidth: number,
  artHeight: number,
  toDevice: DeviceTransform,
): { x: number; y: number; width: number; height: number } {
  const { offsetX, offsetY, scaleX, scaleY } = toDevice;
  const deviceW = crispDevicePx(quad.width * Math.abs(scaleX), artWidth);
  const deviceH = crispDevicePx(quad.height * Math.abs(scaleY), artHeight);
  const width = deviceW / Math.abs(scaleX);
  const height = deviceH / Math.abs(scaleY);
  const turns = quarterTurns(quad.rotation);
  const centered = quad.originX === 0.5 && quad.originY === 0.5;
  if (scaleX <= 0 || scaleY <= 0 || turns === null || (turns !== 0 && !centered)) {
    return { x: quad.x, y: quad.y, width, height };
  }
  const swapped = turns % 2 !== 0;
  const left = offsetX + quad.x * scaleX - quad.originX * (swapped ? deviceH : deviceW);
  const top = offsetY + quad.y * scaleY - quad.originY * (swapped ? deviceW : deviceH);
  return {
    x: quad.x + (Math.round(left) - left) / scaleX,
    y: quad.y + (Math.round(top) - top) / scaleY,
    width,
    height,
  };
}
