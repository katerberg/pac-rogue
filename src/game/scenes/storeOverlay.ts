import Phaser from "phaser";
import { fitFontSize } from "../../domain/fitFontSize";
import { cellCenterX, cellCenterY, getActiveLayout } from "../../domain/maze";
import { mazeColorForIndex } from "../../domain/mazeColorSettings";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import {
  STORE_ENHANCE_BORDER_COLOR,
  STORE_SLOT_SIZE,
  enhanceGlowAlpha,
  slotPrice,
  type StorePromptView,
  type StoreSlot,
  type StoreState,
} from "../../domain/store";
import {
  enhancedIdOf,
  getUpgradeDef,
  type UpgradeId,
  type UpgradeSchool,
} from "../../domain/upgrades";
import { loadMazeColorSettings } from "../storage/mazeColorStorage";
import { PLAYER_OPEN_MOUTH_TEXTURE_KEY, QUARTER_TEXTURE_KEY } from "../systems/render";
import { glyphInkCenterOffsetX } from "./font8x8Basic";
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
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  DESCRIPTION_MAX_CHARS,
  LABEL_MAX_CHARS,
  MODAL_DEPTH,
  SCHOOL_COLORS,
  SCHOOL_GAP,
  setSchoolTag,
  stackTexts,
  wrapText,
} from "./upgradeChoiceModal";

const TILE_DEPTH = -1;
const PANEL_DEPTH = 20;
const PANEL_WIDTH = 168;
const PANEL_HEIGHT = 190;
const PANEL_TITLE_MAX_CHARS = 10;
const PANEL_TITLE_MARGIN = 8;
const MODAL_TITLE_MARGIN = 40;
const PANEL_BODY_MAX_CHARS = 18;
const TOAST_MS = 2000;
const TILE_DOT_PX = 2;
const TILE_COIN_PX = 8;
const TILE_COIN_GAP_PX = 1;
const TILE_GLYPH_Y = -5;

export type StoreOverlay = {
  open: (state: StoreState) => void;
  sync: (state: StoreState, prompt: StorePromptView | null, deltaMs: number) => void;
  showPurchased: (id: UpgradeId) => void;
  destroy: () => void;
};

type PanelContent = {
  title: string;
  school: UpgradeSchool | null;
  body: string;
  footer: string;
};

function slotSchool(slot: StoreSlot): UpgradeSchool | null {
  if (slot.kind === "upgrade") {
    return getUpgradeDef(slot.id).school;
  }
  return slot.kind === "enhance" ? getUpgradeDef(slot.targetId).school : null;
}

