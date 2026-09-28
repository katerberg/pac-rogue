import Phaser from "phaser";
import { cellCenterX, cellCenterY, getActiveLayout } from "../../domain/maze";
import { mazeColorForIndex } from "../../domain/mazeColorSettings";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import {
  STORE_SLOT_SIZE,
  slotPrice,
  type StorePromptView,
  type StoreSlot,
  type StoreState,
} from "../../domain/store";
import { getUpgradeDef, type UpgradeId } from "../../domain/upgrades";
import { loadMazeColorSettings } from "../storage/mazeColorStorage";
import { PLAYER_OPEN_MOUTH_TEXTURE_KEY } from "../systems/render";
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
  wrapText,
} from "./upgradeChoiceModal";

const TILE_DEPTH = -1;
const PANEL_DEPTH = 20;
const PANEL_WIDTH = 168;
const PANEL_HEIGHT = 190;
const PANEL_TITLE_MAX_CHARS = 10;
const PANEL_BODY_MAX_CHARS = 18;
const TOAST_MS = 2000;
const TILE_DOT_PX = 2;

export type StoreOverlay = {
  open: (state: StoreState) => void;
  sync: (state: StoreState, prompt: StorePromptView | null, deltaMs: number) => void;
  showPurchased: (id: UpgradeId) => void;
  destroy: () => void;
};

type PanelContent = { title: string; body: string; footer: string };

function slotTitle(slot: StoreSlot): string {
  switch (slot.kind) {
    case "life":
      return "EXTRA LIFE";
    case "swap":
      return "SWAP";
    case "upgrade":
      return getUpgradeDef(slot.id).label;
  }
}

function slotBody(slot: StoreSlot): string {
  switch (slot.kind) {
    case "life":
      return "+1 life. Buy as many as you like.";
    case "swap":
      return `Lose ${getUpgradeDef(slot.outgoingId).label}. Gain ?`;
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
  }
}

export function createStoreOverlay(scene: Phaser.Scene): StoreOverlay {
  let tiles: (Phaser.GameObjects.Container | null)[] = [];
  let hoveredSlot: number | null = null;
  let toast: { content: PanelContent; remainingMs: number } | null = null;

  const panelX = (PLAYFIELD_WIDTH + getActiveLayout().offsetX + getActiveLayout().pixelWidth) / 2;
  const panelY = cellCenterY(Math.floor(getActiveLayout().rows / 2));
  const panelBg = scene.add
    .rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x101820)
    .setStrokeStyle(2, TEXT_COLOR_YELLOW);
  const panelTitle = addPixelText(scene, 0, 0, "", HUD_FONT_SIZE, TEXT_COLOR_YELLOW);
  const panelBody = addPixelText(scene, 0, 0, "", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_WHITE);
  const panelFooter = addPixelText(scene, 0, 0, "", HUD_FONT_SIZE, TEXT_COLOR_YELLOW);
  const panel = scene.add
    .container(panelX, panelY, [panelBg, panelTitle, panelBody, panelFooter])
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
  const modal = scene.add
    .container(PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2, [
      modalBg,
      modalTitle,
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
    modalTitle.setText(wrapText(slotTitle(prompt.slot), LABEL_MAX_CHARS));
    modalBody.setText(wrapText(slotBody(prompt.slot), DESCRIPTION_MAX_CHARS));
    modalCost.setText(`COST ${prompt.price}`);
    placePixelText(modalTitle, 0, -58, 0.5, 0.5);
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
    panelTitle.setText(wrapText(content.title, PANEL_TITLE_MAX_CHARS));
    panelBody.setText(wrapText(content.body, PANEL_BODY_MAX_CHARS));
    panelFooter.setText(content.footer);
    placePixelText(panelTitle, 0, -PANEL_HEIGHT / 2 + 10, 0.5, 0);
    placePixelText(panelBody, 0, 0, 0.5, 0.5);
    placePixelText(panelFooter, 0, PANEL_HEIGHT / 2 - 10, 0.5, 1);
  };

  const buildTile = (slot: StoreSlot, index: number): Phaser.GameObjects.Container => {
    const tile = getActiveLayout().tileSize;
    const size = tile * STORE_SLOT_SIZE;
    const x = (cellCenterX(slot.col) + cellCenterX(slot.col + 1)) / 2;
    const y = (cellCenterY(slot.row) + cellCenterY(slot.row + 1)) / 2;
    const frame = scene.add.graphics();
    frame.fillStyle(mazeColorForIndex(loadMazeColorSettings().colorIndex), 1);
    const edge = size / 2 - 1;
    for (let d = -edge; d < edge; d += TILE_DOT_PX * 2) {
      frame.fillRect(d, -edge, TILE_DOT_PX, 1);
      frame.fillRect(d, edge - 1, TILE_DOT_PX, 1);
      frame.fillRect(-edge, d, 1, TILE_DOT_PX);
      frame.fillRect(edge - 1, d, 1, TILE_DOT_PX);
    }
    const price = addPixelText(scene, 0, 0, String(slotPrice(slot)), UPGRADES_HUD_FONT_SIZE);
    placePixelText(price, 0, size / 2 - 3, 0.5, 1);
    const glyph: Phaser.GameObjects.GameObject =
      slot.kind === "life"
        ? scene.add.image(0, -4, PLAYER_OPEN_MOUTH_TEXTURE_KEY).setDisplaySize(tile - 2, tile - 2)
        : addPixelText(
            scene,
            0,
            0,
            slot.kind === "swap" ? "?" : slotTitle(slot).charAt(0).toUpperCase(),
            HUD_FONT_SIZE,
            TEXT_COLOR_YELLOW,
          );
    if (glyph instanceof Phaser.GameObjects.BitmapText) {
      placePixelText(glyph, 0, -4, 0.5, 0.5);
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
    return scene.add.container(x, y, [frame, glyph, price, zone]).setDepth(TILE_DEPTH);
  };

  const clearTiles = (): void => {
    for (const tile of tiles) {
      tile?.destroy(true);
    }
    tiles = [];
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
          if (hoveredSlot === i) {
            hoveredSlot = null;
          }
        }
      });
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
          body: slotBody(prompt.slot),
          footer: promptFooter(prompt),
        });
      } else if (toast !== null) {
        showPanel(toast.content);
      } else if (hoveredSlot !== null) {
        const slot = state.slots[hoveredSlot]!;
        showPanel({
          title: slotTitle(slot),
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
        content: { title: def.label, body: def.description, footer: "GOT IT!" },
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
