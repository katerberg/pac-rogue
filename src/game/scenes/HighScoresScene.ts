import Phaser from "phaser";
import {
  HIGH_SCORE_COLUMNS,
  highScoreCellX,
  layoutHighScoreColumns,
  toHighScoreRows,
  type HighScoreColumnLayout,
  type HighScoreRow,
} from "../../domain/highScoresView";
import { MAZE_BACKGROUND_COLOR } from "../../domain/maze";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import {
  buildScoreListScrollConfig,
  createScoreListScroll,
  fitScoreListViewportRows,
  tickScoreListScroll,
  type ScoreListScrollState,
} from "../../domain/scoreListScroll";
import { preloadSfx, startLoopingSfx } from "../audio/sfx";
import { loadRunHistory } from "../storage/runHistoryStorage";
import { MENU_OPTION_FONT_SIZE, MENU_TITLE_FONT_SIZE, SCORES_FONT_SIZE } from "./pixelFont";
import { addGameText, placeGameText, placeSelectableMenuOption, type GameText } from "./neonFont";
import { applyRenderScale } from "../renderScale";

const LIST_TOP = 200;
const BACK_Y = PLAYFIELD_HEIGHT - 80;
const LIST_BOTTOM_CLEARANCE = 48;
const HEADER_Y = LIST_TOP - 36;
const HEADER_LINE_Y = LIST_TOP - 10;
const BG = MAZE_BACKGROUND_COLOR;

const availableListHeight = BACK_Y - LIST_TOP - LIST_BOTTOM_CLEARANCE;
const SCROLL = buildScoreListScrollConfig(fitScoreListViewportRows(availableListHeight));
const VIEWPORT_HEIGHT = SCROLL.viewportRows * SCROLL.rowHeight;

export class HighScoresScene extends Phaser.Scene {
  private scrollState: ScoreListScrollState = createScoreListScroll(0, SCROLL);
  private itemCount = 0;
  private rowTexts: GameText[][] = [];
  private backText!: GameText;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyBackspace!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private pendingBack = false;

  constructor() {
    super("HighScoresScene");
  }

  preload(): void {
    preloadSfx(this);
  }

  create(): void {
    applyRenderScale(this);
    this.pendingBack = false;
    startLoopingSfx(this, "menuMusic");
    const rows = toHighScoreRows(loadRunHistory());
    this.itemCount = rows.length;
    this.scrollState = createScoreListScroll(this.itemCount, SCROLL);
    this.rowTexts = [];

    if (rows.length === 0) {
      const empty = addGameText(
        this,
        PLAYFIELD_WIDTH / 2,
        LIST_TOP + VIEWPORT_HEIGHT / 2,
        "NO SCORES YET",
        SCORES_FONT_SIZE,
      ).setDepth(1);
      placeGameText(empty, PLAYFIELD_WIDTH / 2, LIST_TOP + VIEWPORT_HEIGHT / 2, 0.5, 0.5);
    } else {
      const probe = addGameText(this, 0, 0, "", SCORES_FONT_SIZE).setVisible(false);
      const measure = (text: string): number => {
        probe.setText(text);
        // Round so right-aligned cells share an integer column edge after placeGameText.
        return Math.round(probe.getTextBounds(true).local.width);
      };
      const layout = layoutHighScoreColumns(measure, rows);
      probe.destroy();

      const listLeftX = Math.round(PLAYFIELD_WIDTH / 2 - layout.totalWidth / 2);
      this.placeScoreRow("header", layout, listLeftX, HEADER_Y, 10);

      this.add
        .rectangle(PLAYFIELD_WIDTH / 2, HEADER_LINE_Y, layout.totalWidth, 2, 0xffffff)
        .setDepth(10);

      for (const [index, row] of rows.entries()) {
        const cells = this.placeScoreRow(
          "cell",
          layout,
          listLeftX,
          LIST_TOP + index * SCROLL.rowHeight,
          1,
          row,
        );
        this.rowTexts.push(cells);
      }
      this.applyScrollOffset();
    }

    this.add
      .rectangle(PLAYFIELD_WIDTH / 2, LIST_TOP / 2, PLAYFIELD_WIDTH, LIST_TOP, BG)
      .setDepth(5);
    const belowTop = LIST_TOP + VIEWPORT_HEIGHT;
    const belowHeight = PLAYFIELD_HEIGHT - belowTop;
    this.add
      .rectangle(PLAYFIELD_WIDTH / 2, belowTop + belowHeight / 2, PLAYFIELD_WIDTH, belowHeight, BG)
      .setDepth(5);

    const title = addGameText(
      this,
      PLAYFIELD_WIDTH / 2,
      80,
      "HIGH SCORES",
      MENU_TITLE_FONT_SIZE,
    ).setDepth(10);
    placeGameText(title, PLAYFIELD_WIDTH / 2, 80, 0.5, 0.5);

    this.backText = addGameText(
      this,
      PLAYFIELD_WIDTH / 2,
      BACK_Y,
      "BACK",
      MENU_OPTION_FONT_SIZE,
    ).setDepth(10);
    placeSelectableMenuOption(this.backText, "BACK", true, PLAYFIELD_WIDTH / 2, BACK_Y);
    this.backText.setInteractive({ useHandCursor: true });
    this.backText.on("pointerdown", () => {
      this.goBack();
    });

    if (this.input.keyboard === null) {
      return;
    }

    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyBackspace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  update(_time: number, delta: number): void {
    if (this.itemCount > SCROLL.scrollWhenMoreThan) {
      this.scrollState = tickScoreListScroll(this.scrollState, this.itemCount, delta, SCROLL);
      this.applyScrollOffset();
    }

    if (this.input.keyboard === null) {
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keyEsc) ||
      Phaser.Input.Keyboard.JustDown(this.keyBackspace)
    ) {
      this.goBack();
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace)
    ) {
      this.pendingBack = true;
    }
    if (this.pendingBack && !this.keyEnter.isDown && !this.keySpace.isDown) {
      this.goBack();
    }
  }

  private placeScoreRow(
    role: "header" | "cell",
    layout: HighScoreColumnLayout,
    listLeftX: number,
    y: number,
    depth: number,
    row?: HighScoreRow,
  ): GameText[] {
    return HIGH_SCORE_COLUMNS.map((column) => {
      const content = role === "header" ? column.header : column.text(row!);
      const align = role === "header" ? column.headerAlign : column.cellAlign;
      const text = addGameText(this, 0, 0, content, SCORES_FONT_SIZE).setDepth(depth);
      const originX = align === "right" ? 1 : 0;
      placeGameText(text, highScoreCellX(layout, column.id, align, listLeftX), y, originX, 0);
      return text;
    });
  }

  private applyScrollOffset(): void {
    const offsetY = this.scrollState.offsetY;
    for (const [index, cells] of this.rowTexts.entries()) {
      const y = LIST_TOP + index * SCROLL.rowHeight - offsetY;
      for (const text of cells) {
        text.setY(y);
      }
    }
  }

  private goBack(): void {
    this.scene.start("MenuScene");
  }
}
