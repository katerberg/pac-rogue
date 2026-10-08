import Phaser from "phaser";
import { fitFontSize } from "../../domain/fitFontSize";
import { textStyleFor } from "../../domain/ghostArt";
import { wrapCharBudget } from "../../domain/neonFont/textStack";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import { getUpgradeDef, type UpgradeId } from "../../domain/upgrades";
import { wrapText } from "../../domain/wrapText";
import { loadGhostStyle } from "../storage/ghostStyleStorage";
import {
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";
import { addGameText, placeGameText } from "./neonFont";
import {
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  addSchoolTag,
  DESCRIPTION_MAX_CHARS,
  layoutCardText,
  LABEL_MAX_CHARS,
  MODAL_DEPTH,
} from "./upgradeChoiceModal";

export const STARTING_UPGRADE_HOLD_MS = 10_000;
export const STARTING_UPGRADE_FADE_MS = 100;
const STARTING_CARD_BODY_CENTER_Y = 18;
const STARTING_CARD_LABEL_MARGIN = 40;

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
  let onKeyDown: ((event: KeyboardEvent) => void) | null = null;

  const clearViews = (): void => {
    if (onKeyDown !== null) {
      scene.input.keyboard?.off("keydown", onKeyDown);
      onKeyDown = null;
    }
    dim?.destroy();
    dim = null;
    card?.destroy(true);
    card = null;
  };

  const beginFade = (): void => {
    if (elapsedMs < STARTING_UPGRADE_HOLD_MS) {
      elapsedMs = STARTING_UPGRADE_HOLD_MS;
    }
  };

  return {
    isActive: () => card !== null,
    open: (id) => {
      clearViews();
      elapsedMs = 0;
      const def = getUpgradeDef(id);
      const textStyle = textStyleFor(loadGhostStyle());
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
      const header = addGameText(
        scene,
        0,
        0,
        "STARTING UPGRADE",
        MENU_OPTION_FONT_SIZE,
        TEXT_COLOR_WHITE,
      );
      const label = addGameText(
        scene,
        0,
        0,
        wrapText(def.label, wrapCharBudget(LABEL_MAX_CHARS, textStyle)),
        fitFontSize(
          def.label,
          BUTTON_WIDTH - STARTING_CARD_LABEL_MARGIN,
          MENU_TITLE_FONT_SIZE,
          textStyle,
        ),
        TEXT_COLOR_YELLOW,
      );
      const description = addGameText(
        scene,
        0,
        0,
        wrapText(def.description, wrapCharBudget(DESCRIPTION_MAX_CHARS, textStyle)),
        UPGRADES_HUD_FONT_SIZE,
        TEXT_COLOR_WHITE,
      );
      placeGameText(header, 0, -84, 0.5, 0.5);
      const school = addSchoolTag(scene, def.school);
      layoutCardText(label, school, description, STARTING_CARD_BODY_CENTER_Y, textStyle);
      card = scene.add
        .container(PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2, [
          bg,
          header,
          label,
          school,
          description,
        ])
        .setDepth(MODAL_DEPTH + 1);
      onKeyDown = (event) => {
        if (event.key === "Escape") {
          return;
        }
        beginFade();
      };
      scene.input.keyboard?.on("keydown", onKeyDown);
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
