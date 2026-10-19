import Phaser from "phaser";
import {
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  MAZE_PIXEL_HEIGHT,
  MAZE_PIXEL_WIDTH,
} from "../../domain/maze";
import { schoolArtTextureKey } from "../../domain/schoolArt";
import {
  SLOT_LINES,
  SLOT_REELS,
  SLOT_ROWS,
  slotFrame,
  slotSpinningSymbol,
  type SlotSymbol,
} from "../../domain/slotMachine";
import { addDotManIcon, QUARTER_TEXTURE_KEY } from "../systems/render";
import { getUpgradeDef, type UpgradeId } from "../../domain/upgrades";
import type { SlotView } from "../sim/playSim";
import {
  addPixelText,
  HUD_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
} from "./pixelFont";
import { addUpgradeCard } from "./startingUpgradeCard";
import { SCHOOL_COLORS } from "./upgradeChoiceModal";

const OVERLAY_DEPTH = 850;
const CELL = 44;
const DIVIDER = 4;
const ICON = 32;
const PANEL_PAD = 14;
const TITLE_GAP = 26;
const BACKDROP_ALPHA = 0.55;
const PANEL_COLOR = 0x101028;
const FRAME_COLOR = 0xffd800;
const HOLD_COLOR = 0xff5a5a;
const REEL_COLOR = 0xffffff;
const LINE_COLOR = 0x101028;
const PULSE_COLOR = 0xffffff;
const FINALE_PULSE_MS = 120;
const FINALE_SCALE = 1.08;
const QUARTER_TINT = 0xffd800;
const LIFE_TINT = 0xffff00;
const PROMPT_GAP = 12;
const CARD_SCALE = 0.75;
const CARD_SPACING = 270;
const WITH_CARDS_PANEL_Y = -100;
const WITH_CARDS_CARD_Y = 110;

type Cell = {
  frame: Phaser.GameObjects.Rectangle;
  image: Phaser.GameObjects.Image;
  life: Phaser.GameObjects.Container;
};

export type SlotOverlay = { sync: (view: Readonly<SlotView> | null) => void };

function symbolColor(symbol: SlotSymbol): number {
  return symbol === "quarter"
    ? QUARTER_TINT
    : symbol === "life"
      ? LIFE_TINT
      : SCHOOL_COLORS[symbol];
}

function reelX(reel: number): number {
  return (reel - 1) * (CELL + DIVIDER);
}

function rowY(row: number): number {
  return (row - 1) * CELL;
}

