import Phaser from "phaser";
import { fitFontSize } from "../../domain/fitFontSize";
import { wrapCharsForBox } from "../../domain/textLayout";
import { cellCenterX, cellCenterY, getActiveLayout } from "../../domain/maze";
import { mazeColorForIndex } from "../../domain/mazeColorSettings";
import {
  STORE_ENHANCE_BORDER_COLOR,
  STORE_SLOT_SIZE,
  enhanceGlowAlpha,
  slotPrice,
  storePanelMode,
  swapIncomingSchool,
  type StoreFreebie,
  type StorePromptView,
  type StoreSlot,
  type StoreState,
} from "../../domain/store";
import {
  enhancedIdOf,
  getUpgradeDef,
  isRare,
  UPGRADE_SCHOOL_LABELS,
  type UpgradeId,
  type UpgradeSchool,
} from "../../domain/upgrades";
import { SCHOOL_WATERMARK_ALPHA, schoolArtSize, schoolArtTextureKey } from "../../domain/schoolArt";
import { wrapText } from "../../domain/wrapText";
import { loadMazeColorSettings } from "../storage/mazeColorStorage";
import { addDotManIcon, addQuarterIcon, addReverseIcon } from "../systems/render";
import { glyphInkCenterOffsetX } from "./font8x8Basic";
import { addRareFx, createRareFxToggle } from "./rareFx";
import {
  addPixelText,
  HUD_FONT_SIZE,
  MENU_OPTION_FONT_SIZE,
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
const PANEL_WIDTH = 168;
const PANEL_HEIGHT = 190;
const PANEL_SIDE_PAD = 8;
const PANEL_TOP_PAD = 12;
const PANEL_ROW_GAP = 8;
const PANEL_TITLE_MAX_CHARS = 10;
const PANEL_BODY_MAX_CHARS = 18;
const PANEL_DIM_ALPHA = 0.3;
const BUY_Y = PANEL_HEIGHT / 2 - 42;
const NEVER_MIND_Y = PANEL_HEIGHT / 2 - 18;
const TILE_DOT_PX = 2;
const TILE_COIN_PX = 8;
const TILE_COIN_GAP_PX = 1;
const TILE_GLYPH_Y = -5;
const FREEBIE_ICON_INSET_PX = 6;

export type StoreOverlay = {
  open: (state: StoreState) => void;
  sync: (state: StoreState, prompt: StorePromptView | null, deltaMs: number) => void;
  showPurchased: (id: UpgradeId) => void;
  destroy: () => void;
};

type PanelContent = {
  title: string;
  school: UpgradeSchool | null;
  rare: boolean;
  body: string;
  footer: string;
};

type Panel = {
  root: Phaser.GameObjects.Container;
  show: (content: PanelContent) => void;
  showChoice: (confirmYes: boolean | null) => void;
};

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
      return "SWAP";
    case "enhance":
      return getUpgradeDef(enhancedIdOf(slot.targetId)).label;
    case "upgrade":
      return getUpgradeDef(slot.id).label;
  }
}

function slotBody(slot: StoreSlot): string {
  switch (slot.kind) {
    case "swap":
      return swapBody(slot);
    case "enhance":
      return getUpgradeDef(enhancedIdOf(slot.targetId)).enhanceNote!;
    case "upgrade":
      return getUpgradeDef(slot.id).description;
  }
}

