import Phaser from "phaser";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import { MENU_OPTION_FONT_SIZE, TEXT_COLOR_WHITE, TEXT_COLOR_YELLOW } from "./pixelFont";
import { addGameText, placeGameText } from "./neonFont";
import type { RunEndChoice } from "../sim/playSim";

const ROWS: readonly { choice: RunEndChoice; label: string }[] = [
  { choice: "newGame", label: "NEW GAME" },
  { choice: "menu", label: "MENU" },
];
const ROW_START_Y = PLAYFIELD_HEIGHT / 2 + 80;
const ROW_GAP = 48;
const ROW_X = PLAYFIELD_WIDTH / 2;
const UNARMED_ALPHA = 0.3;
const ARM_FADE_MS = 300;

export type RunEndMenu = {
  selected(): RunEndChoice | null;
  tick(armed: boolean): void;
};

export function createRunEndMenu(
  scene: Phaser.Scene,
  onChoose: (choice: RunEndChoice) => void,
): RunEndMenu {
  let selectedIndex: number | null = null;
  scene.add
    .rectangle(
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2,
      PLAYFIELD_WIDTH,
      PLAYFIELD_HEIGHT,
      0x000000,
      0.65,
    )
    .setDepth(1000);
  const texts = ROWS.map((row, index) => {
    const text = addGameText(scene, ROW_X, rowY(index), "", MENU_OPTION_FONT_SIZE)
      .setDepth(1001)
      .setAlpha(UNARMED_ALPHA);
    text.on("pointerover", () => focus(index));
    text.on("pointerdown", () => {
      focus(index);
      onChoose(row.choice);
    });
    return text;
  });

  const { KeyCodes } = Phaser.Input.Keyboard;
  const keyboard = scene.input.keyboard!;
  const upKeys = [KeyCodes.UP, KeyCodes.W].map((code) => keyboard.addKey(code));
  const downKeys = [KeyCodes.DOWN, KeyCodes.S].map((code) => keyboard.addKey(code));
  const confirmKeys = [KeyCodes.ENTER, KeyCodes.SPACE].map((code) => keyboard.addKey(code));
  const justDown = (keys: Phaser.Input.Keyboard.Key[]) =>
    keys.map((key) => Phaser.Input.Keyboard.JustDown(key)).some(Boolean);

  function focus(index: number | null): void {
    selectedIndex = index;
    texts.forEach((text, i) => {
      const isSelected = i === selectedIndex;
      text.setText(isSelected ? `> ${ROWS[i]!.label}` : `  ${ROWS[i]!.label}`);
      text.setTint(isSelected ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
      placeGameText(text, ROW_X, rowY(i), 0.5, 0.5);
    });
  }

  function arm(): void {
    focus(0);
    for (const text of texts) {
      text.setInteractive({ useHandCursor: true });
    }
    scene.tweens.add({ targets: texts, alpha: 1, duration: ARM_FADE_MS });
  }

  focus(null);

  return {
    selected: () => (selectedIndex === null ? null : ROWS[selectedIndex]!.choice),
    tick(armed) {
      const up = justDown(upKeys);
      const down = justDown(downKeys);
      const confirm = justDown(confirmKeys);
      if (selectedIndex === null) {
        if (armed) {
          arm();
        }
        return;
      }
      if (up !== down) {
        focus((selectedIndex + 1) % ROWS.length);
      }
      if (confirm) {
        onChoose(ROWS[selectedIndex]!.choice);
      }
    },
  };
}

function rowY(index: number): number {
  return ROW_START_Y + index * ROW_GAP;
}