export function createSlotOverlay(scene: Phaser.Scene): SlotOverlay {
  const span = SLOT_REELS * CELL + (SLOT_REELS - 1) * DIVIDER;
  const reelHeight = SLOT_ROWS * CELL;
  const backdrop = scene.add
    .rectangle(0, 0, 1, 1, 0x000000, BACKDROP_ALPHA)
    .setOrigin(0, 0)
    .setDepth(OVERLAY_DEPTH);
  const panel = scene.add.container(0, 0).setDepth(OVERLAY_DEPTH + 1);
  const box = scene.add
    .rectangle(
      0,
      -TITLE_GAP / 2,
      span + PANEL_PAD * 2,
      span + PANEL_PAD * 2 + TITLE_GAP,
      PANEL_COLOR,
    )
    .setStrokeStyle(3, FRAME_COLOR);
  const title = addPixelText(scene, 0, 0, "BONUS!", HUD_FONT_SIZE, TEXT_COLOR_YELLOW);
  placePixelText(title, 0, -reelHeight / 2 - TITLE_GAP + 2, 0.5, 0);
  const lines = scene.add.graphics();
  const window = scene.add
    .rectangle(0, 0, span + DIVIDER * 2, reelHeight + DIVIDER * 2, FRAME_COLOR)
    .setStrokeStyle(0);
  const reels = Array.from({ length: SLOT_REELS }, (_, reel) =>
    scene.add.rectangle(reelX(reel), 0, CELL, reelHeight, REEL_COLOR),
  );
  panel.add([box, title, window, ...reels]);
  const cells: Cell[][] = Array.from({ length: SLOT_REELS }, (_, reel) =>
    Array.from({ length: SLOT_ROWS }, (_, row) => {
      const x = reelX(reel);
      const y = rowY(row);
      const frame = scene.add.rectangle(x, y, CELL, CELL, REEL_COLOR, 0);
      const image = scene.add.image(x, y, QUARTER_TEXTURE_KEY).setDisplaySize(ICON, ICON);
      const life = addDotManIcon(scene, x, y, ICON);
      panel.add([frame, image, life]);
      return { frame, image, life };
    }),
  );
  panel.add(lines);
  const prompt = addPixelText(scene, 0, 0, "PRESS ANY KEY", HUD_FONT_SIZE, TEXT_COLOR_WHITE);
  placePixelText(prompt, 0, span / 2 + PANEL_PAD + PROMPT_GAP, 0.5, 0);
  panel.add(prompt);
  const cards = scene.add.container(0, 0).setDepth(OVERLAY_DEPTH + 2);
  let cardsFor = "";
  const showCards = (won: readonly UpgradeId[]) => {
    if (won.join() === cardsFor) {
      return;
    }
    cardsFor = won.join();
    cards.removeAll(true);
    won.forEach((id, index) => {
      const def = getUpgradeDef(id);
      const x = (index - (won.length - 1) / 2) * CARD_SPACING;
      cards.add(
        addUpgradeCard(scene, "BONUS UPGRADE", def.label, def.description, def.school)
          .setPosition(x, 0)
          .setScale(CARD_SCALE),
      );
    });
  };
  const setVisible = (visible: boolean) => {
    backdrop.setVisible(visible);
    panel.setVisible(visible);
    cards.setVisible(visible);
  };
  setVisible(false);

  const showSymbol = (cell: Cell, symbol: SlotSymbol) => {
    cell.life.setVisible(symbol === "life");
    cell.image.setVisible(symbol !== "life");
    if (symbol !== "life") {
      cell.image
        .setTexture(symbol === "quarter" ? QUARTER_TEXTURE_KEY : schoolArtTextureKey(symbol))
        .setDisplaySize(ICON, ICON);
    }
  };

  return {
    sync(view) {
      if (view === null) {
        setVisible(false);
        showCards([]);
        return;
      }
      setVisible(true);
      const { spin, timeline, elapsedMs } = view;
      const frame = slotFrame(spin, timeline, elapsedMs);
      const withCards = frame.held && view.won.length > 0;
      const centerX = MAZE_OFFSET_X + MAZE_PIXEL_WIDTH / 2;
      const centerY = MAZE_OFFSET_Y + MAZE_PIXEL_HEIGHT / 2;
      backdrop
        .setPosition(MAZE_OFFSET_X, MAZE_OFFSET_Y)
        .setDisplaySize(MAZE_PIXEL_WIDTH, MAZE_PIXEL_HEIGHT);
      panel.setPosition(centerX, centerY + (withCards ? WITH_CARDS_PANEL_Y : 0));
      cards.setPosition(centerX, centerY + WITH_CARDS_CARD_Y);
      showCards(withCards ? view.won : []);
      prompt.setVisible(frame.held);
      for (let reel = 0; reel < SLOT_REELS; reel += 1) {
        const holding = reel === SLOT_REELS - 1 && frame.anticipating;
        reels[reel]!.setStrokeStyle(holding ? 3 : 0, HOLD_COLOR);
        for (let row = 0; row < SLOT_ROWS; row += 1) {
          const cell = cells[reel]![row]!;
          const stopped = frame.stopped[reel] === true;
          showSymbol(
            cell,
            stopped ? spin.grid[reel]![row]! : slotSpinningSymbol(reel, row, elapsedMs),
          );
          cell.frame.setFillStyle(REEL_COLOR, 0);
        }
      }
      lines.clear();
      const lit =
        frame.finale || frame.held
          ? spin.wins
          : frame.activeWin === null
            ? []
            : [spin.wins[frame.activeWin]!];
      for (const win of lit) {
        const cellsOnLine = SLOT_LINES[win.line]!;
        const color = symbolColor(win.symbol);
        for (const [reel, row] of cellsOnLine) {
          cells[reel]![row]!.frame.setFillStyle(color, 0.45);
        }
        const [first, , last] = cellsOnLine;
        lines.lineStyle(4, LINE_COLOR, 0.9);
        lines.lineBetween(reelX(first![0]), rowY(first![1]), reelX(last![0]), rowY(last![1]));
      }
      const pulse = frame.finale && Math.floor(elapsedMs / FINALE_PULSE_MS) % 2 === 0;
      panel.setScale(pulse ? FINALE_SCALE : 1);
      box.setStrokeStyle(3, pulse ? PULSE_COLOR : FRAME_COLOR);
    },
  };
}
