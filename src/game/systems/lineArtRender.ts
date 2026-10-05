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
  glowUnit: number;
};

function resolvePaint(paint: Exclude<LinePaint, "none">, color: number): number {
  return paint === "currentColor" ? color : paint;
}

function drawStrands(
  g: Phaser.GameObjects.Graphics,
  art: LineArt,
  color: number,
  look: GhostLineArtLook,
  glowSource: boolean,
  unit = 1,
): void {
  g.clear();
  const cx = art.width / 2;
  const cy = art.height / 2;
  for (const strand of art.strands) {
    const points = strand.points.map(
      (p) =>
        new Phaser.Math.Vector2(
          (p.x - cx) * look.widthScale * unit,
          (p.y - cy) * look.heightScale * unit,
        ),
    );
    if (strand.fill !== "none") {
      // An opaque silhouette makes the Glow filter emit only outside the body.
      g.fillStyle(resolvePaint(strand.fill, color), glowSource ? 1 : strand.fillOpacity);
      g.fillPoints(points, true);
    }
    if (strand.stroke !== "none") {
      g.lineStyle(look.lineWidth * art.width * unit, resolvePaint(strand.stroke, color), 1);
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
  pixelsPerWorld: number,
): LineArtObject {
  const scale = size / art.width;
  const glowUnit = scale * pixelsPerWorld;
  let glow: Phaser.GameObjects.Graphics | null = null;
  if (withGlow && look.glow !== null) {
    glow = scene.add.graphics().setScale(1 / pixelsPerWorld);
    drawStrands(glow, art, color, look, true, glowUnit);
    // Graphics have no bounds, so Phaser would filter the whole screen every frame.
    // Focus the filter on the art box plus the glow reach, one texel per canvas pixel.
    const reach = Math.ceil(look.glow.distancePx * pixelsPerWorld);
    glow.enableFilters();
    glow.filtersAutoFocus = false;
    glow.filtersFocusContext = false;
    glow.setFilterSize(
      Math.ceil(art.width * Math.max(1, look.widthScale) * glowUnit) + 2 * reach,
      Math.ceil(art.height * Math.max(1, look.heightScale) * glowUnit) + 2 * reach,
    );
    glow.filterCamera.setZoom(pixelsPerWorld);
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
  return { art: artGraphics, glow, color, look, glowUnit };
}

export function restyleLineArtObject(obj: LineArtObject, art: LineArt, color: number): void {
  drawStrands(obj.art, art, color, obj.look, false);
  if (obj.glow !== null) {
    drawStrands(obj.glow, art, color, obj.look, true, obj.glowUnit);
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
