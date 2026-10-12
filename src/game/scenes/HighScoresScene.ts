import Phaser from "phaser";
import {
  HIGH_SCORE_COLUMNS,
  highScoreCellX,
  layoutHighScoreColumns,
  toHighScoreRows,
  type HighScoreAlign,
  type HighScoreColumn,
  type HighScoreColumnId,
  type HighScoreColumnLayout,
} from "../../domain/highScoresView";
import {
  GLOBAL_SCORE_COLUMNS,
  globalBoardMessage,
  otherTab,
  type GlobalBoard,
  type ScoreTab,
} from "../../domain/leaderboard";
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
import { fetchGlobalScores } from "../net/apiClient";
import { loadRunHistory } from "../storage/runHistoryStorage";
import {
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  SCORES_FONT_SIZE,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
} from "./pixelFont";
import { addGameText, placeGameText, placeSelectableMenuOption, type GameText } from "./neonFont";
import { applyRenderScale } from "../renderScale";

const LIST_TOP = 200;
const TAB_Y = 124;
const TAB_OFFSET_X = 96;
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
  private listObjects: Phaser.GameObjects.GameObject[] = [];
  private tab: ScoreTab = "local";
  private global: GlobalBoard = { kind: "idle" };
  private mineRow: number | null = null;
  private visit = 0;
  private tabTexts!: Record<ScoreTab, GameText>;
  private backText!: GameText;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
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
    this.visit += 1;
    this.tab = "local";
    this.global = { kind: "idle" };
    this.listObjects = [];
    this.renderList();

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

    this.tabTexts = {
      local: addGameText(this, 0, 0, "", MENU_OPTION_FONT_SIZE).setDepth(10),
      global: addGameText(this, 0, 0, "", MENU_OPTION_FONT_SIZE).setDepth(10),
    };
    for (const tab of ["local", "global"] as const) {
      this.tabTexts[tab].setInteractive({ useHandCursor: true });
      this.tabTexts[tab].on("pointerdown", () => {
        if (this.tab !== tab) {
          this.switchTab();
        }
      });
    }
    this.placeTabs();

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

    this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
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
      Phaser.Input.Keyboard.JustDown(this.keyLeft) ||
      Phaser.Input.Keyboard.JustDown(this.keyRight)
    ) {
      this.switchTab();
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

  public debugSnapshot(): {
    tab: ScoreTab;
    global: GlobalBoard["kind"];
    rows: number;
    mineRow: number | null;
  } {
    return { tab: this.tab, global: this.global.kind, rows: this.itemCount, mineRow: this.mineRow };
  }

  private switchTab(): void {
    this.tab = otherTab(this.tab);
    this.placeTabs();
    if (this.tab === "global" && this.global.kind === "idle") {
      this.global = { kind: "loading" };
      const visit = this.visit;
      void fetchGlobalScores().then((board) => {
        if (visit !== this.visit || !this.sys.isActive()) {
          return;
        }
        this.global = board;
        if (this.tab === "global") {
          this.renderList();
        }
      });
    }
    this.renderList();
  }

  private placeTabs(): void {
    const center = PLAYFIELD_WIDTH / 2;
    placeSelectableMenuOption(
      this.tabTexts.local,
      "LOCAL",
      this.tab === "local",
      center - TAB_OFFSET_X,
      TAB_Y,
    );
    placeSelectableMenuOption(
      this.tabTexts.global,
      "GLOBAL",
      this.tab === "global",
      center + TAB_OFFSET_X,
      TAB_Y,
    );
  }

  private renderList(): void {
    for (const object of this.listObjects) {
      object.destroy();
    }
    this.listObjects = [];
    this.rowTexts = [];
    this.mineRow = null;
    if (this.tab === "local") {
      this.renderRows(toHighScoreRows(loadRunHistory()), HIGH_SCORE_COLUMNS, "NO SCORES YET");
      return;
    }
    const message = globalBoardMessage(this.global);
    const rows = this.global.kind === "ok" ? this.global.rows : [];
    const mine = rows.findIndex((row) => row.mine);
    this.mineRow = mine === -1 ? null : mine;
    this.renderRows(rows, GLOBAL_SCORE_COLUMNS, message ?? "", this.mineRow);
  }

  private renderRows<R>(
    rows: readonly R[],
    columns: readonly HighScoreColumn<R>[],
    emptyMessage: string,
    highlightRow: number | null = null,
  ): void {
    this.itemCount = rows.length;
    this.scrollState = createScoreListScroll(this.itemCount, SCROLL);

    if (rows.length === 0) {
      const empty = addGameText(this, 0, 0, emptyMessage, SCORES_FONT_SIZE).setDepth(1);
      placeGameText(empty, PLAYFIELD_WIDTH / 2, LIST_TOP + VIEWPORT_HEIGHT / 2, 0.5, 0.5);
      this.listObjects.push(empty);
      return;
    }

    const probe = addGameText(this, 0, 0, "", SCORES_FONT_SIZE).setVisible(false);
    const measure = (text: string): number => {
      probe.setText(text);
      return Math.round(probe.getTextBounds(true).local.width);
    };
    const layout = layoutHighScoreColumns(measure, rows, columns);
    probe.destroy();

    const listLeftX = Math.round(PLAYFIELD_WIDTH / 2 - layout.totalWidth / 2);
    this.placeScoreCells(
      columns.map((column) => ({ id: column.id, content: column.header, align: "left" as const })),
      layout,
      listLeftX,
      HEADER_Y,
      10,
      TEXT_COLOR_WHITE,
    );
    this.listObjects.push(
      this.add
        .rectangle(PLAYFIELD_WIDTH / 2, HEADER_LINE_Y, layout.totalWidth, 2, 0xffffff)
        .setDepth(10),
    );

    for (const [index, row] of rows.entries()) {
      this.rowTexts.push(
        this.placeScoreCells(
          columns.map((column) => ({
            id: column.id,
            content: column.text(row),
            align: column.align,
          })),
          layout,
          listLeftX,
          LIST_TOP + index * SCROLL.rowHeight,
          1,
          index === highlightRow ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE,
        ),
      );
    }
    this.applyScrollOffset();
  }

  private placeScoreCells(
    cells: readonly { id: HighScoreColumnId; content: string; align: HighScoreAlign }[],
    layout: HighScoreColumnLayout,
    listLeftX: number,
    y: number,
    depth: number,
    color: number,
  ): GameText[] {
    return cells.map((cell) => {
      const text = addGameText(this, 0, 0, cell.content, SCORES_FONT_SIZE, color).setDepth(depth);
      this.listObjects.push(text);
      placeGameText(
        text,
        highScoreCellX(layout, cell.id, cell.align, listLeftX),
        y,
        cell.align === "right" ? 1 : 0,
        0,
      );
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
