import { describe, expect, it } from "vitest";
import { strayPixelsBelowText } from "./strayPixels.mjs";

const WIDTH = 40;
const HEIGHT = 30;
const TEXT_TOP = 8;
const TEXT_ROWS = 8;

function canvasWithText() {
  const data = new Array(WIDTH * HEIGHT * 4).fill(0);
  for (let y = TEXT_TOP; y < TEXT_TOP + TEXT_ROWS; y += 1) {
    for (let x = 5; x < 35; x += 1) {
      data.fill(255, (y * WIDTH + x) * 4, (y * WIDTH + x) * 4 + 3);
    }
  }
  return { data, width: WIDTH, height: HEIGHT };
}

function setPixel(image, x, y, level) {
  const offset = (y * WIDTH + x) * 4;
  image.data.fill(level, offset, offset + 3);
}

describe("strayPixelsBelowText", () => {
  it("is zero for clean text", () => {
    expect(strayPixelsBelowText(canvasWithText())).toBe(0);
  });

  it("counts dim dashes in the rows under a text band", () => {
    const image = canvasWithText();
    for (const x of [6, 7, 8, 20, 21]) {
      setPixel(image, x, TEXT_TOP + TEXT_ROWS, 120);
    }
    expect(strayPixelsBelowText(image)).toBe(5);
  });

  it("ignores dim pixels far from any text band", () => {
    const image = canvasWithText();
    setPixel(image, 3, 28, 120);
    expect(strayPixelsBelowText(image)).toBe(0);
  });

  it("ignores thin bright features that are not text bands", () => {
    const image = { data: new Array(WIDTH * HEIGHT * 4).fill(0), width: WIDTH, height: HEIGHT };
    for (let x = 0; x < WIDTH; x += 1) {
      setPixel(image, x, 10, 255);
      setPixel(image, x, 11, 120);
    }
    expect(strayPixelsBelowText(image)).toBe(0);
  });
});
