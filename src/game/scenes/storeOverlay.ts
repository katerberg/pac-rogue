import Phaser from "phaser";
import { fitFontSize } from "../../domain/fitFontSize";
import { wrapCharsForBox } from "../../domain/textLayout";
import {
  CLASSIC_MAZE_COLS,
  CLASSIC_MAZE_ROWS,
  cellCenterX,
  cellCenterY,
  computeMazeGeometry,
  getActiveLayout,
  pelletDisplaySize,
} from "../../domain/maze";
import {
  STORE_ENHANCE_BORDER_COLOR,
  enhanceGlowAlpha,
  sacrificeHints,
  slotPrice,
  storeCorner,
  storePanelMode,
  swapIncomingSchool,
  type StoreDir,
  type StoreFreebie,
  type StorePromptView,
  type StoreSacrifice,
  type StoreSlot,
  type StoreState,
} from "../../domain/store";
import {
  enhancedIdOf,
  getUpgradeDef,
  isRare,
  type UpgradeId,
  type UpgradeSchool,
} from "../../domain/upgrades";
import { SCHOOL_WATERMARK_ALPHA, schoolArtSize, schoolArtTextureKey } from "../../domain/schoolArt";
import { wrapText } from "../../domain/wrapText";
import {
  addDotManIcon,
  addQuarterIcon,
  addReverseIcon,
  PELLET_TEXTURE_KEY,
} from "../systems/render";
import { glyphInkCenterOffsetX } from "./font8x8Basic";
import { addRareFx } from "./rareFx";
import {
  addPixelText,
  HUD_FONT_SIZE,
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";
import {
  SCHOOL_COLORS,
  schoolBorderColor,
  setSchoolWatermark,
  stackTextsFromTop,
} from "./upgradeChoiceModal";

const TILE_DEPTH = -1;
const PANEL_DEPTH = 20;
const PANEL_WIDTH = 208;
const PANEL_HEIGHT = 124;
const PANEL_SIDE_PAD = 8;
const PANEL_TOP_PAD = 4;
const PANEL_ROW_GAP = 2;
const PANEL_TITLE_MAX_CHARS = 24;
const PANEL_BODY_MAX_CHARS = 24;
const PLAY_AREA = computeMazeGeometry(CLASSIC_MAZE_COLS, CLASSIC_MAZE_ROWS);
const PANEL_DIM_ALPHA = 0.3;
const BUY_Y = PANEL_HEIGHT / 2 - 28;
const NEVER_MIND_Y = PANEL_HEIGHT / 2 - 10;
const FREEBIE_ICON_INSET_PX = 2;

export type StoreOverlay = {
  open: (state: StoreState) => void;
  sync: (state: StoreState, prompt: StorePromptView | null, deltaMs: number) => void;
  showPurchased: (id: UpgradeId) => void;
  destroy: () => void;
};

type SacrificeView = {
  outgoingId: UpgradeId;
  incomingSchool: UpgradeSchool | null;
  stage: StoreSacrifice["stage"] | null;
};

type PanelContent = {
  title: string;
  school: UpgradeSchool | null;
  body: string;
  footer: string;
  sacrifice: SacrificeView | null;
};

type Panel = {
  root: Phaser.GameObjects.Container;
  show: (content: PanelContent) => void;
  showChoice: (confirmYes: boolean | null) => void;
};

const SACRIFICE_TITLE = "SACRIFICE";
const SACRIFICE_COIN_MARK = "#";
const SACRIFICE_SCHOOL_MARK = "@@";
const SACRIFICE_SCHOOL_ICON_PX = 12;
const SACRIFICE_BODY_CHARS = 24;
const SACRIFICE_SYMBOL_SIZE = 40;
const SACRIFICE_SYMBOL_Y = 14;
const SACRIFICE_LEFT_X = -40;
const SACRIFICE_RIGHT_X = 40;
const SACRIFICE_ARROW_GAP = 26;
const SACRIFICE_HINT_Y = SACRIFICE_SYMBOL_Y + 42;
const SACRIFICE_HINT_X = PANEL_WIDTH / 2 - PANEL_SIDE_PAD;
const SACRIFICE_FOOTER_BOTTOM_Y = PANEL_HEIGHT / 2 - 8;
const SACRIFICE_SYMBOL_ALPHA = 0.3;
const SACRIFICE_SELECTED_ALPHA = 0.55;
const SACRIFICE_ARROW_SIZE = 6;
const SACRIFICE_LABEL_MAX_PX = 72;

function slotSchool(slot: StoreSlot): UpgradeSchool | null {
  if (slot.kind === "upgrade") {
    return getUpgradeDef(slot.id).school;
  }
  if (slot.kind === "swap") {
    return swapIncomingSchool(slot);
  }
  return slot.kind === "enhance" ? getUpgradeDef(slot.targetId).school : null;
}

function slotRare(slot: StoreSlot): boolean {
  return slot.kind === "upgrade" && isRare(slot.id);
}

function slotTitle(slot: StoreSlot): string {
  switch (slot.kind) {
    case "swap":
      return SACRIFICE_TITLE;
    case "enhance":
      return getUpgradeDef(enhancedIdOf(slot.targetId)).label;
    case "upgrade":
      return getUpgradeDef(slot.id).label;
  }
}

function slotBody(slot: StoreSlot): string {
  switch (slot.kind) {
    case "swap":
      return sacrificeBody(swapIncomingSchool(slot));
    case "enhance":
      return getUpgradeDef(enhancedIdOf(slot.targetId)).enhanceNote!;
    case "upgrade":
      return getUpgradeDef(slot.id).description;
  }
}

function promptFooter(prompt: StorePromptView): string {
  switch (prompt.kind) {
    case "confirm":
      return `COST ${prompt.price}`;
    case "needQuarters":
      return `NEED ${prompt.price}\nQUARTERS`;
    case "nothingToSwap":
      return "NOTHING\nTO SWAP";
    case "nothingToEnhance":
      return "NOTHING\nTO ENHANCE";
  }
}

function slotContent(
  slot: StoreSlot,
  footer: string,
  sacrifice: StoreSacrifice | null,
  choosing: boolean,
): PanelContent {
  const swapView: SacrificeView | null =
    slot.kind === "swap" && !slot.sold
      ? {
          outgoingId: sacrifice?.id ?? slot.outgoingId,
          incomingSchool: swapIncomingSchool(slot),
          stage: choosing ? (sacrifice?.stage ?? null) : null,
        }
      : null;
  return {
    title: slotTitle(slot),
    school: slotSchool(slot),
    body: slotBody(slot),
    footer,
    sacrifice: swapView,
  };
}

function gotContent(id: UpgradeId): PanelContent {
  const def = getUpgradeDef(id);
  return {
    title: def.label,
    school: def.school,
    body: def.description,
    footer: "GOT IT!",
    sacrifice: null,
  };
}

function sacrificeBody(school: UpgradeSchool | null): string {
  const gain = school === null ? "?" : SACRIFICE_SCHOOL_MARK;
  return wrapText(
    `Pay ${SACRIFICE_COIN_MARK} and lose power. Gain a random ${gain} power.`,
    SACRIFICE_BODY_CHARS,
  );
}

function panelCenter(slot: StoreSlot, freebie: StoreFreebie): { x: number; y: number } {
  const { right, bottom } = storeCorner(slot, freebie);
  const left = PLAY_AREA.offsetX;
  const top = PLAY_AREA.offsetY;
  return {
    x: right ? left + PLAY_AREA.pixelWidth - PANEL_WIDTH / 2 : left + PANEL_WIDTH / 2,
    y: bottom ? top + PLAY_AREA.pixelHeight - PANEL_HEIGHT / 2 : top + PANEL_HEIGHT / 2,
  };
}

type SacrificeParts = {
  objects: Phaser.GameObjects.GameObject[];
  pay: Phaser.GameObjects.BitmapText;
  show: (view: SacrificeView | null) => void;
  placeIcons: () => void;
};

const ARROW_DIRS = ["up", "down"] as const;

function arrowPoints(dir: (typeof ARROW_DIRS)[number], x: number, y: number): [number, number][] {
  const r = SACRIFICE_ARROW_SIZE;
  const tip = dir === "up" ? y - r : y + r;
  const base = dir === "up" ? y + r - 2 : y - r + 2;
  return [
    [x, tip],
    [x - r, base],
    [x + r, base],
  ];
}

type TextMark = { line: number; col: number; width: number };

function textMarkAt(lines: readonly string[], mark: string): TextMark | null {
  const line = lines.findIndex((text) => text.includes(mark));
  return line === -1 ? null : { line, col: lines[line]!.indexOf(mark), width: mark.length };
}

function buildSacrificeView(scene: Phaser.Scene, onDir: (dir: StoreDir) => void): SacrificeParts {
  const symbol = (x: number): Phaser.GameObjects.Image =>
    scene.add
      .image(x, SACRIFICE_SYMBOL_Y, "")
      .setDisplaySize(SACRIFICE_SYMBOL_SIZE, SACRIFICE_SYMBOL_SIZE);
  const pay = addPixelText(
    scene,
    0,
    0,
    "",
    UPGRADES_HUD_FONT_SIZE,
    TEXT_COLOR_WHITE,
  ).setCenterAlign();
  const coin = addQuarterIcon(scene, 0, 0, UPGRADES_HUD_FONT_SIZE);
  const schoolIcon = scene.add.image(0, 0, "");
  const leftArt = symbol(SACRIFICE_LEFT_X);
  const rightArt = symbol(SACRIFICE_RIGHT_X);
  const leftLabel = addPixelText(
    scene,
    0,
    0,
    "",
    UPGRADES_HUD_FONT_SIZE,
    TEXT_COLOR_WHITE,
  ).setCenterAlign();
  const rightMark = addPixelText(scene, 0, 0, "?", MENU_TITLE_FONT_SIZE, TEXT_COLOR_WHITE);
  placePixelText(rightMark, SACRIFICE_RIGHT_X, SACRIFICE_SYMBOL_Y, 0.5, 0.5);
  const arrows = scene.add.graphics();
  const zones = ARROW_DIRS.map((dir) =>
    scene.add
      .zone(0, 0, SACRIFICE_ARROW_SIZE * 4, SACRIFICE_ARROW_SIZE * 4)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => onDir(dir)),
  );
  const leftHint = addPixelText(scene, 0, 0, "", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_YELLOW);
  const rightHint = addPixelText(scene, 0, 0, "", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_YELLOW);
  leftHint.setInteractive({ useHandCursor: true }).on("pointerdown", () => onDir("left"));
  rightHint.setInteractive({ useHandCursor: true }).on("pointerdown", () => onDir("right"));
  const objects = [
    leftArt,
    rightArt,
    leftLabel,
    rightMark,
    pay,
    coin,
    schoolIcon,
    arrows,
    ...zones,
    leftHint,
    rightHint,
  ];
  let marks: { coin: TextMark | null; school: TextMark | null } = { coin: null, school: null };
  return {
    objects,
    pay,
    show: (view) => {
      for (const object of objects) {
        (object as Phaser.GameObjects.Components.Visible).setVisible(view !== null);
      }
      arrows.clear();
      if (view === null) {
        return;
      }
      const wrapped = sacrificeBody(view.incomingSchool).split("\n");
      marks = {
        coin: textMarkAt(wrapped, SACRIFICE_COIN_MARK),
        school: textMarkAt(wrapped, SACRIFICE_SCHOOL_MARK),
      };
      pay.setText(
        wrapped.join("\n").replace(SACRIFICE_COIN_MARK, " ").replace(SACRIFICE_SCHOOL_MARK, "  "),
      );
      schoolIcon.setVisible(marks.school !== null);
      if (view.incomingSchool !== null) {
        schoolIcon
          .setTexture(schoolArtTextureKey(view.incomingSchool))
          .setDisplaySize(SACRIFICE_SCHOOL_ICON_PX, SACRIFICE_SCHOOL_ICON_PX);
      }
      const outgoing = getUpgradeDef(view.outgoingId);
      leftArt
        .setTexture(schoolArtTextureKey(outgoing.school))
        .setDisplaySize(SACRIFICE_SYMBOL_SIZE, SACRIFICE_SYMBOL_SIZE);
      leftLabel.setText(wrapText(outgoing.label, SACRIFICE_LABEL_MAX_PX / UPGRADES_HUD_FONT_SIZE));
      placePixelText(leftLabel, SACRIFICE_LEFT_X, SACRIFICE_SYMBOL_Y, 0.5, 0.5);
      rightArt.setVisible(view.incomingSchool !== null);
      rightMark.setVisible(view.incomingSchool === null);
      if (view.incomingSchool !== null) {
        rightArt
          .setTexture(schoolArtTextureKey(view.incomingSchool))
          .setDisplaySize(SACRIFICE_SYMBOL_SIZE, SACRIFICE_SYMBOL_SIZE);
      }
      leftArt.setAlpha(view.stage === "power" ? SACRIFICE_SELECTED_ALPHA : SACRIFICE_SYMBOL_ALPHA);
      rightArt.setAlpha(
        view.stage === "school" ? SACRIFICE_SELECTED_ALPHA : SACRIFICE_SYMBOL_ALPHA,
      );
      rightMark.setAlpha(
        view.stage === "school" ? SACRIFICE_SELECTED_ALPHA : SACRIFICE_SYMBOL_ALPHA,
      );
      const hints = view.stage === null ? null : sacrificeHints(view.stage);
      const selectedX = view.stage === "school" ? SACRIFICE_RIGHT_X : SACRIFICE_LEFT_X;
      arrows.fillStyle(TEXT_COLOR_YELLOW, 1);
      ARROW_DIRS.forEach((dir, i) => {
        const shown = hints !== null && hints.vertical;
        const cx = selectedX;
        const cy = SACRIFICE_SYMBOL_Y + (dir === "up" ? -SACRIFICE_ARROW_GAP : SACRIFICE_ARROW_GAP);
        zones[i]!.setPosition(cx, cy).setVisible(shown);
        if (shown) {
          const [a, b, c] = arrowPoints(dir, cx, cy);
          arrows.fillTriangle(a![0], a![1], b![0], b![1], c![0], c![1]);
        }
      });
      leftHint.setVisible(hints !== null);
      rightHint.setVisible(hints !== null);
      if (hints !== null) {
        leftHint.setText(`< ${hints.left}`);
        rightHint.setText(`${hints.right} >`);
        placePixelText(leftHint, -SACRIFICE_HINT_X, SACRIFICE_HINT_Y, 0, 0.5);
        placePixelText(rightHint, SACRIFICE_HINT_X, SACRIFICE_HINT_Y, 1, 0.5);
      }
    },
    placeIcons: () => {
      const lines = pay.text.split("\n");
      const widest = Math.max(...lines.map((text) => text.length));
      const bounds = pay.getTextBounds(true).local;
      const pitch =
        lines.length > 1 ? (bounds.height - UPGRADES_HUD_FONT_SIZE) / (lines.length - 1) : 0;
      const place = (icon: Phaser.GameObjects.Image, mark: TextMark | null) => {
        if (mark === null) {
          return;
        }
        icon.setPosition(
          pay.x +
            ((widest - lines[mark.line]!.length) * UPGRADES_HUD_FONT_SIZE) / 2 +
            (mark.col + mark.width / 2) * UPGRADES_HUD_FONT_SIZE,
          pay.y + mark.line * pitch + UPGRADES_HUD_FONT_SIZE / 2,
        );
      };
      place(coin, marks.coin);
      place(schoolIcon, marks.school);
    },
  };
}

