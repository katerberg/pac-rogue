import Phaser from "phaser";
import { formatHighScoreLine, toHighScoreRows } from "../../domain/highScoresView";
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
const BG = 0x1a1a2e;

export class HighScoresScene extends Phaser.Scene {
  private scrollState: ScoreListScrollState = createScoreListScroll(0, SCROLL);
  private itemCount = 0;
  private rowTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("HighScoresScene");
  }

  create(): void {
    const rows = toHighScoreRows(loadRunHistory());
    this.itemCount = rows.length;
    this.scrollState = createScoreListScroll(this.itemCount, SCROLL);
    this.rowTexts = [];

    if (rows.length === 0) {
      this.add
        .text(PLAYFIELD_WIDTH / 2, LIST_TOP + VIEWPORT_HEIGHT / 2, "NO SCORES YET", scoresLineStyle)
        .setOrigin(0.5, 0.5)
        .setDepth(1);
    } else {
      for (const [index, row] of rows.entries()) {
        const text = this.add
          .text(
            PLAYFIELD_WIDTH / 2,
            LIST_TOP + index * SCROLL.rowHeight,
            formatHighScoreLine(row),
            scoresLineStyle,
          )
          .setOrigin(0.5, 0)
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

    this.input.keyboard?.on("keydown-ESC", this.goBack, this);
    this.input.keyboard?.on("keydown-BACKSPACE", this.goBack, this);
  }

  update(_time: number, delta: number): void {
    if (this.itemCount > SCROLL.scrollWhenMoreThan) {
      this.scrollState = tickScoreListScroll(this.scrollState, this.itemCount, delta, SCROLL);
      this.applyScrollOffset();
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
