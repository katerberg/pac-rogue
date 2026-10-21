import { describe, expect, it } from "vitest";
import { crispArtQuad, crispDevicePx, crispWorldPx, snapToDevicePx } from "./pixelArt";

const quad = (over: Partial<Parameters<typeof crispArtQuad>[0]> = {}) => ({
  x: 20,
  y: 16,
  width: 16,
  height: 16,
  originX: 0.5,
  originY: 0.5,
  rotation: 0,
  ...over,
});

const device = (scale: number) => ({ offsetX: 0, offsetY: 0, scaleX: scale, scaleY: scale });

function deviceEdges(q: ReturnType<typeof crispArtQuad>, scale: number, origin = 0.5) {
  return {
    left: (q.x - origin * q.width) * scale,
    top: (q.y - origin * q.height) * scale,
    width: q.width * scale,
    height: q.height * scale,
  };
}

describe("crispDevicePx", () => {
  it("rounds to a whole number of device pixels per art pixel", () => {
    expect(crispDevicePx(52.4, 16)).toBe(48);
    expect(crispDevicePx(58, 16)).toBe(64);
    expect(crispDevicePx(18, 16)).toBe(16);
  });

  it("keeps sizes too small to be crisp as they are", () => {
    expect(crispDevicePx(7, 16)).toBe(7);
    expect(crispDevicePx(0, 16)).toBe(0);
  });
});

describe("crispWorldPx / snapToDevicePx", () => {
  it("maps a world size to whole device pixels per art pixel at the render scale", () => {
    expect(crispWorldPx(16, 16, 3.25) * 3.25).toBeCloseTo(48);
    expect(crispWorldPx(19.6, 16, 1.5) * 1.5).toBeCloseTo(32);
  });

  it("snaps a world coordinate onto the device grid", () => {
    expect(snapToDevicePx(10.1, 2)).toBe(10);
    expect(snapToDevicePx(10.3, 2)).toBe(10.5);
  });
});

describe("crispArtQuad", () => {
  it("sizes and places a quarter at a fractional scale on whole device pixels", () => {
    const scale = 3.273;
    const edges = deviceEdges(crispArtQuad(quad(), 16, 16, device(scale)), scale);
    expect(edges.width).toBeCloseTo(48);
    expect(edges.height).toBeCloseTo(48);
    expect(edges.left).toBeCloseTo(Math.round(edges.left));
    expect(edges.top).toBeCloseTo(Math.round(edges.top));
  });

  it("gives every copy of the art the same device size wherever it sits", () => {
    const scale = 1.125;
    for (const x of [12, 12.5, 33.3, 100.75]) {
      const edges = deviceEdges(crispArtQuad(quad({ x }), 16, 16, device(scale)), scale);
      expect(edges.width).toBeCloseTo(16);
      expect(edges.left).toBeCloseTo(Math.round(edges.left));
    }
  });

  it("honors a non-centered origin", () => {
    const scale = 1.7;
    const q = crispArtQuad(quad({ originX: 0, originY: 0 }), 16, 16, device(scale));
    const edges = deviceEdges(q, scale, 0);
    expect(edges.width).toBeCloseTo(32);
    expect(edges.left).toBeCloseTo(Math.round(edges.left));
  });

  it("accounts for a scaled, offset parent", () => {
    const toDevice = { offsetX: 7.3, offsetY: 2.9, scaleX: 1.5 * 2.2, scaleY: 1.5 * 2.2 };
    const q = crispArtQuad(quad({ width: 8, height: 8 }), 16, 16, toDevice);
    const left = toDevice.offsetX + (q.x - q.width / 2) * toDevice.scaleX;
    expect(q.width * toDevice.scaleX).toBeCloseTo(32);
    expect(left).toBeCloseTo(Math.round(left));
  });

  it("snaps centered quarter turns but leaves free rotations in place", () => {
    const scale = 2.6;
    const turned = crispArtQuad(quad({ rotation: -Math.PI / 2 }), 16, 16, device(scale));
    const edges = deviceEdges(turned, scale);
    expect(edges.left).toBeCloseTo(Math.round(edges.left));
    const tilted = crispArtQuad(quad({ rotation: 0.3 }), 16, 16, device(scale));
    expect(tilted).toMatchObject({ x: 20, y: 16 });
    expect(tilted.width * scale).toBeCloseTo(48);
  });

  it("leaves the position of mirrored parents alone", () => {
    const q = crispArtQuad(quad(), 16, 16, { offsetX: 0, offsetY: 0, scaleX: -1.3, scaleY: 1.3 });
    expect(q).toMatchObject({ x: 20, y: 16 });
  });
});
