import Phaser from "phaser";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import {
  addPixelText,
  MENU_OPTION_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
} from "./pixelFont";
import type { RunEndChoice } from "../sim/playSim";

const ROWS: readonly { choice: RunEndChoice; label: string }[] = [
  { choice: "newGame", label: "NEW GAME" },
  { choice: "menu", label: "MENU" },
];
const ROW_START_Y = PLAYFIELD_HEIGHT / 2 + 80;
const ROW_GAP = 48;
const ROW_X = PLAYFIELD_WIDTH / 2;

export type RunEndMenu = {
  selected(): RunEndChoice;
  tick(): void;
};

export function createRunEndMenu(
  scene: Phaser.Scene,
  onChoose: (choice: RunEndChoice) => void,
): RunEndMenu {
  let selectedIndex = 0;
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
    const text = addPixelText(scene, ROW_X, rowY(index), "", MENU_OPTION_FONT_SIZE).setDepth(1001);
    text.setInteractive({ useHandCursor: true });
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
  justDown([...upKeys, ...downKeys, ...confirmKeys]);

  function focus(index: number): void {
    selectedIndex = index;
    texts.forEach((text, i) => {
      const isSelected = i === selectedIndex;
      text.setText(isSelected ? `> ${ROWS[i]!.label}` : `  ${ROWS[i]!.label}`);
      text.setTint(isSelected ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
      placePixelText(text, ROW_X, rowY(i), 0.5, 0.5);
    });
  }

  focus(0);

  return {
    selected: () => ROWS[selectedIndex]!.choice,
    tick() {
      const up = justDown(upKeys);
      const down = justDown(downKeys);
      if (up !== down) {
        focus((selectedIndex + 1) % ROWS.length);
      }
      if (justDown(confirmKeys)) {
        onChoose(ROWS[selectedIndex]!.choice);
      }
    },
  };
}

function rowY(index: number): number {
  return ROW_START_Y + index * ROW_GAP;
}
