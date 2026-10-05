import Phaser from "phaser";
import type { GhostLineArtLook } from "../../domain/ghostArt";
import type { LineArt, LinePaint } from "../../domain/lineArt";

export const CLYDE_LINE_COLOR = 0xffb852;
const LINE_GLOW_QUALITY = 24;

export type LineArtObject = {
  art: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics | null;
  color: number;
  look: GhostLineArtLook;
};

function resolvePaint(paint: Exclude<LinePaint, "none">, color: number): number {
  return paint === "currentColor" ? color : paint;
}

function drawStrands(
  g: Phaser.GameObjects.Graphics,
  art: LineArt,
  color: number,
  look: GhostLineArtLook,
  strokesOnly: boolean,
): void {
  g.clear();
  const cx = art.width / 2;
  const cy = art.height / 2;
  for (const strand of art.strands) {
    const points = strand.points.map(
      (p) => new Phaser.Math.Vector2((p.x - cx) * look.widthScale, p.y - cy),
    );
    if (strand.fill !== "none" && !strokesOnly) {
      g.fillStyle(resolvePaint(strand.fill, color), strand.fillOpacity);
      g.fillPoints(points, true);
    }
    if (strand.stroke !== "none") {
      g.lineStyle(look.lineWidth * art.width, resolvePaint(strand.stroke, color), 1);
      g.strokePoints(points, strand.closed, strand.closed);
    }
  }
}

export function createLineArtObject(
  scene: Phaser.Scene,
  art: LineArt,
  color: number,
  size: number,
  look: GhostLineArtLook,
  withGlow: boolean,
): LineArtObject {
  const scale = size / art.width;
  let glow: Phaser.GameObjects.Graphics | null = null;
  if (withGlow && look.glow !== null) {
    glow = scene.add.graphics().setScale(scale);
    drawStrands(glow, art, color, look, true);
    // Graphics have no bounds, so Phaser would filter the whole screen every frame.
    // Focus the filter on the art box plus the glow reach (one texel per viewBox unit).
    const reach = Math.ceil(look.glow.distancePx / scale);
    glow.enableFilters();
    glow.filtersAutoFocus = false;
    glow.filtersFocusContext = false;
    glow.setFilterSize(
      Math.ceil(art.width * Math.max(1, look.widthScale)) + 2 * reach,
      art.height + 2 * reach,
    );
    glow.filterCamera.setZoom(1 / scale);
    glow.filters!.internal.addGlow(
      color,
      look.glow.outerStrength,
      0,
      1,
      true,
      LINE_GLOW_QUALITY,
      reach,
    );
  }
  const artGraphics = scene.add.graphics().setScale(scale);
  drawStrands(artGraphics, art, color, look, false);
  return { art: artGraphics, glow, color, look };
}

export function restyleLineArtObject(obj: LineArtObject, art: LineArt, color: number): void {
  drawStrands(obj.art, art, color, obj.look, false);
  if (obj.glow !== null) {
    drawStrands(obj.glow, art, color, obj.look, true);
    (obj.glow.filters!.internal.list[0] as Phaser.Filters.Glow).color = color;
  }
  obj.color = color;
}

export function placeLineArtObject(obj: LineArtObject, x: number, y: number, alpha: number): void {
  obj.art.setPosition(x, y).setAlpha(alpha);
  if (obj.glow !== null) {
    obj.glow.setPosition(x, y).setAlpha(alpha);
    obj.glow.filterCamera.centerOn(x, y);
  }
}

export function destroyLineArtObject(obj: LineArtObject): void {
  obj.art.destroy();
  obj.glow?.destroy();
}
