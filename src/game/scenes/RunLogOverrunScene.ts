import Phaser from "phaser";
import { PLAYFIELD_WIDTH } from "../../domain/playfield";
import { RUN_LOG_PURGE_COUNT } from "../../domain/runLog";
import { purgeOldestRuns, runLogOverrunActive, storedRunCount } from "../storage/runLogStorage";
import {
  addPixelText,
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
} from "./pixelFont";
import { applyRenderScale } from "../renderScale";

const CENTER_X = PLAYFIELD_WIDTH / 2;

export class RunLogOverrunScene extends Phaser.Scene {
  private countText!: Phaser.GameObjects.BitmapText;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("RunLogOverrunScene");
  }

  create(): void {
    applyRenderScale(this);
    const title = addPixelText(this, 0, 0, "RUN LOG FULL", MENU_TITLE_FONT_SIZE, TEXT_COLOR_YELLOW);
    placePixelText(title, CENTER_X, 140, 0.5, 0.5);

    this.countText = addPixelText(this, 0, 0, "", MENU_OPTION_FONT_SIZE);
    this.refreshCount();

    const copy = ["MOVE OR CLEAR OLD RUNS SOON", `PURGE DELETES THE OLDEST ${RUN_LOG_PURGE_COUNT}`];
    copy.forEach((line, index) => {
      const text = addPixelText(this, 0, 0, line, MENU_OPTION_FONT_SIZE, TEXT_COLOR_WHITE);
      placePixelText(text, CENTER_X, 280 + index * 32, 0.5, 0.5);
    });

    const purge = addPixelText(
      this,
      0,
      0,
      `> PURGE OLDEST ${RUN_LOG_PURGE_COUNT}`,
      MENU_OPTION_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    );
    placePixelText(purge, CENTER_X, 420, 0.5, 0.5);
    purge.setInteractive({ useHandCursor: true });
    purge.on("pointerdown", () => this.purge());

    if (this.input.keyboard !== null) {
      this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
  }

  update(): void {
    if (this.input.keyboard === null) {
      return;
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace)
    ) {
      this.purge();
    }
  }

  private purge(): void {
    purgeOldestRuns();
    if (runLogOverrunActive()) {
      this.refreshCount();
      return;
    }
    this.scene.start("MenuScene");
  }

  private refreshCount(): void {
    this.countText.setText(`${storedRunCount()} RUNS STORED`);
    placePixelText(this.countText, CENTER_X, 200, 0.5, 0.5);
  }
}
