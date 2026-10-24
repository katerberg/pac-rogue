import type Phaser from "phaser";
import { clamp } from "../../domain/clamp";
import { hoverPreviewX } from "../../domain/learnUpgradeColumns";
import { UPGRADE_HUD_HOVER_SCALE } from "../../domain/upgradeHud";
import { getUpgradeDef, type UpgradeId } from "../../domain/upgrades";
import { buildUpgradeCardVisual, type UpgradeCardVisual } from "./upgradeChoiceModal";

const PREVIEW_Y_MIN = 90;
const PREVIEW_Y_MAX = 510;

export type UpgradeHoverSlot = { id: UpgradeId; copies: number; size: number };

export type UpgradeHoverPreview = {
  attach(icon: Phaser.GameObjects.Image | Phaser.GameObjects.Shape, slot: UpgradeHoverSlot): void;
  show(slot: UpgradeHoverSlot, pointerY: number): void;
  hide(): void;
};

export function createUpgradeHoverPreview(scene: Phaser.Scene, depth: number): UpgradeHoverPreview {
  let visual: UpgradeCardVisual | null = null;

  function hide(): void {
    visual?.root.destroy(true);
    visual = null;
  }

  function show({ id, copies }: UpgradeHoverSlot, pointerY: number): void {
    hide();
    const def = getUpgradeDef(id);
    visual = buildUpgradeCardVisual(
      scene,
      hoverPreviewX("right"),
      clamp(pointerY, PREVIEW_Y_MIN, PREVIEW_Y_MAX),
      {
        label: copies > 1 ? `${def.label} x${copies}` : def.label,
        description: def.description,
        school: def.school,
        rare: def.rare === true,
      },
    );
    visual.root.setDepth(depth);
  }

  return {
    attach(icon, slot) {
      icon.setInteractive({ useHandCursor: true });
      icon.on("pointerover", (pointer: Phaser.Input.Pointer) => {
        icon.setDisplaySize(
          slot.size * UPGRADE_HUD_HOVER_SCALE,
          slot.size * UPGRADE_HUD_HOVER_SCALE,
        );
        show(slot, pointer.worldY);
      });
      icon.on("pointerout", () => {
        icon.setDisplaySize(slot.size, slot.size);
        hide();
      });
    },
    show,
    hide,
  };
}
