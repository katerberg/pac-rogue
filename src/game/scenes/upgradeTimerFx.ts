import type Phaser from "phaser";
import type { BaseUpgradeId } from "../../domain/upgrades";

const DRAIN_SHADE_ALPHA = 0.65;
const DRAIN_LINE_COLOR = 0xffffff;
const DRAIN_LINE_ALPHA = 0.9;
const PULSE_SCALE = 1.4;
const PULSE_MS = 110;

export type UpgradeMark = {
  id: BaseUpgradeId;
  mark: Phaser.GameObjects.Image | Phaser.GameObjects.Shape;
};

export function drawUpgradeDrain(
  gfx: Phaser.GameObjects.Graphics,
  marks: readonly UpgradeMark[],
  fractions: Partial<Record<BaseUpgradeId, number>>,
): void {
  gfx.clear();
  for (const { id, mark } of marks) {
    const fraction = fractions[id];
    if (fraction === undefined || !mark.visible) {
      continue;
    }
    const w = mark.displayWidth;
    const h = mark.displayHeight;
    const left = Math.round(mark.x - w / 2);
    const top = Math.round(mark.y - h / 2);
    const drained = Math.round(h * (1 - fraction));
    gfx.fillStyle(0x000000, DRAIN_SHADE_ALPHA).fillRect(left, top, w, drained);
    gfx.fillStyle(DRAIN_LINE_COLOR, DRAIN_LINE_ALPHA).fillRect(left, top + drained, w, 1);
  }
}

export function pulseUpgradeMarks(
  scene: Phaser.Scene,
  marks: readonly UpgradeMark[],
  ids: readonly BaseUpgradeId[],
): void {
  for (const { id, mark } of marks) {
    if (!ids.includes(id) || scene.tweens.isTweening(mark)) {
      continue;
    }
    scene.tweens.add({
      targets: mark,
      scaleX: mark.scaleX * PULSE_SCALE,
      scaleY: mark.scaleY * PULSE_SCALE,
      duration: PULSE_MS,
      yoyo: true,
    });
  }
}