export function createStoreOverlay(
  scene: Phaser.Scene,
  onChoose: (choice: "yes" | "no") => void,
  onSelect: (index: number) => void,
  onDir: (dir: StoreDir) => void,
): StoreOverlay {
  let tiles: (Phaser.GameObjects.Container | null)[] = [];
  let panels: Panel[] = [];
  let freebieTile: Phaser.GameObjects.Container | null = null;
  let dots: Phaser.GameObjects.Image[] = [];
  let glows: (Phaser.GameObjects.Rectangle | null)[] = [];
  let glowElapsedMs = 0;
  let gotIds: (UpgradeId | null)[] = [];
  let pendingGot: UpgradeId | null = null;

  const buildPanel = (slot: StoreSlot, freebie: StoreFreebie, index: number): Panel => {
    const { x, y } = panelCenter(slot, freebie);
    const bg = scene.add.rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x101820);
    const zone = scene.add
      .zone(0, 0, PANEL_WIDTH, PANEL_HEIGHT)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => onSelect(index));
    const watermark = scene.add.image(0, 0, "").setAlpha(SCHOOL_WATERMARK_ALPHA).setVisible(false);
    const title = addPixelText(scene, 0, 0, "", HUD_FONT_SIZE, TEXT_COLOR_YELLOW);
    const body = addPixelText(scene, 0, 0, "", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_WHITE);
    const footer = addPixelText(scene, 0, 0, "", HUD_FONT_SIZE, TEXT_COLOR_YELLOW);
    const buy = addPixelText(scene, 0, 0, "BUY", MENU_OPTION_FONT_SIZE);
    const neverMind = addPixelText(scene, 0, 0, "NEVER MIND", MENU_OPTION_FONT_SIZE);
    placePixelText(buy, 0, BUY_Y, 0.5, 0.5);
    placePixelText(neverMind, 0, NEVER_MIND_Y, 0.5, 0.5);
    for (const [text, choice] of [
      [buy, "yes"],
      [neverMind, "no"],
    ] as const) {
      text.setInteractive({ useHandCursor: true }).on("pointerdown", () => onChoose(choice));
    }
    const sacrificeView = buildSacrificeView(scene, onDir);
    sacrificeView.show(null);
    buy.setVisible(false);
    neverMind.setVisible(false);
    const root = scene.add
      .container(x, y, [
        bg,
        zone,
        watermark,
        title,
        body,
        footer,
        buy,
        neverMind,
        ...sacrificeView.objects,
      ])
      .setDepth(PANEL_DEPTH);
    let shown = "";
    return {
      root,
      show: (content) => {
        const key = JSON.stringify(content);
        if (key === shown) {
          return;
        }
        shown = key;
        const titleSize = fitFontSize(
          content.title,
          PANEL_WIDTH - 2 * PANEL_SIDE_PAD,
          HUD_FONT_SIZE,
        );
        const budget = (fontSize: number, max: number): number =>
          Math.min(max, wrapCharsForBox(PANEL_WIDTH, fontSize, PANEL_SIDE_PAD));
        title.setText(wrapText(content.title, budget(titleSize, PANEL_TITLE_MAX_CHARS)));
        title.setFontSize(titleSize);
        footer.setText(content.footer);
        sacrificeView.show(content.sacrifice);
        if (content.sacrifice !== null) {
          watermark.setVisible(false);
          body.setVisible(false);
          stackTextsFromTop(
            [
              { text: title, gapBelow: PANEL_ROW_GAP },
              { text: sacrificeView.pay, gapBelow: 0 },
            ],
            -PANEL_HEIGHT / 2 + PANEL_TOP_PAD,
          );
          sacrificeView.placeIcons();
          placePixelText(footer, 0, SACRIFICE_FOOTER_BOTTOM_Y, 0.5, 1);
          footer.setVisible(content.sacrifice.stage === null);
          return;
        }
        body.setVisible(true);
        footer.setVisible(true);
        body.setText(wrapText(content.body, budget(UPGRADES_HUD_FONT_SIZE, PANEL_BODY_MAX_CHARS)));
        setSchoolWatermark(watermark, content.school, PANEL_WIDTH, PANEL_HEIGHT);
        stackTextsFromTop(
          [
            { text: title, gapBelow: PANEL_ROW_GAP },
            { text: body, gapBelow: PANEL_ROW_GAP },
            { text: footer, gapBelow: 0 },
          ],
          -PANEL_HEIGHT / 2 + PANEL_TOP_PAD,
        );
      },
      showChoice: (confirmYes) => {
        buy.setVisible(confirmYes !== null);
        neverMind.setVisible(confirmYes !== null);
        buy.setTint(confirmYes === true ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
        neverMind.setTint(confirmYes === false ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
      },
    };
  };

  const buildDot = (cell: { col: number; row: number }): Phaser.GameObjects.Image => {
    const size = pelletDisplaySize();
    return scene.add
      .image(cellCenterX(cell.col), cellCenterY(cell.row), PELLET_TEXTURE_KEY)
      .setDisplaySize(size, size)
      .setDepth(TILE_DEPTH);
  };
  const buildFreebie = (freebie: StoreFreebie): Phaser.GameObjects.Container => {
    const iconPx = getActiveLayout().tileSize - FREEBIE_ICON_INSET_PX;
    const icon =
      freebie.kind === "life"
        ? addDotManIcon(scene, 0, 0, iconPx)
        : addQuarterIcon(scene, 0, 0, iconPx);
    return scene.add
      .container(cellCenterX(freebie.col), cellCenterY(freebie.row), [icon])
      .setDepth(TILE_DEPTH);
  };
  const buildTile = (slot: StoreSlot, index: number): Phaser.GameObjects.Container => {
    const size = getActiveLayout().tileSize;
    const enhance = slot.kind === "enhance";
    const tileSchool = slotSchool(slot);
    let glyph: Phaser.GameObjects.GameObject;
    if (slot.kind === "swap") {
      const glyphColor = tileSchool === null ? TEXT_COLOR_YELLOW : SCHOOL_COLORS[tileSchool];
      glyph = addReverseIcon(scene, 0, 0, size - 2).setTint(glyphColor);
    } else if (slot.kind === "upgrade" && tileSchool !== null) {
      const iconPx = schoolArtSize(size, size);
      glyph = scene.add.image(0, 0, schoolArtTextureKey(tileSchool)).setDisplaySize(iconPx, iconPx);
    } else {
      const char = enhance ? "+" : slotTitle(slot).charAt(0).toUpperCase();
      const school = enhance ? null : tileSchool;
      const glyphColor = school === null ? TEXT_COLOR_YELLOW : SCHOOL_COLORS[school];
      const text = addPixelText(scene, 0, 0, char, HUD_FONT_SIZE, glyphColor);
      const inkOffset = (glyphInkCenterOffsetX(char) * HUD_FONT_SIZE) / 8;
      placePixelText(text, inkOffset, 0, 0.5, 0.5);
      glyph = text;
    }
    const zone = scene.add.zone(0, 0, size, size).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => onSelect(index));
    const glow = enhance
      ? scene.add.rectangle(0, 0, size + 4, size + 4, STORE_ENHANCE_BORDER_COLOR, 0.3)
      : null;
    glows[index] = glow;
    const container = scene.add
      .container(cellCenterX(slot.col), cellCenterY(slot.row), [
        ...(glow === null ? [] : [glow]),
        glyph,
        zone,
      ])
      .setDepth(TILE_DEPTH);
    if (slotRare(slot)) {
      addRareFx(scene, container, size, size, schoolBorderColor(tileSchool));
    }
    return container;
  };

  const clear = (): void => {
    for (const tile of tiles) {
      tile?.destroy(true);
    }
    for (const panel of panels) {
      panel.root.destroy(true);
    }
    freebieTile?.destroy(true);
    dots.forEach((dot) => dot.destroy());
    dots = [];
    tiles = [];
    panels = [];
    freebieTile = null;
    glows = [];
    gotIds = [];
    pendingGot = null;
  };

  return {
    open: (state) => {
      clear();
      dots = state.dots.map(buildDot);
      tiles = state.slots.map(buildTile);
      panels = state.slots.map((slot, i) => buildPanel(slot, state.freebie, i));
      freebieTile = state.freebie.taken ? null : buildFreebie(state.freebie);
    },
    sync: (state, prompt, deltaMs) => {
      state.slots.forEach((slot, i) => {
        const tile = tiles[i];
        if (tile && slot.sold) {
          tile.destroy(true);
          tiles[i] = null;
          glows[i] = null;
          gotIds[i] = pendingGot;
          pendingGot = null;
        }
      });
      if (state.freebie.taken && freebieTile !== null) {
        freebieTile.destroy(true);
        freebieTile = null;
      }
      glowElapsedMs += deltaMs;
      for (const glow of glows) {
        glow?.setAlpha(enhanceGlowAlpha(glowElapsedMs));
      }
      panels.forEach((panel, i) => {
        const slot = state.slots[i]!;
        const got = gotIds[i] ?? null;
        const mode = storePanelMode(state, prompt, i);
        const footer = slot.sold
          ? "SOLD"
          : mode === "info" && prompt !== null
            ? promptFooter(prompt)
            : `COST ${slotPrice(slot)}`;
        const choosing = mode === "choosing";
        panel.show(
          got !== null
            ? gotContent(got)
            : slotContent(slot, footer, i === state.activeSlot ? state.sacrifice : null, choosing),
        );
        panel.showChoice(choosing && slot.kind !== "swap" ? state.confirmYes : null);
        const alpha = mode === "dimmed" ? PANEL_DIM_ALPHA : 1;
        panel.root.setAlpha(alpha);
      });
    },
    showPurchased: (id) => {
      pendingGot = id;
    },
    destroy: clear,
  };
}
