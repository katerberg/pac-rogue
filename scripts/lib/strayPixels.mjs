const SOLID_BRIGHTNESS = 380;
const DIM_BRIGHTNESS = 200;
const MIN_SOLID_PER_ROW = 8;
const MIN_BAND_ROWS = 6;
const ROWS_CHECKED_BELOW_BAND = 6;

function brightness(data, offset) {
  return data[offset] + data[offset + 1] + data[offset + 2];
}

// Counts dim pixels in the empty rows directly under each band of bright text, where
// texture-edge bleed (a neighbouring atlas row or clamped sprite edge) shows up as dashes.
export function strayPixelsBelowText({ data, width, height }) {
  const solid = new Array(height).fill(0);
  const dim = new Array(height).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const level = brightness(data, (y * width + x) * 4);
      if (level > SOLID_BRIGHTNESS) {
        solid[y] += 1;
      }
      if (level > DIM_BRIGHTNESS) {
        dim[y] += 1;
      }
    }
  }

  let stray = 0;
  let y = 0;
  while (y < height) {
    if (solid[y] < MIN_SOLID_PER_ROW) {
      y += 1;
      continue;
    }
    const top = y;
    while (y < height && solid[y] >= MIN_SOLID_PER_ROW) {
      y += 1;
    }
    if (y - top < MIN_BAND_ROWS) {
      continue;
    }
    for (let below = y; below < Math.min(height, y + ROWS_CHECKED_BELOW_BAND); below += 1) {
      if (solid[below] === 0) {
        stray += dim[below];
      }
    }
  }
  return stray;
}

export async function readPixels(page, pngBuffer) {
  return page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const bitmap = await globalThis.createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = new globalThis.OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return { data: Array.from(data), width, height };
  }, pngBuffer.toString("base64"));
}