function slotTitle(slot: StoreSlot): string {
  switch (slot.kind) {
    case "life":
      return "EXTRA LIFE";
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
    case "life":
      return "+1 life.";
    case "swap":
      return `Lose ${getUpgradeDef(slot.outgoingId).label}. Gain ?`;
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

function coinRowXs(count: number, maxWidth: number): number[] {
  const naturalStep = TILE_COIN_PX + TILE_COIN_GAP_PX;
  const step =
    count > 1 ? Math.min(naturalStep, (maxWidth - TILE_COIN_PX) / (count - 1)) : naturalStep;
  const first = (-(count - 1) * step) / 2;
  return Array.from({ length: count }, (_, i) => first + i * step);
}

export function createStoreOverlay(
  scene: Phaser.Scene,
  onChoose: (choice: "yes" | "no") => void,
): StoreOverlay {
  let tiles: (Phaser.GameObjects.Container | null)[] = [];
  let hoveredSlot: number | null = null;
  let toast: { content: PanelContent; remainingMs: number } | null = null;
  let glows: (Phaser.GameObjects.Rectangle | null)[] = [];
  let glowElapsedMs = 0;

  const panelX = (PLAYFIELD_WIDTH + getActiveLayout().offsetX + getActiveLayout().pixelWidth) / 2;
  const panelY = cellCenterY(Math.floor(getActiveLayout().rows / 2));
  const panelBg = scene.add
    .rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x101820)
    .setStrokeStyle(2, TEXT_COLOR_YELLOW);
  const panelTitle = addPixelText(scene, 0, 0, "", HUD_FONT_SIZE, TEXT_COLOR_YELLOW);
  const panelSchool = addPixelText(scene, 0, 0, "", UPGRADES_HUD_FONT_SIZE);
  const panelBody = addPixelText(scene, 0, 0, "", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_WHITE);
  const panelFooter = addPixelText(scene, 0, 0, "", HUD_FONT_SIZE, TEXT_COLOR_YELLOW);
  const panel = scene.add
    .container(panelX, panelY, [panelBg, panelTitle, panelSchool, panelBody, panelFooter])
    .setDepth(PANEL_DEPTH)
    .setVisible(false);

  const dim = scene.add
    .rectangle(
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2,
      PLAYFIELD_WIDTH,
      PLAYFIELD_HEIGHT,
      0x000000,
      0.5,
    )
    .setDepth(MODAL_DEPTH)
    .setVisible(false);
  const modalBg = scene.add
    .rectangle(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, 0x101820)
    .setStrokeStyle(4, TEXT_COLOR_YELLOW);
  const modalTitle = addPixelText(
    scene,
    0,
    0,
    "",
    MENU_TITLE_FONT_SIZE,
    TEXT_COLOR_YELLOW,
  ).setCenterAlign();
  const modalSchool = addPixelText(scene, 0, 0, "", UPGRADES_HUD_FONT_SIZE);
  const modalBody = addPixelText(
    scene,
    0,
    0,
    "",
    UPGRADES_HUD_FONT_SIZE,
    TEXT_COLOR_WHITE,
  ).setCenterAlign();
  const modalCost = addPixelText(scene, 0, 0, "", MENU_OPTION_FONT_SIZE, TEXT_COLOR_WHITE);
  const modalSure = addPixelText(scene, 0, 0, "SURE?", MENU_OPTION_FONT_SIZE, TEXT_COLOR_WHITE);
  const modalYes = addPixelText(scene, 0, 0, "YES", MENU_OPTION_FONT_SIZE);
  const modalNo = addPixelText(scene, 0, 0, "NO", MENU_OPTION_FONT_SIZE);
  placePixelText(modalSure, -70, 80, 0.5, 0.5);
  placePixelText(modalYes, 10, 80, 0.5, 0.5);
  placePixelText(modalNo, 70, 80, 0.5, 0.5);
  for (const [text, choice] of [
    [modalYes, "yes"],
    [modalNo, "no"],
  ] as const) {
    text.setInteractive({ useHandCursor: true }).on("pointerdown", () => onChoose(choice));
  }
  const modal = scene.add
    .container(PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2, [
      modalBg,
      modalTitle,
      modalSchool,
      modalBody,
      modalCost,
      modalSure,
      modalYes,
      modalNo,
    ])
    .setDepth(MODAL_DEPTH + 1)
    .setVisible(false);

  const showModal = (prompt: StorePromptView | null, confirmYes: boolean): void => {
    dim.setVisible(prompt !== null);
    modal.setVisible(prompt !== null);
    if (prompt === null) {
      return;
    }
    const title = slotTitle(prompt.slot);
    modalTitle
      .setText(wrapText(title, LABEL_MAX_CHARS))
      .setFontSize(fitFontSize(title, BUTTON_WIDTH - MODAL_TITLE_MARGIN, MENU_TITLE_FONT_SIZE));
    modalBody.setText(wrapText(slotBody(prompt.slot), DESCRIPTION_MAX_CHARS));
    modalCost.setText(`COST ${prompt.price}`);
    const school = slotSchool(prompt.slot);
    setSchoolTag(modalSchool, school);
    stackTexts(
      [
        { text: modalTitle, gapBelow: SCHOOL_GAP },
        ...(school === null ? [] : [{ text: modalSchool, gapBelow: 0 }]),
      ],
      -58,
    );
    placePixelText(modalBody, 0, 8, 0.5, 0.5);
    placePixelText(modalCost, 0, 44, 0.5, 0.5);
    modalYes.setTint(confirmYes ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
    modalNo.setTint(confirmYes ? TEXT_COLOR_WHITE : TEXT_COLOR_YELLOW);
  };

  const showPanel = (content: PanelContent | null): void => {
    panel.setVisible(content !== null);
    if (content === null) {
      return;
    }
    panelTitle
      .setText(wrapText(content.title, PANEL_TITLE_MAX_CHARS))
      .setFontSize(fitFontSize(content.title, PANEL_WIDTH - PANEL_TITLE_MARGIN, HUD_FONT_SIZE));
    panelBody.setText(wrapText(content.body, PANEL_BODY_MAX_CHARS));
    panelFooter.setText(content.footer);
    setSchoolTag(panelSchool, content.school);
    placePixelText(panelTitle, 0, -PANEL_HEIGHT / 2 + 10, 0.5, 0);
    placePixelText(
      panelSchool,
      0,
      panelTitle.y + panelTitle.getTextBounds(true).local.height + SCHOOL_GAP,
      0.5,
      0,
    );
    placePixelText(panelBody, 0, 0, 0.5, 0.5);
    placePixelText(panelFooter, 0, PANEL_HEIGHT / 2 - 10, 0.5, 1);
  };

  const buildTile = (slot: StoreSlot, index: number): Phaser.GameObjects.Container => {
    const tile = getActiveLayout().tileSize;
    const size = tile * STORE_SLOT_SIZE;
    const x = (cellCenterX(slot.col) + cellCenterX(slot.col + 1)) / 2;
    const y = (cellCenterY(slot.row) + cellCenterY(slot.row + 1)) / 2;
    const enhance = slot.kind === "enhance";
    const frame = scene.add.graphics();
    frame.fillStyle(
      enhance ? STORE_ENHANCE_BORDER_COLOR : mazeColorForIndex(loadMazeColorSettings().colorIndex),
      1,
    );
    const edge = size / 2 - 1;
    for (let d = -edge; d < edge; d += TILE_DOT_PX * 2) {
      frame.fillRect(d, -edge, TILE_DOT_PX, 1);
      frame.fillRect(d, edge - 1, TILE_DOT_PX, 1);
      frame.fillRect(-edge, d, 1, TILE_DOT_PX);
      frame.fillRect(edge - 1, d, 1, TILE_DOT_PX);
    }
    const coinY = size / 2 - 3 - TILE_COIN_PX / 2;
    const coins = coinRowXs(slotPrice(slot), size - 6).map((cx) =>
      scene.add.image(cx, coinY, QUARTER_TEXTURE_KEY).setDisplaySize(TILE_COIN_PX, TILE_COIN_PX),
    );
    let glyph: Phaser.GameObjects.GameObject;
    if (slot.kind === "life") {
      glyph = scene.add
        .image(0, TILE_GLYPH_Y, PLAYER_OPEN_MOUTH_TEXTURE_KEY)
        .setDisplaySize(tile - 2, tile - 2);
    } else {
      const char =
        slot.kind === "swap" ? "?" : enhance ? "+" : slotTitle(slot).charAt(0).toUpperCase();
      const school = enhance ? null : slotSchool(slot);
      const glyphColor = school === null ? TEXT_COLOR_YELLOW : SCHOOL_COLORS[school];
      const text = addPixelText(scene, 0, 0, char, HUD_FONT_SIZE, glyphColor);
      const inkOffset = (glyphInkCenterOffsetX(char) * HUD_FONT_SIZE) / 8;
      placePixelText(text, inkOffset, TILE_GLYPH_Y, 0.5, 0.5);
      glyph = text;
    }
    const zone = scene.add.zone(0, 0, size, size).setInteractive();
    zone.on("pointerover", () => {
      hoveredSlot = index;
    });
    zone.on("pointerout", () => {
      if (hoveredSlot === index) {
        hoveredSlot = null;
      }
    });
    const glow = enhance
      ? scene.add.rectangle(0, 0, size + 4, size + 4, STORE_ENHANCE_BORDER_COLOR, 0.3)
      : null;
    glows[index] = glow;
    return scene.add
      .container(x, y, [...(glow === null ? [] : [glow]), frame, glyph, ...coins, zone])
      .setDepth(TILE_DEPTH);
  };

  const clearTiles = (): void => {
    for (const tile of tiles) {
      tile?.destroy(true);
    }
    tiles = [];
    glows = [];
    hoveredSlot = null;
  };

  return {
    open: (state) => {
      clearTiles();
      toast = null;
      tiles = state.slots.map(buildTile);
    },
    sync: (state, prompt, deltaMs) => {
      state.slots.forEach((slot, i) => {
        const tile = tiles[i];
        if (tile && slot.sold) {
          tile.destroy(true);
          tiles[i] = null;
          glows[i] = null;
          if (hoveredSlot === i) {
            hoveredSlot = null;
          }
        }
      });
      glowElapsedMs += deltaMs;
      for (const glow of glows) {
        glow?.setAlpha(enhanceGlowAlpha(glowElapsedMs));
      }
      if (toast !== null) {
        toast.remainingMs -= deltaMs;
        if (toast.remainingMs <= 0) {
          toast = null;
        }
      }
      const confirming = prompt?.kind === "confirm";
      showModal(confirming ? prompt : null, state.confirmYes);
      if (confirming) {
        showPanel(null);
      } else if (prompt !== null) {
        showPanel({
          title: slotTitle(prompt.slot),
          school: slotSchool(prompt.slot),
          body: slotBody(prompt.slot),
          footer: promptFooter(prompt),
        });
      } else if (toast !== null) {
        showPanel(toast.content);
      } else if (hoveredSlot !== null) {
        const slot = state.slots[hoveredSlot]!;
        showPanel({
          title: slotTitle(slot),
          school: slotSchool(slot),
          body: slotBody(slot),
          footer: `COST ${slotPrice(slot)}`,
        });
      } else {
        showPanel(null);
      }
    },
    showPurchased: (id) => {
      const def = getUpgradeDef(id);
      toast = {
        content: { title: def.label, school: def.school, body: def.description, footer: "GOT IT!" },
        remainingMs: TOAST_MS,
      };
    },
    destroy: () => {
      clearTiles();
      panel.destroy(true);
      dim.destroy();
      modal.destroy(true);
    },
  };
}
