import Phaser from "phaser";
import type { LineArt, LinePaint } from "../../domain/lineArt";

export const LINE_ART_STROKE_VB = 9;
export const CLYDE_LINE_COLOR = 0xffb852;
export const LINE_GLOW = { outerStrength: 3, distancePx: 4, quality: 10 } as const;

export type LineArtLook = { color: number };

// The crisp art, plus a glow-only copy of its strokes drawn underneath.
export type LineArtObject = {
  art: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics | null;
  color: number;
};

function resolvePaint(paint: Exclude<LinePaint, "none">, look: LineArtLook): number {
  return paint === "currentColor" ? look.color : paint;
}

function drawStrands(
  g: Phaser.GameObjects.Graphics,
  art: LineArt,
  look: LineArtLook,
  strokesOnly: boolean,
): void {
  g.clear();
  const cx = art.width / 2;
  const cy = art.height / 2;
  for (const strand of art.strands) {
    const points = strand.points.map((p) => new Phaser.Math.Vector2(p.x - cx, p.y - cy));
    if (strand.fill !== "none" && !strokesOnly) {
      g.fillStyle(resolvePaint(strand.fill, look), strand.fillOpacity);
      g.fillPoints(points, true);
    }
    if (strand.stroke !== "none") {
      g.lineStyle(LINE_ART_STROKE_VB, resolvePaint(strand.stroke, look), 1);
      g.strokePoints(points, strand.closed, strand.closed);
    }
  }
}

export function createLineArtObject(
  scene: Phaser.Scene,
  art: LineArt,
  look: LineArtLook,
  size: number,
  withGlow: boolean,
): LineArtObject {
  const scale = size / art.width;
  let glow: Phaser.GameObjects.Graphics | null = null;
  if (withGlow) {
    glow = scene.add.graphics().setScale(scale);
    drawStrands(glow, art, look, true);
    // Graphics have no bounds, so Phaser would filter the whole screen every frame.
    // Focus the filter on the art box plus the glow reach (one texel per viewBox unit).
    const reach = Math.ceil(LINE_GLOW.distancePx / scale);
    glow.enableFilters();
    glow.filtersAutoFocus = false;
    glow.filtersFocusContext = false;
    glow.setFilterSize(art.width + 2 * reach, art.height + 2 * reach);
    glow.filterCamera.setZoom(1 / scale);
    glow.filters!.internal.addGlow(
      look.color,
      LINE_GLOW.outerStrength,
      0,
      1,
      true,
      LINE_GLOW.quality,
      reach,
    );
  }
  const artGraphics = scene.add.graphics().setScale(scale);
  drawStrands(artGraphics, art, look, false);
  return { art: artGraphics, glow, color: look.color };
}

export function restyleLineArtObject(obj: LineArtObject, art: LineArt, look: LineArtLook): void {
  drawStrands(obj.art, art, look, false);
  if (obj.glow !== null) {
    drawStrands(obj.glow, art, look, true);
    (obj.glow.filters!.internal.list[0] as Phaser.Filters.Glow).color = look.color;
  }
  obj.color = look.color;
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

// Static glow, filtered once: \`source\` is drawn in \`target\` texels, and only its glow is kept.
export function renderGlowTexture(
  target: Phaser.GameObjects.RenderTexture,
  source: Phaser.GameObjects.Graphics,
  color: number,
  glow: { outerStrength: number; distance: number } | null,
  quality: number,
): void {
  target.clear();
  if (glow !== null) {
    source.enableFilters();
    source.filtersAutoFocus = false;
    source.filtersFocusContext = false;
    source.setFilterSize(target.width, target.height);
    source.filterCamera.setOrigin(0, 0).setScroll(0, 0);
    source.filters!.internal.clear();
    source.filters!.internal.addGlow(color, glow.outerStrength, 0, 1, true, quality, glow.distance);
    target.draw(source);
  }
  target.render();
}
