import Phaser from "phaser";
import { fitFontSize } from "../../domain/fitFontSize";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import { STORE_ENHANCE_BORDER_COLOR } from "../../domain/store";
import {
  UPGRADE_SLOT_HINT_GLYPH,
  upgradeSlotHintAngleDeg,
  type UpgradeChoiceSlot,
} from "../../domain/upgradeChoiceHints";
import {
  enhancedIdOf,
  getUpgradeDef,
  UPGRADE_SCHOOL_LABELS,
  type UpgradeChoiceOffer,
  type UpgradeChoiceOption,
  type UpgradeSchool,
} from "../../domain/upgrades";
import { addRareFx } from "./rareFx";
import {
  MENU_OPTION_FONT_SIZE,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";
import { addGameText, isNeonText, placeGameText, type GameText } from "./neonFont";

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
const CHOICE_LABEL_FONT_SIZE = 22;
const CHOICE_LABEL_MARGIN = 16;

const CENTER_X = PLAYFIELD_WIDTH / 2;
const CENTER_Y = PLAYFIELD_HEIGHT / 2 + 40;
const H_OFFSET = 250;
const V_OFFSET = 95;
const HINT_GAP = 20;

const SCHOOL_GAP_BELOW_LABEL = 8;
const DESCRIPTION_GAP = 16;
export const SCHOOL_COLORS: Record<UpgradeSchool, number> = {
  death: 0xb36bff,
  harvest: 0xffa63d,
  speed: 0x4dd2ff,
  automation: 0x8a9bff,
  protection: 0x5ee07a,
  disruption: 0xff5c7a,
  neutral: 0xb0b0b0,
};

export function schoolBorderColor(school: UpgradeSchool | null | undefined): number {
  return school === null || school === undefined ? TEXT_COLOR_YELLOW : SCHOOL_COLORS[school];
}

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BUTTON_STROKE_REST = 4;
const BUTTON_STROKE_PEAK = 8;
const BUTTON_SCALE_PEAK = 1.08;
const PULSE_BEATS = 2;

type Phase = "opening" | "selecting" | "confirming";
type Slot = UpgradeChoiceSlot;

const SLOT_POSITIONS: Record<Slot, { x: number; y: number }> = {
  up: { x: CENTER_X, y: CENTER_Y - V_OFFSET },
  down: { x: CENTER_X, y: CENTER_Y + V_OFFSET },
  left: { x: CENTER_X - H_OFFSET, y: CENTER_Y },
  right: { x: CENTER_X + H_OFFSET, y: CENTER_Y },
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

/** Pivot at the hint center so a rotated `>` points the same way in neon and pixel. */
function placeSlotHint(
  scene: Phaser.Scene,
  slot: Slot,
  x: number,
  y: number,
): Phaser.GameObjects.Container {
  const glyph = addGameText(
    scene,
    0,
    0,
    UPGRADE_SLOT_HINT_GLYPH,
    MENU_OPTION_FONT_SIZE,
    TEXT_COLOR_YELLOW,
  );
  const bounds = glyph.getTextBounds(true);
  if (isNeonText(glyph)) {
    // NeonText is a Container: ITRS rotates around (x,y), not the sized center.
    glyph.setPosition(-bounds.local.width / 2, -bounds.local.height / 2);
  } else {
    glyph.setOrigin(0.5, 0.5).setPosition(0, 0);
  }
  return scene.add
    .container(x, y, [glyph])
    .setAngle(upgradeSlotHintAngleDeg(slot))
    .setDepth(MODAL_DEPTH + 3);
}

type CardCopy = {
  label: string;
  description: string;
  school?: UpgradeSchool;
  enhanced?: boolean;
  rare?: boolean;
};

function copyForOption(option: UpgradeChoiceOption): CardCopy {
  if (option.kind === "quarters") {
    return {
      label: "QUARTERS",
      description: `Bank ${option.amount} Quarters instead of an upgrade.`,
    };
  }
  const def = getUpgradeDef(option.enhanced === true ? enhancedIdOf(option.id) : option.id);
  return {
    label: def.label,
    description: def.description,
    school: def.school,
    enhanced: option.enhanced === true,
    rare: def.rare === true,
  };
}

export type UpgradeCardVisual = {
  root: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  borderColor: number;
  label: GameText;
  school: GameText | null;
  description: GameText;
  targetLabel: string;
  targetDescription: string;
};

export function buildUpgradeCardVisual(
  scene: Phaser.Scene,
  x: number,
  y: number,
  copy: CardCopy,
): UpgradeCardVisual {
  const targetLabel = wrapText(copy.label, CHOICE_LABEL_MAX_CHARS);
  const targetDescription = wrapText(copy.description, CHOICE_DESCRIPTION_MAX_CHARS);
  const borderColor =
    copy.enhanced === true ? STORE_ENHANCE_BORDER_COLOR : schoolBorderColor(copy.school);
  const bg = scene.add
    .rectangle(0, 0, CHOICE_BUTTON_WIDTH, CHOICE_BUTTON_HEIGHT, 0x101820)
    .setStrokeStyle(BUTTON_STROKE_REST, borderColor);
  const label = addGameText(
    scene,
    0,
    0,
    targetLabel,
    fitFontSize(copy.label, CHOICE_BUTTON_WIDTH - CHOICE_LABEL_MARGIN, CHOICE_LABEL_FONT_SIZE),
    TEXT_COLOR_YELLOW,
  );
  const description = addGameText(
    scene,
    0,
    0,
    targetDescription,
    UPGRADES_HUD_FONT_SIZE,
    TEXT_COLOR_WHITE,
  );
  const school = copy.school === undefined ? null : addSchoolTag(scene, copy.school);
  layoutCardText(label, school, description);
  const root = scene.add.container(
    x,
    y,
    school === null ? [bg, label, description] : [bg, label, school, description],
  );
  if (copy.rare === true) {
    addRareFx(scene, root, CHOICE_BUTTON_WIDTH, CHOICE_BUTTON_HEIGHT, borderColor);
  }
  return { root, bg, borderColor, label, school, description, targetLabel, targetDescription };
}

type ButtonView = {
  slot: Slot;
  option: UpgradeChoiceOption;
  root: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  borderColor: number;
  label: GameText;
  school: GameText | null;
  description: GameText;
  targetLabel: string;
  targetDescription: string;
  baseX: number;
  baseY: number;
};

export type UpgradeChoiceModal = {
  isActive: () => boolean;
  offer: () => UpgradeChoiceOffer | null;
  open: (offer: UpgradeChoiceOffer, onConfirm: (chosen: UpgradeChoiceOption) => void) => void;
  tick: (deltaMs: number) => void;
  rearmSelectionKeys: () => void;
  destroy: () => void;
};

export function createUpgradeChoiceModal(
  scene: Phaser.Scene,
  rng: () => number,
): UpgradeChoiceModal {
  let phase: Phase | null = null;
  let currentOffer: UpgradeChoiceOffer | null = null;
  let elapsedMs = 0;
  let onConfirm: ((chosen: UpgradeChoiceOption) => void) | null = null;
  let dim: Phaser.GameObjects.Rectangle | null = null;
  let buttons: ButtonView[] = [];
  let hints: Phaser.GameObjects.Container[] = [];
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
      button.bg.setStrokeStyle(BUTTON_STROKE_REST, button.borderColor);
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
    selected.bg.setStrokeStyle(strokeWidth, selected.borderColor);

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
      button.bg.setStrokeStyle(BUTTON_STROKE_REST, button.borderColor);
    }
  };

  const applyFuzz = (progress: number): void => {
    const clamped = Math.min(1, Math.max(0, progress));
    for (const button of buttons) {
      const jitterX = (1 - clamped) * (rng() * 4 - 2);
      const jitterY = (1 - clamped) * (rng() * 4 - 2);
      button.root.setPosition(button.baseX + jitterX, button.baseY + jitterY);
      button.root.setAlpha(clamped);
      button.label.setText(scrambleToward(button.targetLabel, clamped, rng));
      button.description.setText(scrambleToward(button.targetDescription, clamped, rng));
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
        borderColor: visual.borderColor,
        label: visual.label,
        school: visual.school,
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
      const hint = placeSlotHint(scene, slot, hintPos.x, hintPos.y).setAlpha(0).setVisible(true);
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
    offer: () => (phase === null ? null : currentOffer),
    open: (offer, confirm) => {
      currentOffer = offer;
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
          option: { kind: "upgrade", id, enhanced: offer.enhanced.includes(id) },
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

export function addSchoolTag(scene: Phaser.Scene, school: UpgradeSchool): GameText {
  return addGameText(
    scene,
    0,
    0,
    UPGRADE_SCHOOL_LABELS[school].toUpperCase(),
    UPGRADES_HUD_FONT_SIZE,
    SCHOOL_COLORS[school],
  );
}

function placeButtonText(button: ButtonView): void {
  layoutCardText(button.label, button.school, button.description);
}

export function layoutCardText(
  label: GameText,
  school: GameText | null,
  description: GameText,
  centerY = 0,
): void {
  stackTexts(
    [
      { text: label, gapBelow: school === null ? DESCRIPTION_GAP : SCHOOL_GAP_BELOW_LABEL },
      ...(school === null ? [] : [{ text: school, gapBelow: DESCRIPTION_GAP }]),
      { text: description, gapBelow: 0 },
    ],
    centerY,
  );
}

export const SCHOOL_GAP = SCHOOL_GAP_BELOW_LABEL;

export function setSchoolTag(tag: GameText, school: UpgradeSchool | null): void {
  tag.setVisible(school !== null);
  if (school !== null) {
    tag.setText(UPGRADE_SCHOOL_LABELS[school].toUpperCase()).setTint(SCHOOL_COLORS[school]);
  }
}

export function stackTexts(stack: { text: GameText; gapBelow: number }[], centerY: number): void {
  const rows = stack.map((row) => ({ ...row, height: row.text.getTextBounds(true).local.height }));
  const total = rows.reduce((sum, row) => sum + row.height + row.gapBelow, 0);
  let top = centerY - total / 2;
  for (const row of rows) {
    placeGameText(row.text, 0, top, 0.5, 0);
    top += row.height + row.gapBelow;
  }
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

function scrambleToward(target: string, progress: number, rng: () => number): string {
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
      out += SCRAMBLE_CHARS[Math.floor(rng() * SCRAMBLE_CHARS.length)]!;
    }
  }
  return out;
}
