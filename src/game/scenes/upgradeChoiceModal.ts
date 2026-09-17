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

export const UPGRADE_CHOICE_LOCKOUT_MS = 500;

const MODAL_DEPTH = 900;
const BUTTON_WIDTH = 340;
const BUTTON_HEIGHT = 220;
const LABEL_MAX_CHARS = 9;
const DESCRIPTION_MAX_CHARS = 28;
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

type Phase = "opening" | "armed" | "selecting";

type ButtonView = {
  root: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.BitmapText;
  description: Phaser.GameObjects.BitmapText;
  targetLabel: string;
  targetDescription: string;
  baseX: number;
  baseY: number;
};

export type UpgradeChoiceModal = {
  isActive: () => boolean;
  open: (options: readonly UpgradeId[], onConfirm: (chosen: UpgradeId) => void) => void;
  tick: (deltaMs: number) => void;
  destroy: () => void;
};

export function createUpgradeChoiceModal(scene: Phaser.Scene): UpgradeChoiceModal {
  let phase: Phase | null = null;
  let elapsedMs = 0;
  let options: UpgradeId[] = [];
  let onConfirm: ((chosen: UpgradeId) => void) | null = null;
  let dim: Phaser.GameObjects.Rectangle | null = null;
  let buttons: ButtonView[] = [];
  let leftHint: Phaser.GameObjects.BitmapText | null = null;
  let rightHint: Phaser.GameObjects.BitmapText | null = null;
  let selectionFrame: Phaser.GameObjects.Rectangle | null = null;
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  let keyW: Phaser.Input.Keyboard.Key | null = null;
  let keyA: Phaser.Input.Keyboard.Key | null = null;
  let keyD: Phaser.Input.Keyboard.Key | null = null;

  const ensureKeys = (): void => {
    if (scene.input.keyboard === null || cursors !== null) {
      return;
    }
    cursors = scene.input.keyboard.createCursorKeys();
    keyW = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    keyA = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    keyD = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  };

  const clearViews = (): void => {
    dim?.destroy();
    dim = null;
    for (const button of buttons) {
      button.root.destroy(true);
    }
    buttons = [];
    leftHint?.destroy();
    leftHint = null;
    rightHint?.destroy();
    rightHint = null;
    selectionFrame?.destroy();
    selectionFrame = null;
  };

  const finish = (chosen: UpgradeId): void => {
    if (phase === null || onConfirm === null) {
      return;
    }
    const confirm = onConfirm;
    phase = null;
    elapsedMs = 0;
    options = [];
    onConfirm = null;
    clearViews();
    confirm(chosen);
  };

  const setSelectingVisible = (visible: boolean): void => {
    selectionFrame?.setVisible(visible);
    leftHint?.setVisible(visible);
    rightHint?.setVisible(visible);
    for (const button of buttons) {
      button.bg.setStrokeStyle(visible ? 4 : 2, visible ? TEXT_COLOR_YELLOW : 0x888888);
    }
  };

  const applyFuzz = (progress: number): void => {
    const clamped = Math.min(1, Math.max(0, progress));
    for (const button of buttons) {
      const jitterX = (1 - clamped) * (Math.random() * 4 - 2);
      const jitterY = (1 - clamped) * (Math.random() * 4 - 2);
      button.root.setPosition(button.baseX + jitterX, button.baseY + jitterY);
      button.root.setAlpha(clamped);
      button.label.setText(scrambleToward(button.targetLabel, clamped));
      button.description.setText(scrambleToward(button.targetDescription, clamped));
      placeButtonText(button);
    }
  };

  const buildButtons = (ids: readonly UpgradeId[]): void => {
    const centers =
      ids.length === 1
        ? [{ x: PLAYFIELD_WIDTH / 2, y: PLAYFIELD_HEIGHT / 2 }]
        : [
            { x: PLAYFIELD_WIDTH / 2 - BUTTON_WIDTH / 2 - 16, y: PLAYFIELD_HEIGHT / 2 },
            { x: PLAYFIELD_WIDTH / 2 + BUTTON_WIDTH / 2 + 16, y: PLAYFIELD_HEIGHT / 2 },
          ];

    ids.forEach((id, index) => {
      const def = getUpgradeDef(id);
      const center = centers[index]!;
      const labelText = wrapText(def.label, LABEL_MAX_CHARS);
      const descriptionText = wrapText(def.description, DESCRIPTION_MAX_CHARS);
      const bg = scene.add
        .rectangle(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, 0x101820)
        .setStrokeStyle(2, 0x888888)
        .setInteractive({ useHandCursor: true });
      const label = addPixelText(scene, 0, 0, labelText, MENU_TITLE_FONT_SIZE, TEXT_COLOR_YELLOW);
      const description = addPixelText(
        scene,
        0,
        0,
        descriptionText,
        UPGRADES_HUD_FONT_SIZE,
        TEXT_COLOR_WHITE,
      );
      const root = scene.add.container(center.x, center.y, [bg, label, description]);
      root.setDepth(MODAL_DEPTH + 1);
      root.setAlpha(0);

      const view: ButtonView = {
        root,
        bg,
        label,
        description,
        targetLabel: labelText,
        targetDescription: descriptionText,
        baseX: center.x,
        baseY: center.y,
      };
      placeButtonText(view);
      bg.on("pointerdown", () => {
        if (phase === "armed" || phase === "selecting") {
          finish(id);
        }
      });
      buttons.push(view);
    });

    selectionFrame = scene.add
      .rectangle(
        PLAYFIELD_WIDTH / 2,
        PLAYFIELD_HEIGHT / 2,
        ids.length === 1 ? BUTTON_WIDTH + 24 : BUTTON_WIDTH * 2 + 56,
        BUTTON_HEIGHT + 24,
      )
      .setStrokeStyle(3, TEXT_COLOR_YELLOW)
      .setFillStyle(0x000000, 0)
      .setDepth(MODAL_DEPTH + 2)
      .setVisible(false);

    leftHint = addPixelText(
      scene,
      PLAYFIELD_WIDTH / 2 - 120,
      PLAYFIELD_HEIGHT / 2 + BUTTON_HEIGHT / 2 + 36,
      "< LEFT",
      MENU_OPTION_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    )
      .setDepth(MODAL_DEPTH + 3)
      .setVisible(false);
    placePixelText(
      leftHint,
      PLAYFIELD_WIDTH / 2 - 120,
      PLAYFIELD_HEIGHT / 2 + BUTTON_HEIGHT / 2 + 36,
      0.5,
      0.5,
    );

    rightHint = addPixelText(
      scene,
      PLAYFIELD_WIDTH / 2 + 120,
      PLAYFIELD_HEIGHT / 2 + BUTTON_HEIGHT / 2 + 36,
      "RIGHT >",
      MENU_OPTION_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    )
      .setDepth(MODAL_DEPTH + 3)
      .setVisible(false);
    placePixelText(
      rightHint,
      PLAYFIELD_WIDTH / 2 + 120,
      PLAYFIELD_HEIGHT / 2 + BUTTON_HEIGHT / 2 + 36,
      0.5,
      0.5,
    );
  };

  return {
    isActive: () => phase !== null,
    open: (nextOptions, confirm) => {
      clearViews();
      ensureKeys();
      options = [...nextOptions];
      onConfirm = confirm;
      phase = "opening";
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
      buildButtons(options);
      applyFuzz(0);
    },
    tick: (deltaMs) => {
      if (phase === null) {
        return;
      }
      if (phase === "opening") {
        elapsedMs += deltaMs;
        const progress = Math.min(1, elapsedMs / UPGRADE_CHOICE_LOCKOUT_MS);
        applyFuzz(progress);
        if (progress >= 1) {
          phase = "armed";
          for (const button of buttons) {
            button.root.setPosition(button.baseX, button.baseY);
            button.root.setAlpha(1);
            button.label.setText(button.targetLabel);
            button.description.setText(button.targetDescription);
            placeButtonText(button);
          }
        }
        return;
      }

      if (cursors === null || keyW === null || keyA === null || keyD === null) {
        return;
      }

      if (phase === "armed") {
        const up =
          Phaser.Input.Keyboard.JustDown(cursors.up!) || Phaser.Input.Keyboard.JustDown(keyW);
        if (up) {
          phase = "selecting";
          setSelectingVisible(true);
        }
        return;
      }

      const left =
        Phaser.Input.Keyboard.JustDown(cursors.left!) || Phaser.Input.Keyboard.JustDown(keyA);
      const right =
        Phaser.Input.Keyboard.JustDown(cursors.right!) || Phaser.Input.Keyboard.JustDown(keyD);
      if (options.length === 1) {
        if (left || right) {
          finish(options[0]!);
        }
        return;
      }
      if (left) {
        finish(options[0]!);
      } else if (right) {
        finish(options[1]!);
      }
    },
    destroy: () => {
      phase = null;
      onConfirm = null;
      options = [];
      clearViews();
    },
  };
}

function placeButtonText(button: ButtonView): void {
  placePixelText(button.label, 0, -36, 0.5, 0.5);
  placePixelText(button.description, 0, 28, 0.5, 0.5);
}

function wrapText(text: string, maxCharsPerLine: number): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current.length === 0 ? word : `${current} ${word}`;
    if (next.length > maxCharsPerLine && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines.join("\n");
}

function scrambleToward(target: string, progress: number): string {
  if (progress >= 1) {
    return target;
  }
  const revealed = Math.floor(target.length * progress);
  let out = "";
  for (let i = 0; i < target.length; i += 1) {
    const ch = target[i]!;
    if (ch === " " || ch === "\n") {
      out += ch;
      continue;
    }
    if (i < revealed) {
      out += ch;
    } else {
      out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]!;
    }
  }
  return out;
}
