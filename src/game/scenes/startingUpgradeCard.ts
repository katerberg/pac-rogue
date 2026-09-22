import Phaser from "phaser";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import { getUpgradeDef, type UpgradeId } from "../../domain/upgrades";
import {
  addPixelText,
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";
import {
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  DESCRIPTION_MAX_CHARS,
  LABEL_MAX_CHARS,
  MODAL_DEPTH,
  wrapText,
} from "./upgradeChoiceModal";

export const STARTING_UPGRADE_HOLD_MS = 2000;
export const STARTING_UPGRADE_FADE_MS = 1000;

export type StartingUpgradeCard = {
  isActive: () => boolean;
  open: (id: UpgradeId) => void;
  tick: (deltaMs: number) => void;
  destroy: () => void;
};

export function createStartingUpgradeCard(scene: Phaser.Scene): StartingUpgradeCard {
  let elapsedMs = 0;
  let dim: Phaser.GameObjects.Rectangle | null = null;
  let card: Phaser.GameObjects.Container | null = null;

  const clearViews = (): void => {
    dim?.destroy();
    dim = null;
    card?.destroy(true);
    card = null;
  };

  return {
    isActive: () => card !== null,
    open: (id) => {
      clearViews();
      elapsedMs = 0;
      const def = getUpgradeDef(id);
      dim = scene.add
        .rectangle(
          PLAYFIELD_WIDTH / 2,
          PLAYFIELD_HEIGHT / 2,
          PLAYFIELD_WIDTH,
          PLAYFIELD_HEIGHT,
          0x000000,
          0.65,
        )
        .setDepth(MODAL_DEPTH);
      const bg = scene.add
        .rectangle(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, 0x101820)
        .setStrokeStyle(4, TEXT_COLOR_YELLOW);
      const header = addPixelText(
        scene,
        0,
        0,
        "STARTING UPGRADE",
        MENU_OPTION_FONT_SIZE,
        TEXT_COLOR_WHITE,
      );
      const label = addPixelText(
        scene,
        0,
        0,
        wrapText(def.label, LABEL_MAX_CHARS),
        MENU_TITLE_FONT_SIZE,
        TEXT_COLOR_YELLOW,
      );
      const description = addPixelText(
        scene,
        0,
        0,
        wrapText(def.description, DESCRIPTION_MAX_CHARS),
        UPGRADES_HUD_FONT_SIZE,
        TEXT_COLOR_WHITE,
      );
      placePixelText(header, 0, -84, 0.5, 0.5);
      placePixelText(label, 0, -24, 0.5, 0.5);
      placePixelText(description, 0, 52, 0.5, 0.5);
      card = scene.add
        .container(PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2, [bg, header, label, description])
        .setDepth(MODAL_DEPTH + 1);
    },
    tick: (deltaMs) => {
      if (card === null) {
        return;
      }
      elapsedMs += Math.min(deltaMs, 50);
      const fadeProgress = Math.max(
        0,
        Math.min(1, (elapsedMs - STARTING_UPGRADE_HOLD_MS) / STARTING_UPGRADE_FADE_MS),
      );
      dim?.setAlpha(1 - fadeProgress);
      card.setAlpha(1 - fadeProgress);
      if (fadeProgress >= 1) {
        clearViews();
      }
    },
    destroy: clearViews,
  };
}
