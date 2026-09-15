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

export class HighScoresScene extends Phaser.Scene {
  private scrollState: ScoreListScrollState = createScoreListScroll(0, SCROLL);
  private itemCount = 0;
  private listContainer!: Phaser.GameObjects.Container;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyBackspace!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("HighScoresScene");
  }

  create(): void {
    this.add.text(PLAYFIELD_WIDTH / 2, 80, "HIGH SCORES", menuTitleStyle).setOrigin(0.5, 0.5);

    const rows = toHighScoreRows(loadRunHistory());
    this.itemCount = rows.length;
    this.scrollState = createScoreListScroll(this.itemCount, SCROLL);

    const maskGraphics = this.make.graphics();
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(PLAYFIELD_WIDTH / 2 - 200, LIST_TOP, 400, VIEWPORT_HEIGHT);
    const geometryMask = maskGraphics.createGeometryMask();

    this.listContainer = this.add.container(PLAYFIELD_WIDTH / 2, LIST_TOP);
    this.listContainer.setMask(geometryMask);

    if (rows.length === 0) {
      this.add
        .text(PLAYFIELD_WIDTH / 2, LIST_TOP + VIEWPORT_HEIGHT / 2, "NO SCORES YET", scoresLineStyle)
        .setOrigin(0.5, 0.5);
    } else {
      for (const [index, row] of rows.entries()) {
        const text = this.add
          .text(0, index * SCROLL.rowHeight, formatHighScoreLine(row), scoresLineStyle)
          .setOrigin(0.5, 0);
        this.listContainer.add(text);
      }
      this.applyScrollOffset();
    }

    const back = this.add
      .text(PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT - 80, "> BACK", menuOptionSelectedStyle)
      .setOrigin(0.5, 0.5)
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
    this.listContainer.setY(LIST_TOP - this.scrollState.offsetY);
  }

  private goBack(): void {
    this.scene.start("MenuScene");
  }
}