function swapBody(slot: StoreSlot & { kind: "swap" }): string {
  const lost = getUpgradeDef(slot.outgoingId);
  const incoming = swapIncomingSchool(slot);
  const gain = incoming === null ? "?" : UPGRADE_SCHOOL_LABELS[incoming];
  return `Lose ${lost.label}. Gain random ${gain} upgrade.`;
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

function coinRowXs(count: number, maxWidth: number): number[] {
  const naturalStep = TILE_COIN_PX + TILE_COIN_GAP_PX;
  const step =
    count > 1 ? Math.min(naturalStep, (maxWidth - TILE_COIN_PX) / (count - 1)) : naturalStep;
  const first = (-(count - 1) * step) / 2;
  return Array.from({ length: count }, (_, i) => first + i * step);
}

function dotFrame(graphics: Phaser.GameObjects.Graphics, size: number): void {
  const edge = size / 2 - 1;
  for (let d = -edge; d < edge; d += TILE_DOT_PX * 2) {
    graphics.fillRect(d, -edge, TILE_DOT_PX, 1);
    graphics.fillRect(d, edge - 1, TILE_DOT_PX, 1);
    graphics.fillRect(-edge, d, 1, TILE_DOT_PX);
    graphics.fillRect(edge - 1, d, 1, TILE_DOT_PX);
  }
}

function slotContent(slot: StoreSlot, footer: string): PanelContent {
  return {
    title: slotTitle(slot),
    school: slotSchool(slot),
    rare: slotRare(slot),
    body: slotBody(slot),
    footer,
  };
}

function gotContent(id: UpgradeId): PanelContent {
  const def = getUpgradeDef(id);
  return {
    title: def.label,
    school: def.school,
    rare: def.rare === true,
    body: def.description,
    footer: "GOT IT!",
  };
}

function panelCenter(slot: StoreSlot, freebie: StoreFreebie): { x: number; y: number } {
  const slotX = (cellCenterX(slot.col) + cellCenterX(slot.col + 1)) / 2;
  const slotY = (cellCenterY(slot.row) + cellCenterY(slot.row + 1)) / 2;
  return {
    x: (slotX + cellCenterX(freebie.col)) / 2,
    y: (slotY + cellCenterY(freebie.row)) / 2,
  };
}

export function createStoreOverlay(
  scene: Phaser.Scene,
  onChoose: (choice: "yes" | "no") => void,
  onSelect: (index: number) => void,
): StoreOverlay {
  let tiles: (Phaser.GameObjects.Container | null)[] = [];
  let panels: Panel[] = [];
  let freebieTile: Phaser.GameObjects.Container | null = null;
  let glows: (Phaser.GameObjects.Rectangle | null)[] = [];
  let glowElapsedMs = 0;
  let gotIds: (UpgradeId | null)[] = [];
  let pendingGot: UpgradeId | null = null;

  const buildPanel = (x: number, y: number, index: number): Panel => {
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
    const root = scene.add
      .container(x, y, [bg, zone, watermark, title, body, footer, buy, neverMind])
      .setDepth(PANEL_DEPTH);
    const rareFx = createRareFxToggle(scene, root, PANEL_WIDTH, PANEL_HEIGHT);
    let shown = "";
    return {
      root,
      show: (content) => {
        const key = JSON.stringify(content);
        if (key === shown) {
          return;
        }
        shown = key;
        bg.setStrokeStyle(2, schoolBorderColor(content.school));
        rareFx(content.rare, schoolBorderColor(content.school));
        const titleSize = fitFontSize(
          content.title,
          PANEL_WIDTH - 2 * PANEL_SIDE_PAD,
          HUD_FONT_SIZE,
        );
        const budget = (fontSize: number, max: number): number =>
          Math.min(max, wrapCharsForBox(PANEL_WIDTH, fontSize, PANEL_SIDE_PAD));
        title.setText(wrapText(content.title, budget(titleSize, PANEL_TITLE_MAX_CHARS)));
        title.setFontSize(titleSize);
        body.setText(wrapText(content.body, budget(UPGRADES_HUD_FONT_SIZE, PANEL_BODY_MAX_CHARS)));
        footer.setText(content.footer);
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

  const buildFreebie = (freebie: StoreFreebie): Phaser.GameObjects.Container => {
    const tile = getActiveLayout().tileSize;
    const iconPx = tile - FREEBIE_ICON_INSET_PX;
    const frame = scene.add
      .graphics()
      .fillStyle(mazeColorForIndex(loadMazeColorSettings().colorIndex), 1);
    dotFrame(frame, tile);
    const icon =
      freebie.kind === "life"
        ? addDotManIcon(scene, 0, 0, iconPx)
        : addQuarterIcon(scene, 0, 0, iconPx);
    return scene.add
      .container(cellCenterX(freebie.col), cellCenterY(freebie.row), [frame, icon])
      .setDepth(TILE_DEPTH);
  };
  const buildTile = (slot: StoreSlot, index: number): Phaser.GameObjects.Container => {
    const tile = getActiveLayout().tileSize;
    const size = tile * STORE_SLOT_SIZE;
    const x = (cellCenterX(slot.col) + cellCenterX(slot.col + 1)) / 2;
    const y = (cellCenterY(slot.row) + cellCenterY(slot.row + 1)) / 2;
    const enhance = slot.kind === "enhance";
    const frame = scene.add.graphics();
    const tileSchool = slotSchool(slot);
    frame.fillStyle(
      enhance
        ? STORE_ENHANCE_BORDER_COLOR
        : tileSchool === null
          ? mazeColorForIndex(loadMazeColorSettings().colorIndex)
          : schoolBorderColor(tileSchool),
      1,
    );
    dotFrame(frame, size);
    const coinY = size / 2 - 3 - TILE_COIN_PX / 2;
    const coins = coinRowXs(slotPrice(slot), size - 6).map((cx) =>
      addQuarterIcon(scene, cx, coinY, TILE_COIN_PX),
    );
    let glyph: Phaser.GameObjects.GameObject;
    if (slot.kind === "swap") {
      const school = slotSchool(slot);
      const glyphColor = school === null ? TEXT_COLOR_YELLOW : SCHOOL_COLORS[school];
      glyph = addReverseIcon(scene, 0, TILE_GLYPH_Y, tile - 2).setTint(glyphColor);
    } else if (slot.kind === "upgrade" && tileSchool !== null) {
      const iconPx = schoolArtSize(size, size);
      glyph = scene.add
        .image(0, TILE_GLYPH_Y, schoolArtTextureKey(tileSchool))
        .setDisplaySize(iconPx, iconPx);
    } else {
      const char = enhance ? "+" : slotTitle(slot).charAt(0).toUpperCase();
      const school = enhance ? null : slotSchool(slot);
      const glyphColor = school === null ? TEXT_COLOR_YELLOW : SCHOOL_COLORS[school];
      const text = addPixelText(scene, 0, 0, char, HUD_FONT_SIZE, glyphColor);
      const inkOffset = (glyphInkCenterOffsetX(char) * HUD_FONT_SIZE) / 8;
      placePixelText(text, inkOffset, TILE_GLYPH_Y, 0.5, 0.5);
      glyph = text;
    }
    const zone = scene.add.zone(0, 0, size, size).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => onSelect(index));
    const glow = enhance
      ? scene.add.rectangle(0, 0, size + 4, size + 4, STORE_ENHANCE_BORDER_COLOR, 0.3)
      : null;
    glows[index] = glow;
    const container = scene.add
      .container(x, y, [...(glow === null ? [] : [glow]), frame, glyph, ...coins, zone])
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
      tiles = state.slots.map(buildTile);
      panels = state.slots.map((slot, i) => {
        const { x, y } = panelCenter(slot, state.freebie);
        return buildPanel(x, y, i);
      });
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
        panel.show(got !== null ? gotContent(got) : slotContent(slot, footer));
        panel.showChoice(mode === "choosing" ? state.confirmYes : null);
        panel.root.setAlpha(mode === "dimmed" ? PANEL_DIM_ALPHA : 1);
      });
    },
    showPurchased: (id) => {
      pendingGot = id;
    },
    destroy: clear,
  };
}
