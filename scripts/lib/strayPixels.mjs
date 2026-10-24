const SOLID_BRIGHTNESS = 380;
const DIM_BRIGHTNESS = 200;
const MIN_SOLID_PER_ROW = 8;
const MIN_BAND_ROWS = 6;
const ROWS_CHECKED_BELOW_BAND = 6;

function brightness(data, offset) {
  return data[offset] + data[offset + 1] + data[offset + 2];
}

// Counts dim pixels in the empty rows directly under each band of bright text, where
// texture-edge bleed (a neighboring atlas row or clamped sprite edge) shows up as dashes.
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

// Returns the RGBA bytes as one base64 string: a plain number array of a hi-DPI frame
// costs gigabytes of node heap in Playwright's per-value serializer.
export async function readPixels(page, pngBuffer) {
  const { base64, width, height } = await page.evaluate(async (png) => {
    const bytes = Uint8Array.from(atob(png), (char) => char.charCodeAt(0));
    const bitmap = await globalThis.createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = new globalThis.OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    const chunks = [];
    for (let start = 0; start < data.length; start += 0x8000) {
      chunks.push(String.fromCharCode(...data.subarray(start, start + 0x8000)));
    }
    return { base64: btoa(chunks.join("")), width, height };
  }, pngBuffer.toString("base64"));
  return { data: new Uint8Array(Buffer.from(base64, "base64")), width, height };
}
