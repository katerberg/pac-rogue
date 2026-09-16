import Phaser from "phaser";
import {
  formatHighScoreHeader,
  formatHighScoreLine,
  toHighScoreRows,
} from "../../domain/highScoresView";
import { MAZE_BACKGROUND_COLOR } from "../../domain/maze";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import {
  createScoreListScroll,
  DEFAULT_SCORE_LIST_SCROLL,
  tickScoreListScroll,
  type ScoreListScrollState,
} from "../../domain/scoreListScroll";
import { loadRunHistory } from "../storage/runHistoryStorage";
import {
  addPixelText,
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  placePixelText,
  SCORES_FONT_SIZE,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
} from "./pixelFont";

const SCROLL = DEFAULT_SCORE_LIST_SCROLL;
const VIEWPORT_HEIGHT = SCROLL.viewportRows * SCROLL.rowHeight;
const LIST_TOP = 200;
const HEADER_Y = LIST_TOP - 36;
const HEADER_LINE_Y = LIST_TOP - 10;
const BG = MAZE_BACKGROUND_COLOR;

export class HighScoresScene extends Phaser.Scene {
  private scrollState: ScoreListScrollState = createScoreListScroll(0, SCROLL);
  private itemCount = 0;
  private rowTexts: Phaser.GameObjects.BitmapText[] = [];
  private backText!: Phaser.GameObjects.BitmapText;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyBackspace!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("HighScoresScene");
  }

  create(): void {
    const rows = toHighScoreRows(loadRunHistory());
    this.itemCount = rows.length;
    this.scrollState = createScoreListScroll(this.itemCount, SCROLL);
    this.rowTexts = [];

    const headerLine = formatHighScoreHeader();
    const probe = addPixelText(this, 0, 0, headerLine, SCORES_FONT_SIZE).setVisible(false);
    const listWidth = probe.width;
    const listLeftX = Math.round(PLAYFIELD_WIDTH / 2 - listWidth / 2);
    probe.destroy();

    if (rows.length === 0) {
      const empty = addPixelText(
        this,
        PLAYFIELD_WIDTH / 2,
        LIST_TOP + VIEWPORT_HEIGHT / 2,
        "NO SCORES YET",
        SCORES_FONT_SIZE,
      ).setDepth(1);
      placePixelText(empty, PLAYFIELD_WIDTH / 2, LIST_TOP + VIEWPORT_HEIGHT / 2, 0.5, 0.5);
    } else {
      addPixelText(this, listLeftX, HEADER_Y, headerLine, SCORES_FONT_SIZE).setDepth(10);
      this.add.rectangle(PLAYFIELD_WIDTH / 2, HEADER_LINE_Y, listWidth, 2, 0xffffff).setDepth(10);

      for (const [index, row] of rows.entries()) {
        const text = addPixelText(
          this,
          listLeftX,
          LIST_TOP + index * SCROLL.rowHeight,
          formatHighScoreLine(row),
          SCORES_FONT_SIZE,
        ).setDepth(1);
        this.rowTexts.push(text);
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

    const title = addPixelText(
      this,
      PLAYFIELD_WIDTH / 2,
      80,
      "HIGH SCORES",
      MENU_TITLE_FONT_SIZE,
    ).setDepth(10);
    placePixelText(title, PLAYFIELD_WIDTH / 2, 80, 0.5, 0.5);

    this.backText = addPixelText(
      this,
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT - 80,
      "> BACK",
      MENU_OPTION_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    ).setDepth(10);
    placePixelText(this.backText, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT - 80, 0.5, 0.5);
    this.backText.setInteractive({ useHandCursor: true });
    this.backText.on("pointerover", () => {
      this.backText.setText("> BACK");
      this.backText.setTint(TEXT_COLOR_YELLOW);
      placePixelText(this.backText, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT - 80, 0.5, 0.5);
    });
    this.backText.on("pointerout", () => {
      this.backText.setText("  BACK");
      this.backText.setTint(TEXT_COLOR_WHITE);
      placePixelText(this.backText, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT - 80, 0.5, 0.5);
    });
    this.backText.on("pointerdown", () => {
      this.goBack();
    });

    if (this.input.keyboard === null) {
      return;
    }

    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyBackspace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
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
    }
  }

  private applyScrollOffset(): void {
    const offsetY = this.scrollState.offsetY;
    for (const [index, text] of this.rowTexts.entries()) {
      text.setY(LIST_TOP + index * SCROLL.rowHeight - offsetY);
    }
  }

  private goBack = (): void => {
    this.scene.start("MenuScene");
  };
}
