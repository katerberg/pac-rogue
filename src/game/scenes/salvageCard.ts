import Phaser from "phaser";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import type { UpgradeSource } from "../../domain/runLog";
import { salvageCardStep, salvageCardTitle, type SalvageKey } from "../../domain/salvagePanel";
import { getUpgradeDef, isEnhancedId, type UpgradeId } from "../../domain/upgrades";
import { wrapText } from "../../domain/wrapText";
import { upgradeIconTexture } from "../upgradeArt";
import {
  addPixelText,
  MENU_OPTION_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";
import { ALERT_RED, createSalvageKeys, type PanelItem } from "./salvagePanel";
import {
  buildUpgradeCardVisual,
  CHOICE_BUTTON_HEIGHT,
  CHOICE_BUTTON_WIDTH,
  MODAL_DEPTH,
} from "./upgradeChoiceModal";

const DEPTH = MODAL_DEPTH + 10;
const FADE_IN_MS = 250;
const CENTER_X = PLAYFIELD_WIDTH / 2;
const TITLE_Y = 118;
const TITLE_BAND = 28;
const CARD_Y = 225;
const TAG_HEIGHT = 170;
const TAG_TOP = CARD_Y + CHOICE_BUTTON_HEIGHT / 2;
const TAG_Y = TAG_TOP + TAG_HEIGHT / 2;
const TAG_STROKE = 4;
const ICON_SIZE = 40;
const ICON_Y = TAG_TOP + 78;
const ARROW_GAP = 30;
const ARROW_SIZE = 6;
const LABEL_Y = ICON_Y + ARROW_GAP + 14;
const LABEL_CHARS = 24;
const HINT_Y = TAG_TOP + TAG_HEIGHT - 16;
const HINT_PAD = 12;
const HUD_SELECT_PAD = 5;

export type SalvageCard = {
  isOpen: () => boolean;
  selected: () => UpgradeId | null;
  open: (options: {
    incoming: UpgradeId;
    source: UpgradeSource;
    owned: readonly PanelItem[];
    onSalvageNew: () => void;
    onSalvageOwned: (id: UpgradeId) => void;
  }) => void;
  tick: (deltaMs: number) => void;
  destroy: () => void;
};

function arrow(graphics: Phaser.GameObjects.Graphics, dir: "up" | "down", y: number): void {
  const tip = dir === "up" ? y - ARROW_SIZE : y + ARROW_SIZE;
  const base = dir === "up" ? y + ARROW_SIZE - 2 : y - ARROW_SIZE + 2;
  graphics.fillTriangle(CENTER_X, tip, CENTER_X - ARROW_SIZE, base, CENTER_X + ARROW_SIZE, base);
}

export function createSalvageCard(scene: Phaser.Scene): SalvageCard {
  const keys = createSalvageKeys(scene);
  let parts: Phaser.GameObjects.GameObject[] = [];
  let owned: readonly PanelItem[] = [];
  let index = 0;
  let elapsed = 0;
  let armed = false;
  let onKey: (key: SalvageKey) => void = () => {};

  const track = <T extends Phaser.GameObjects.GameObject>(part: T): T => {
    (part as unknown as Phaser.GameObjects.Components.Depth).setDepth(DEPTH);
    parts.push(part);
    return part;
  };

  const setAlpha = (alpha: number): void =>
    parts.forEach((part) =>
      (part as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(alpha),
    );

  const clear = (): void => {
    parts.forEach((part) => part.destroy());
    parts = [];
    owned = [];
  };

  const centered = (y: number, content: string, size: number, color: number) => {
    const label = track(addPixelText(scene, CENTER_X, y, content, size, color));
    placePixelText(label, CENTER_X, y, 0.5, 0.5);
    return label;
  };

  return {
    isOpen: () => parts.length > 0,
    selected: () => owned[index]?.id ?? null,

    open: ({ incoming, source, owned: items, onSalvageNew, onSalvageOwned }) => {
      clear();
      owned = items;
      index = 0;
      elapsed = 0;
      armed = !keys.anyHeld();
      track(
        scene.add.rectangle(
          PLAYFIELD_WIDTH / 2,
          PLAYFIELD_HEIGHT / 2,
          PLAYFIELD_WIDTH,
          PLAYFIELD_HEIGHT,
          0x000000,
          0.65,
        ),
      );
      track(
        scene.add.rectangle(CENTER_X, TITLE_Y, CHOICE_BUTTON_WIDTH, TITLE_BAND, 0x000000, 0.85),
      );
      centered(TITLE_Y, salvageCardTitle(source), MENU_OPTION_FONT_SIZE, TEXT_COLOR_YELLOW);
      const def = getUpgradeDef(incoming);
      track(
        buildUpgradeCardVisual(scene, CENTER_X, CARD_Y, {
          label: def.label,
          description: def.description,
          school: def.school,
          enhanced: isEnhancedId(incoming),
          rare: def.rare === true,
        }).root,
      );
      track(
        scene.add
          .rectangle(CENTER_X, TAG_Y, CHOICE_BUTTON_WIDTH, TAG_HEIGHT, 0x101820)
          .setStrokeStyle(TAG_STROKE, ALERT_RED),
      );
      centered(TAG_TOP + 18, "SLOTS FULL!", UPGRADES_HUD_FONT_SIZE, ALERT_RED);
      centered(TAG_TOP + 32, "PICK ONE TO SALVAGE", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_WHITE);
      const icon = track(scene.add.image(CENTER_X, ICON_Y, ""));
      const label = centered(LABEL_Y, "", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_YELLOW);
      const arrows = track(scene.add.graphics());
      const hudSelector = track(scene.add.graphics());
      arrows.fillStyle(TEXT_COLOR_YELLOW, 1);
      arrow(arrows, "up", ICON_Y - ARROW_GAP);
      arrow(arrows, "down", ICON_Y + ARROW_GAP);
      const left = -CHOICE_BUTTON_WIDTH / 2 + HINT_PAD;
      const leftHint = track(
        addPixelText(scene, 0, 0, "< SALVAGE NEW", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_YELLOW),
      );
      placePixelText(leftHint, CENTER_X + left, HINT_Y, 0, 0.5);
      const rightHint = track(
        addPixelText(scene, 0, 0, "SALVAGE >", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_YELLOW),
      );
      placePixelText(rightHint, CENTER_X - left, HINT_Y, 1, 0.5);

      const redraw = (): void => {
        const current = owned[index];
        if (current === undefined) {
          return;
        }
        icon.setTexture(upgradeIconTexture(current.id)).setDisplaySize(ICON_SIZE, ICON_SIZE);
        label.setText(wrapText(getUpgradeDef(current.id).label, LABEL_CHARS));
        placePixelText(label, CENTER_X, LABEL_Y, 0.5, 0.5);
        hudSelector.clear().lineStyle(2, TEXT_COLOR_YELLOW, 1);
        const half = current.size / 2 + HUD_SELECT_PAD;
        hudSelector.strokeRect(current.x - half, current.y - half, half * 2, half * 2);
      };

      onKey = (key) => {
        const step = salvageCardStep(index, key, owned.length);
        index = step.index;
        const picked = owned[index]?.id;
        if (step.outcome === "salvageNew") {
          clear();
          onSalvageNew();
        } else if (step.outcome === "salvageOwned" && picked !== undefined) {
          clear();
          onSalvageOwned(picked);
        } else {
          redraw();
        }
      };

      const clickable = (
        part: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform,
        key: SalvageKey,
      ): void => {
        part.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          if (elapsed >= FADE_IN_MS) {
            onKey(key);
          }
        });
      };
      clickable(leftHint, "left");
      clickable(rightHint, "right");
      (["up", "down"] as const).forEach((dir) => {
        const y = ICON_Y + (dir === "up" ? -ARROW_GAP : ARROW_GAP);
        clickable(track(scene.add.zone(CENTER_X, y, ARROW_SIZE * 4, ARROW_SIZE * 4)), dir);
      });
      redraw();
      setAlpha(0);
    },

    tick: (deltaMs) => {
      if (parts.length === 0) {
        return;
      }
      if (!armed) {
        armed = !keys.anyHeld();
      }
      if (elapsed < FADE_IN_MS) {
        elapsed += deltaMs;
        setAlpha(Math.min(1, elapsed / FADE_IN_MS));
        keys.pressed();
        return;
      }
      if (!armed) {
        return;
      }
      const pressed = keys.pressed();
      if (pressed !== null) {
        onKey(pressed);
      }
    },

    destroy: clear,
  };
}
