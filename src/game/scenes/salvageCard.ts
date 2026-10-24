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
const ICON_X = CENTER_X - 30;
const TAG_HEIGHT = 130;
const TAG_TOP = CARD_Y + CHOICE_BUTTON_HEIGHT / 2;
const TAG_Y = TAG_TOP + TAG_HEIGHT / 2;
const TAG_STROKE = 4;
const ROW_Y = TAG_TOP + 80;
const ICON_SIZE = 40;
const ARROW_GAP = 30;
const CHEVRON_GAP = ICON_SIZE / 2 + 12;
const TEXT_GAP = 11;
const ARROW_SIZE = 6;
const NAME_CHARS = 11;
const STACK_GAP = 2;
const NAME_LINE_SPACING = 3;
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

type Dir = "up" | "down" | "left" | "right";

function arrow(graphics: Phaser.GameObjects.Graphics, dir: Dir, x: number, y: number): void {
  const r = ARROW_SIZE;
  const sign = dir === "up" || dir === "left" ? -1 : 1;
  const tip = sign * r;
  const base = -sign * (r - 2);
  if (dir === "up" || dir === "down") {
    graphics.fillTriangle(x, y + tip, x - r, y + base, x + r, y + base);
  } else {
    graphics.fillTriangle(x + tip, y, x + base, y - r, x + base, y + r);
  }
}

const ARROW_AT: Record<Dir, { x: number; y: number }> = {
  up: { x: ICON_X, y: ROW_Y - ARROW_GAP },
  down: { x: ICON_X, y: ROW_Y + ARROW_GAP },
  left: { x: ICON_X - CHEVRON_GAP, y: ROW_Y },
  right: { x: ICON_X + CHEVRON_GAP, y: ROW_Y },
};

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
      centered(TAG_TOP + 32, "CHOOSE 1 TO SALVAGE:", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_WHITE);
      const icon = track(scene.add.image(ICON_X, ROW_Y, ""));
      const name = track(
        addPixelText(scene, 0, 0, "", UPGRADES_HUD_FONT_SIZE, ALERT_RED).setLineSpacing(
          NAME_LINE_SPACING,
        ),
      );
      const arrows = track(scene.add.graphics());
      const hudSelector = track(scene.add.graphics());
      arrows.fillStyle(TEXT_COLOR_YELLOW, 1);
      (Object.keys(ARROW_AT) as Dir[]).forEach((dir) =>
        arrow(arrows, dir, ARROW_AT[dir].x, ARROW_AT[dir].y),
      );
      const skip = track(
        addPixelText(scene, 0, 0, "SKIP", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_WHITE),
      );
      placePixelText(skip, ARROW_AT.left.x - TEXT_GAP, ROW_Y, 1, 0.5);
      const salvage = track(
        addPixelText(scene, 0, 0, "SALVAGE", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_WHITE),
      );
      const rightX = ARROW_AT.right.x + TEXT_GAP;
      placePixelText(salvage, rightX, ROW_Y - STACK_GAP, 0, 1);

      const redraw = (): void => {
        const current = owned[index];
        if (current === undefined) {
          return;
        }
        icon.setTexture(upgradeIconTexture(current.id)).setDisplaySize(ICON_SIZE, ICON_SIZE);
        name.setText(wrapText(getUpgradeDef(current.id).label, NAME_CHARS));
        placePixelText(name, rightX, ROW_Y + STACK_GAP, 0, 0);
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
      clickable(skip, "left");
      clickable(salvage, "right");
      (Object.keys(ARROW_AT) as Dir[]).forEach((dir) => {
        const at = ARROW_AT[dir];
        clickable(track(scene.add.zone(at.x, at.y, ARROW_SIZE * 4, ARROW_SIZE * 4)), dir);
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
