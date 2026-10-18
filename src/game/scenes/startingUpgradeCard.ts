import Phaser from "phaser";
import { fitFontSize } from "../../domain/fitFontSize";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import { getUpgradeDef, type UpgradeId, type UpgradeSchool } from "../../domain/upgrades";
import { wrapText } from "../../domain/wrapText";
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
  addSchoolWatermark,
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
  openNotice: (title: string, body: string) => void;
  tick: (deltaMs: number) => void;
  destroy: () => void;
};

export function addUpgradeCard(
  scene: Phaser.Scene,
  headerText: string,
  labelText: string,
  descriptionText: string,
  school: UpgradeSchool | null,
): Phaser.GameObjects.Container {
  const bg = scene.add
    .rectangle(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, 0x101820)
    .setStrokeStyle(4, TEXT_COLOR_YELLOW);
  const header = addPixelText(scene, 0, 0, headerText, MENU_OPTION_FONT_SIZE, TEXT_COLOR_WHITE);
  const label = addPixelText(
    scene,
    0,
    0,
    wrapText(labelText, LABEL_MAX_CHARS),
    fitFontSize(labelText, BUTTON_WIDTH - STARTING_CARD_LABEL_MARGIN, MENU_TITLE_FONT_SIZE),
    TEXT_COLOR_YELLOW,
  );
  const description = addPixelText(
    scene,
    0,
    0,
    wrapText(descriptionText, DESCRIPTION_MAX_CHARS),
    UPGRADES_HUD_FONT_SIZE,
    TEXT_COLOR_WHITE,
  );
  placePixelText(header, 0, -84, 0.5, 0.5);
  layoutCardText(label, description, STARTING_CARD_BODY_CENTER_Y);
  const watermark =
    school === null ? null : addSchoolWatermark(scene, school, BUTTON_WIDTH, BUTTON_HEIGHT);
  watermark?.setY(STARTING_CARD_BODY_CENTER_Y);
  return scene.add.container(
    0,
    0,
    watermark === null
      ? [bg, header, label, description]
      : [bg, watermark, header, label, description],
  );
}

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

  const present = (
    headerText: string,
    labelText: string,
    descriptionText: string,
    school: UpgradeSchool | null,
  ): void => {
    clearViews();
    elapsedMs = 0;
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
    card = addUpgradeCard(scene, headerText, labelText, descriptionText, school)
      .setPosition(PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2)
      .setDepth(MODAL_DEPTH + 1);
    onKeyDown = (event) => {
      if (event.key === "Escape") {
        return;
      }
      beginFade();
    };
    scene.input.keyboard?.on("keydown", onKeyDown);
  };

  return {
    isActive: () => card !== null,
    open: (id) => {
      const def = getUpgradeDef(id);
      present("STARTING UPGRADE", def.label, def.description, def.school);
    },
    openNotice: (title, body) => {
      present("NOTICE", title, body, null);
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
