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
export const UPGRADE_CONFIRM_PULSE_MS = 400;
export const UPGRADE_CONFIRM_FADE_MS = 1000;

const MODAL_DEPTH = 900;
const BUTTON_WIDTH = 340;
const BUTTON_HEIGHT = 220;
const LABEL_MAX_CHARS = 9;
const DESCRIPTION_MAX_CHARS = 28;
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BUTTON_STROKE_REST = 4;
const BUTTON_STROKE_PEAK = 8;
const BUTTON_SCALE_PEAK = 1.08;
const PULSE_BEATS = 2;

type Phase = "opening" | "selecting" | "confirming";

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
  let keyA: Phaser.Input.Keyboard.Key | null = null;
  let keyD: Phaser.Input.Keyboard.Key | null = null;
  let choiceKeysArmed = false;
  let selectedIndex = 0;

  const ensureKeys = (): void => {
    if (scene.input.keyboard === null || cursors !== null) {
      return;
    }
    cursors = scene.input.keyboard.createCursorKeys();
    keyA = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    keyD = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  };

  const anyChoiceKeyDown = (): boolean => {
    if (cursors === null || keyA === null || keyD === null) {
      return false;
    }
    return cursors.left!.isDown || cursors.right!.isDown || keyA.isDown || keyD.isDown;
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

  const resetConfirmVisuals = (): void => {
    for (const button of buttons) {
      button.root.setScale(1);
      button.bg.setStrokeStyle(BUTTON_STROKE_REST, TEXT_COLOR_YELLOW);
    }
  };

  const applyConfirmPulse = (pulseProgress: number): void => {
    const selected = buttons[selectedIndex];
    if (selected === undefined) {
      return;
    }
    const beatProgress = (pulseProgress * PULSE_BEATS) % 1;
    const triangle = beatProgress < 0.5 ? beatProgress * 2 : (1 - beatProgress) * 2;
    selected.root.setScale(1 + (BUTTON_SCALE_PEAK - 1) * triangle);
    const strokeWidth = BUTTON_STROKE_REST + (BUTTON_STROKE_PEAK - BUTTON_STROKE_REST) * triangle;
    selected.bg.setStrokeStyle(strokeWidth, TEXT_COLOR_YELLOW);

    for (let i = 0; i < buttons.length; i += 1) {
      if (i === selectedIndex) {
        continue;
      }
      const other = buttons[i]!;
      other.root.setAlpha(1 - pulseProgress);
      other.bg.disableInteractive();
    }
  };

  const applyConfirmFade = (fadeProgress: number): void => {
    const alpha = 1 - fadeProgress;
    dim?.setAlpha(alpha);
    const selected = buttons[selectedIndex];
    if (selected !== undefined) {
      selected.root.setAlpha(alpha);
      selected.root.setScale(1);
      selected.bg.setStrokeStyle(BUTTON_STROKE_REST, TEXT_COLOR_YELLOW);
    }
    selectionFrame?.setAlpha(alpha);
    leftHint?.setAlpha(alpha);
    rightHint?.setAlpha(alpha);
  };

  const finishConfirming = (): void => {
    clearViews();
    phase = null;
    elapsedMs = 0;
    choiceKeysArmed = false;
    options = [];
    selectedIndex = 0;
  };

  const finish = (chosen: UpgradeId): void => {
    if (phase !== "selecting" || onConfirm === null) {
      return;
    }
    const confirm = onConfirm;
    onConfirm = null;
    choiceKeysArmed = false;
    selectedIndex = Math.max(0, options.indexOf(chosen));
    phase = "confirming";
    elapsedMs = 0;
    resetConfirmVisuals();
    confirm(chosen);
  };

  const showSelectingChrome = (): void => {
    selectionFrame?.setVisible(true);
    leftHint?.setVisible(true);
    rightHint?.setVisible(true);
    for (const button of buttons) {
      button.bg.setStrokeStyle(BUTTON_STROKE_REST, TEXT_COLOR_YELLOW);
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
    const chromeAlpha = clamped;
    selectionFrame?.setAlpha(chromeAlpha);
    leftHint?.setAlpha(chromeAlpha);
    rightHint?.setAlpha(chromeAlpha);
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
        .setStrokeStyle(BUTTON_STROKE_REST, TEXT_COLOR_YELLOW)
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
        if (phase === "selecting") {
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
      .setAlpha(0)
      .setVisible(true);

    leftHint = addPixelText(
      scene,
      PLAYFIELD_WIDTH / 2 - 120,
      PLAYFIELD_HEIGHT / 2 + BUTTON_HEIGHT / 2 + 36,
      "< LEFT",
      MENU_OPTION_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    )
      .setDepth(MODAL_DEPTH + 3)
      .setAlpha(0)
      .setVisible(true);
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
      .setAlpha(0)
      .setVisible(true);
    placePixelText(
      rightHint,
      PLAYFIELD_WIDTH / 2 + 120,
      PLAYFIELD_HEIGHT / 2 + BUTTON_HEIGHT / 2 + 36,
      0.5,
      0.5,
    );
  };

  const enterSelecting = (): void => {
    for (const button of buttons) {
      button.root.setPosition(button.baseX, button.baseY);
      button.root.setAlpha(1);
      button.label.setText(button.targetLabel);
      button.description.setText(button.targetDescription);
      placeButtonText(button);
    }
    showSelectingChrome();
    selectionFrame?.setAlpha(1);
    leftHint?.setAlpha(1);
    rightHint?.setAlpha(1);
    phase = "selecting";
    choiceKeysArmed = !anyChoiceKeyDown();
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
      choiceKeysArmed = false;
      selectedIndex = 0;
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
          enterSelecting();
        }
        return;
      }

      if (phase === "confirming") {
        elapsedMs += deltaMs;
        if (elapsedMs < UPGRADE_CONFIRM_PULSE_MS) {
          applyConfirmPulse(elapsedMs / UPGRADE_CONFIRM_PULSE_MS);
          return;
        }
        resetConfirmVisuals();
        for (let i = 0; i < buttons.length; i += 1) {
          if (i !== selectedIndex) {
            buttons[i]!.root.setAlpha(0);
          }
        }
        const fadeElapsed = elapsedMs - UPGRADE_CONFIRM_PULSE_MS;
        const fadeProgress = Math.min(1, fadeElapsed / UPGRADE_CONFIRM_FADE_MS);
        applyConfirmFade(fadeProgress);
        if (fadeProgress >= 1) {
          finishConfirming();
        }
        return;
      }

      if (cursors === null || keyA === null || keyD === null) {
        return;
      }

      if (!choiceKeysArmed) {
        if (!anyChoiceKeyDown()) {
          choiceKeysArmed = true;
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
      choiceKeysArmed = false;
      selectedIndex = 0;
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
