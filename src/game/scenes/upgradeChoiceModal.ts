import Phaser from "phaser";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import {
  getUpgradeDef,
  type UpgradeChoiceOffer,
  type UpgradeChoiceOption,
} from "../../domain/upgrades";
import {
  addPixelText,
  MENU_OPTION_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";

export const UPGRADE_CHOICE_LOCKOUT_MS = 500;
export const UPGRADE_CONFIRM_PULSE_MS = 400;
export const UPGRADE_CONFIRM_FADE_MS = 1000;

export const MODAL_DEPTH = 900;
// Starting-upgrade card size (src/game/scenes/startingUpgradeCard.ts) — unrelated to
// the four-slot layout below, kept as-is so that single centered card is unaffected.
export const BUTTON_WIDTH = 340;
export const BUTTON_HEIGHT = 220;
export const LABEL_MAX_CHARS = 9;
export const DESCRIPTION_MAX_CHARS = 28;

// Choice-modal button sizing: smaller than the starting-upgrade card box so all four
// up/down/left/right slots fit on screen without overlapping.
const CHOICE_BUTTON_WIDTH = 230;
const CHOICE_BUTTON_HEIGHT = 150;
const CHOICE_LABEL_MAX_CHARS = 8;
const CHOICE_DESCRIPTION_MAX_CHARS = 22;
const CHOICE_LABEL_FONT_SIZE = 24;

const CENTER_X = PLAYFIELD_WIDTH / 2;
const CENTER_Y = PLAYFIELD_HEIGHT / 2 + 40;
const H_OFFSET = 250;
const V_OFFSET = 95;
const HINT_GAP = 20;

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BUTTON_STROKE_REST = 4;
const BUTTON_STROKE_PEAK = 8;
const BUTTON_SCALE_PEAK = 1.08;
const PULSE_BEATS = 2;

type Phase = "opening" | "selecting" | "confirming";
type Slot = "up" | "down" | "left" | "right";

const SLOT_POSITIONS: Record<Slot, { x: number; y: number }> = {
  up: { x: CENTER_X, y: CENTER_Y - V_OFFSET },
  down: { x: CENTER_X, y: CENTER_Y + V_OFFSET },
  left: { x: CENTER_X - H_OFFSET, y: CENTER_Y },
  right: { x: CENTER_X + H_OFFSET, y: CENTER_Y },
};

// Short glyphs, not words — "< LEFT" / "RIGHT >" style hints run off the edge of the
// canvas once the buttons also have up/down neighbors to make room for.
const SLOT_HINTS: Record<Slot, string> = {
  up: "^",
  down: "v",
  left: "<",
  right: ">",
};

function upgradeSlotsFor(count: number): Slot[] {
  if (count === 0) {
    return [];
  }
  if (count === 1) {
    return ["up"];
  }
  if (count === 2) {
    return ["left", "right"];
  }
  return ["up", "left", "right"];
}

function hintPositionForSlot(slot: Slot): { x: number; y: number } {
  const pos = SLOT_POSITIONS[slot];
  switch (slot) {
    case "up":
      return { x: pos.x, y: pos.y - CHOICE_BUTTON_HEIGHT / 2 - HINT_GAP };
    case "down":
      return { x: pos.x, y: pos.y + CHOICE_BUTTON_HEIGHT / 2 + HINT_GAP };
    case "left":
      return { x: pos.x - CHOICE_BUTTON_WIDTH / 2 - HINT_GAP / 2, y: pos.y };
    case "right":
      return { x: pos.x + CHOICE_BUTTON_WIDTH / 2 + HINT_GAP / 2, y: pos.y };
  }
}

function copyForOption(option: UpgradeChoiceOption): { label: string; description: string } {
  if (option.kind === "quarters") {
    return {
      label: "QUARTERS",
      description: `Bank ${option.amount} Quarters instead of an upgrade.`,
    };
  }
  const def = getUpgradeDef(option.id);
  return { label: def.label, description: def.description };
}

export type UpgradeCardVisual = {
  root: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.BitmapText;
  description: Phaser.GameObjects.BitmapText;
  targetLabel: string;
  targetDescription: string;
};

export function buildUpgradeCardVisual(
  scene: Phaser.Scene,
  x: number,
  y: number,
  copy: { label: string; description: string },
): UpgradeCardVisual {
  const targetLabel = wrapText(copy.label, CHOICE_LABEL_MAX_CHARS);
  const targetDescription = wrapText(copy.description, CHOICE_DESCRIPTION_MAX_CHARS);
  const bg = scene.add
    .rectangle(0, 0, CHOICE_BUTTON_WIDTH, CHOICE_BUTTON_HEIGHT, 0x101820)
    .setStrokeStyle(BUTTON_STROKE_REST, TEXT_COLOR_YELLOW);
  const label = addPixelText(scene, 0, 0, targetLabel, CHOICE_LABEL_FONT_SIZE, TEXT_COLOR_YELLOW);
  const description = addPixelText(
    scene,
    0,
    0,
    targetDescription,
    UPGRADES_HUD_FONT_SIZE,
    TEXT_COLOR_WHITE,
  );
  placePixelText(label, 0, -30, 0.5, 0.5);
  placePixelText(description, 0, 18, 0.5, 0.5);
  const root = scene.add.container(x, y, [bg, label, description]);
  return { root, bg, label, description, targetLabel, targetDescription };
}

type ButtonView = {
  slot: Slot;
  option: UpgradeChoiceOption;
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
  open: (offer: UpgradeChoiceOffer, onConfirm: (chosen: UpgradeChoiceOption) => void) => void;
  tick: (deltaMs: number) => void;
  rearmSelectionKeys: () => void;
  destroy: () => void;
};

export function createUpgradeChoiceModal(scene: Phaser.Scene): UpgradeChoiceModal {
  let phase: Phase | null = null;
  let elapsedMs = 0;
  let onConfirm: ((chosen: UpgradeChoiceOption) => void) | null = null;
  let dim: Phaser.GameObjects.Rectangle | null = null;
  let buttons: ButtonView[] = [];
  let hints: Phaser.GameObjects.BitmapText[] = [];
  let selectionFrame: Phaser.GameObjects.Rectangle | null = null;
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  let keyA: Phaser.Input.Keyboard.Key | null = null;
  let keyD: Phaser.Input.Keyboard.Key | null = null;
  let keyW: Phaser.Input.Keyboard.Key | null = null;
  let keyS: Phaser.Input.Keyboard.Key | null = null;
  let choiceKeysArmed = false;
  let selectedIndex = 0;

  const ensureKeys = (): void => {
    if (scene.input.keyboard === null || cursors !== null) {
      return;
    }
    cursors = scene.input.keyboard.createCursorKeys();
    keyA = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    keyD = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    keyW = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    keyS = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  };

  const anyChoiceKeyDown = (): boolean => {
    if (cursors === null || keyA === null || keyD === null || keyW === null || keyS === null) {
      return false;
    }
    return (
      cursors.left!.isDown ||
      cursors.right!.isDown ||
      cursors.up!.isDown ||
      cursors.down!.isDown ||
      keyA.isDown ||
      keyD.isDown ||
      keyW.isDown ||
      keyS.isDown
    );
  };

  const clearViews = (): void => {
    dim?.destroy();
    dim = null;
    for (const button of buttons) {
      button.root.destroy(true);
    }
    buttons = [];
    for (const hint of hints) {
      hint.destroy();
    }
    hints = [];
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
      if (i !== selectedIndex) {
        buttons[i]!.root.setAlpha(1 - pulseProgress);
      }
    }
  };

  const applyConfirmFade = (fadeProgress: number): void => {
    const alpha = 1 - fadeProgress;
    dim?.setAlpha(alpha);
    buttons[selectedIndex]?.root.setAlpha(alpha);
    selectionFrame?.setAlpha(alpha);
    for (const hint of hints) {
      hint.setAlpha(alpha);
    }
  };

  const finishConfirming = (): void => {
    clearViews();
    phase = null;
    elapsedMs = 0;
    choiceKeysArmed = false;
    selectedIndex = 0;
  };

  const finish = (index: number): void => {
    if (phase !== "selecting" || onConfirm === null) {
      return;
    }
    const button = buttons[index];
    if (button === undefined) {
      return;
    }
    const confirm = onConfirm;
    onConfirm = null;
    choiceKeysArmed = false;
    selectedIndex = index;
    for (const b of buttons) {
      b.bg.disableInteractive();
    }
    phase = "confirming";
    elapsedMs = 0;
    resetConfirmVisuals();
    confirm(button.option);
  };

  const showSelectingChrome = (): void => {
    selectionFrame?.setVisible(true);
    for (const hint of hints) {
      hint.setVisible(true);
    }
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
    for (const hint of hints) {
      hint.setAlpha(clamped);
    }
    selectionFrame?.setAlpha(clamped);
  };

  const buildButtons = (slots: readonly { slot: Slot; option: UpgradeChoiceOption }[]): void => {
    slots.forEach(({ slot, option }, index) => {
      const center = SLOT_POSITIONS[slot];
      const copy = copyForOption(option);
      const visual = buildUpgradeCardVisual(scene, center.x, center.y, copy);
      visual.bg.setInteractive({ useHandCursor: true });
      visual.root.setDepth(MODAL_DEPTH + 1);
      visual.root.setAlpha(0);

      const view: ButtonView = {
        slot,
        option,
        root: visual.root,
        bg: visual.bg,
        label: visual.label,
        description: visual.description,
        targetLabel: visual.targetLabel,
        targetDescription: visual.targetDescription,
        baseX: center.x,
        baseY: center.y,
      };
      placeButtonText(view);
      visual.bg.on("pointerdown", () => {
        if (phase === "selecting") {
          finish(index);
        }
      });
      buttons.push(view);

      const hintPos = hintPositionForSlot(slot);
      const hint = addPixelText(
        scene,
        hintPos.x,
        hintPos.y,
        SLOT_HINTS[slot],
        MENU_OPTION_FONT_SIZE,
        TEXT_COLOR_YELLOW,
      )
        .setDepth(MODAL_DEPTH + 3)
        .setAlpha(0)
        .setVisible(true);
      placePixelText(hint, hintPos.x, hintPos.y, 0.5, 0.5);
      hints.push(hint);
    });

    const xs = slots.map(({ slot }) => SLOT_POSITIONS[slot].x);
    const ys = slots.map(({ slot }) => SLOT_POSITIONS[slot].y);
    const minX = Math.min(...xs) - CHOICE_BUTTON_WIDTH / 2;
    const maxX = Math.max(...xs) + CHOICE_BUTTON_WIDTH / 2;
    const minY = Math.min(...ys) - CHOICE_BUTTON_HEIGHT / 2;
    const maxY = Math.max(...ys) + CHOICE_BUTTON_HEIGHT / 2;
    selectionFrame = scene.add
      .rectangle((minX + maxX) / 2, (minY + maxY) / 2, maxX - minX + 24, maxY - minY + 24)
      .setStrokeStyle(3, TEXT_COLOR_YELLOW)
      .setFillStyle(0x000000, 0)
      .setDepth(MODAL_DEPTH + 2)
      .setAlpha(0)
      .setVisible(true);
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
    for (const hint of hints) {
      hint.setAlpha(1);
    }
    phase = "selecting";
    choiceKeysArmed = !anyChoiceKeyDown();
  };

  return {
    isActive: () => phase !== null,
    open: (offer, confirm) => {
      clearViews();
      ensureKeys();
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
      const upgradeSlots = upgradeSlotsFor(offer.upgrades.length);
      const slots: { slot: Slot; option: UpgradeChoiceOption }[] = offer.upgrades.map(
        (id, index) => ({
          slot: upgradeSlots[index]!,
          option: { kind: "upgrade", id },
        }),
      );
      slots.push({ slot: "down", option: { kind: "quarters", amount: offer.quarters } });
      buildButtons(slots);
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
        elapsedMs += Math.min(deltaMs, 50);
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

      if (cursors === null || keyA === null || keyD === null || keyW === null || keyS === null) {
        return;
      }

      if (!choiceKeysArmed) {
        if (!anyChoiceKeyDown()) {
          choiceKeysArmed = true;
        }
        return;
      }

      const pressed: Record<Slot, boolean> = {
        up: Phaser.Input.Keyboard.JustDown(cursors.up!) || Phaser.Input.Keyboard.JustDown(keyW),
        down: Phaser.Input.Keyboard.JustDown(cursors.down!) || Phaser.Input.Keyboard.JustDown(keyS),
        left: Phaser.Input.Keyboard.JustDown(cursors.left!) || Phaser.Input.Keyboard.JustDown(keyA),
        right:
          Phaser.Input.Keyboard.JustDown(cursors.right!) || Phaser.Input.Keyboard.JustDown(keyD),
      };
      const index = buttons.findIndex((button) => pressed[button.slot]);
      if (index !== -1) {
        finish(index);
      }
    },
    rearmSelectionKeys: () => {
      choiceKeysArmed = false;
    },
    destroy: () => {
      phase = null;
      onConfirm = null;
      choiceKeysArmed = false;
      selectedIndex = 0;
      clearViews();
    },
  };
}

function placeButtonText(button: ButtonView): void {
  placePixelText(button.label, 0, -30, 0.5, 0.5);
  placePixelText(button.description, 0, 18, 0.5, 0.5);
}

export function wrapText(text: string, maxCharsPerLine: number): string {
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
