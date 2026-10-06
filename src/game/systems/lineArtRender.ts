import Phaser from "phaser";
import type { GhostLineArtLook } from "../../domain/ghostArt";
import type { LineArt, LinePaint } from "../../domain/lineArt";

const LINE_GLOW_QUALITY = 24;
// The glow is filtered without anti-aliasing, so its silhouette edge is jagged. Its outline is
// this much narrower (canvas px) than the crisp one, keeping that edge hidden under the stroke.
const GLOW_SOURCE_INSET_PX = 2;

export type LineArtObject = {
  art: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics | null;
  color: number;
  backdrop: number;
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
  backdrop: number | null,
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
      // backdrop null = glow source: an opaque silhouette makes the Glow emit only outside.
      // Otherwise translucent fills sit on an opaque backdrop so nothing shows through.
      if (backdrop !== null && strand.fillOpacity < 1) {
        g.fillStyle(backdrop, 1);
        g.fillPoints(points, true);
      }
      g.fillStyle(resolvePaint(strand.fill, color), backdrop === null ? 1 : strand.fillOpacity);
      g.fillPoints(points, true);
    }
    if (strand.stroke !== "none") {
      const width = look.lineWidth * art.width * unit;
      g.lineStyle(
        backdrop === null ? Math.max(0, width - GLOW_SOURCE_INSET_PX) : width,
        resolvePaint(strand.stroke, color),
        1,
      );
      g.strokePoints(points, strand.closed, strand.closed);
    }
  }
}

export function createLineArtObject(
  scene: Phaser.Scene,
  art: LineArt,
  color: number,
  backdrop: number,
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
    drawStrands(glow, art, color, look, null, glowUnit);
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
  drawStrands(artGraphics, art, color, look, backdrop);
  return { art: artGraphics, glow, color, backdrop, look, glowUnit };
}

export function restyleLineArtObject(
  obj: LineArtObject,
  art: LineArt,
  color: number,
  backdrop: number,
): void {
  drawStrands(obj.art, art, color, obj.look, backdrop);
  if (obj.glow !== null) {
    drawStrands(obj.glow, art, color, obj.look, null, obj.glowUnit);
    (obj.glow.filters!.internal.list[0] as Phaser.Filters.Glow).color = color;
  }
  obj.color = color;
  obj.backdrop = backdrop;
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
