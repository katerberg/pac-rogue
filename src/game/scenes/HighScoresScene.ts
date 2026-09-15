import Phaser from "phaser";
import {
  formatHighScoreHeader,
  formatHighScoreLine,
  toHighScoreRows,
} from "../../domain/highScoresView";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import {
  createScoreListScroll,
  DEFAULT_SCORE_LIST_SCROLL,
  tickScoreListScroll,
  type ScoreListScrollState,
} from "../../domain/scoreListScroll";
import { loadRunHistory } from "../storage/runHistoryStorage";
import {
  menuOptionSelectedStyle,
  menuOptionStyle,
  menuTitleStyle,
  scoresLineStyle,
} from "../ui/textStyles";

const SCROLL = DEFAULT_SCORE_LIST_SCROLL;
const VIEWPORT_HEIGHT = SCROLL.viewportRows * SCROLL.rowHeight;
const LIST_TOP = 200;
const HEADER_Y = LIST_TOP - 36;
const HEADER_LINE_Y = LIST_TOP - 10;
const BG = 0x1a1a2e;

export class HighScoresScene extends Phaser.Scene {
  private scrollState: ScoreListScrollState = createScoreListScroll(0, SCROLL);
  private itemCount = 0;
  private rowTexts: Phaser.GameObjects.Text[] = [];
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
    const probe = this.add.text(0, 0, headerLine, scoresLineStyle).setVisible(false);
    const listLeftX = PLAYFIELD_WIDTH / 2 - probe.width / 2;
    const listWidth = probe.width;
    probe.destroy();

    if (rows.length === 0) {
      this.add
        .text(PLAYFIELD_WIDTH / 2, LIST_TOP + VIEWPORT_HEIGHT / 2, "NO SCORES YET", scoresLineStyle)
        .setOrigin(0.5, 0.5)
        .setDepth(1);
    } else {
      this.add.text(listLeftX, HEADER_Y, headerLine, scoresLineStyle).setOrigin(0, 0).setDepth(10);
      this.add.rectangle(PLAYFIELD_WIDTH / 2, HEADER_LINE_Y, listWidth, 2, 0xffffff).setDepth(10);

      for (const [index, row] of rows.entries()) {
        const text = this.add
          .text(
            listLeftX,
            LIST_TOP + index * SCROLL.rowHeight,
            formatHighScoreLine(row),
            scoresLineStyle,
          )
          .setOrigin(0, 0)
          .setDepth(1);
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

    this.add
      .text(PLAYFIELD_WIDTH / 2, 80, "HIGH SCORES", menuTitleStyle)
      .setOrigin(0.5, 0.5)
      .setDepth(10);

    const back = this.add
      .text(PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT - 80, "> BACK", menuOptionSelectedStyle)
      .setOrigin(0.5, 0.5)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    back.on("pointerover", () => {
      back.setText("> BACK");
      back.setStyle(menuOptionSelectedStyle);
    });
    back.on("pointerout", () => {
      back.setText("  BACK");
      back.setStyle(menuOptionStyle);
    });
    back.on("pointerdown", () => {
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
