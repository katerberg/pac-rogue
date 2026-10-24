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
import type { PanelItem } from "./salvagePanel";
import {
  buildUpgradeCardVisual,
  CHOICE_BUTTON_HEIGHT,
  CHOICE_BUTTON_WIDTH,
  MODAL_DEPTH,
} from "./upgradeChoiceModal";

const DEPTH = MODAL_DEPTH + 10;
const ALERT_RED = 0xff3030;
const FADE_IN_MS = 250;
const CENTER_X = PLAYFIELD_WIDTH / 2;
const TITLE_Y = 118;
const TITLE_BAND = 28;
const CARD_Y = 225;
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
const SKIP_LABEL = "SKIP";
const SALVAGE_LABEL = "SALVAGE";
const TAG_LEFT = CENTER_X - CHOICE_BUTTON_WIDTH / 2 + TAG_STROKE;
const TAG_RIGHT = CENTER_X + CHOICE_BUTTON_WIDTH / 2 - TAG_STROKE;
const TAG_BOTTOM = TAG_TOP + TAG_HEIGHT - TAG_STROKE;
const ROW_TOP = TAG_TOP + 40;

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

function rowIconX(names: readonly string[]): number {
  const widest = (lines: string) => Math.max(...lines.split("\n").map((line) => line.length));
  const rightChars = Math.max(SALVAGE_LABEL.length, ...names.map((label) => widest(label)));
  const extent = (chars: number) => CHEVRON_GAP + TEXT_GAP + chars * UPGRADES_HUD_FONT_SIZE;
  return CENTER_X + (extent(SKIP_LABEL.length) - extent(rightChars)) / 2;
}

type SalvageKeys = { pressed: () => SalvageKey | null; anyHeld: () => boolean };

function createSalvageKeys(scene: Phaser.Scene): SalvageKeys {
  const keyboard = scene.input.keyboard;
  const { KeyCodes } = Phaser.Input.Keyboard;
  const codes: Record<SalvageKey, number[]> = {
    up: [KeyCodes.UP, KeyCodes.W],
    down: [KeyCodes.DOWN, KeyCodes.S],
    left: [KeyCodes.LEFT, KeyCodes.A],
    right: [KeyCodes.RIGHT, KeyCodes.D],
    confirm: [KeyCodes.ENTER, KeyCodes.SPACE],
  };
  const keys = Object.entries(codes).map(([name, list]) => ({
    name: name as SalvageKey,
    keys: keyboard === null ? [] : list.map((code) => keyboard.addKey(code)),
  }));
  return {
    pressed: () =>
      keys.find(({ keys: list }) => list.some((key) => Phaser.Input.Keyboard.JustDown(key)))
        ?.name ?? null,
    anyHeld: () => keys.some(({ keys: list }) => list.some((key) => key.isDown)),
  };
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
      centered(TAG_TOP + 32, "CHOOSE 1 TO SALVAGE:", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_WHITE);
      const names = owned.map(({ id }) => wrapText(getUpgradeDef(id).label, NAME_CHARS));
      const iconX = rowIconX(names);
      const at: Record<Dir, { x: number; y: number }> = {
        up: { x: iconX, y: ROW_Y - ARROW_GAP },
        down: { x: iconX, y: ROW_Y + ARROW_GAP },
        left: { x: iconX - CHEVRON_GAP, y: ROW_Y },
        right: { x: iconX + CHEVRON_GAP, y: ROW_Y },
      };
      const icon = track(scene.add.image(iconX, ROW_Y, ""));
      const name = track(
        addPixelText(scene, 0, 0, "", UPGRADES_HUD_FONT_SIZE, ALERT_RED).setLineSpacing(
          NAME_LINE_SPACING,
        ),
      );
      const arrows = track(scene.add.graphics());
      const hudSelector = track(scene.add.graphics());
      arrows.fillStyle(TEXT_COLOR_YELLOW, 1);
      (Object.keys(at) as Dir[]).forEach((dir) => arrow(arrows, dir, at[dir].x, at[dir].y));
      const skip = track(
        addPixelText(scene, 0, 0, SKIP_LABEL, UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_WHITE),
      );
      placePixelText(skip, at.left.x - TEXT_GAP, ROW_Y, 1, 0.5);
      const salvage = track(
        addPixelText(scene, 0, 0, SALVAGE_LABEL, UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_WHITE),
      );
      const rightX = at.right.x + TEXT_GAP;
      placePixelText(salvage, rightX, ROW_Y - STACK_GAP, 0, 1);

      const redraw = (): void => {
        const current = owned[index];
        if (current === undefined) {
          return;
        }
        icon.setTexture(upgradeIconTexture(current.id)).setDisplaySize(ICON_SIZE, ICON_SIZE);
        name.setText(names[index] ?? "");
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
      const zone = (dir: Dir, left: number, top: number, right: number, bottom: number) =>
        clickable(
          track(scene.add.zone((left + right) / 2, (top + bottom) / 2, right - left, bottom - top)),
          dir,
        );
      const iconTop = ROW_Y - ICON_SIZE / 2;
      const iconBottom = ROW_Y + ICON_SIZE / 2;
      const iconLeft = iconX - ICON_SIZE / 2;
      const iconRight = iconX + ICON_SIZE / 2;
      zone("left", TAG_LEFT, iconTop, iconLeft, iconBottom);
      zone("right", iconRight, iconTop, TAG_RIGHT, iconBottom);
      zone("up", iconLeft, ROW_TOP, iconRight, iconTop);
      zone("down", iconLeft, iconBottom, iconRight, TAG_BOTTOM);
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
