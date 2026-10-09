import Phaser from "phaser";
import { freshSeed, parseSeedParam } from "../../domain/runRandom";
import { learnCheckboxLook, textStyleFor, type GhostStyle } from "../../domain/ghostArt";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { glyphInkCenterOffsetX, glyphInkCenterOffsetY } from "./font8x8Basic";
import {
  hoverPreviewX,
  splitSchoolColumns,
  type LearnColumn,
} from "../../domain/learnUpgradeColumns";
import type { GhostTarget } from "../../domain/ghostTarget";
import {
  GHOST_COLOR_BY_KIND,
  clampTileToBoard,
  clipSegmentToRect,
  easeToward,
  predictGhostPath,
  targetDerivation,
  type PixelPoint,
  type PixelRect,
} from "../../domain/learnOverlay";
import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  TILE_SIZE,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { GHOST_DRAWABLE_BY_KIND, PLAYFIELD_WIDTH } from "../../domain/playfield";
import {
  emptySeenRecord,
  learnSeenRecord,
  parseLearnAllMode,
  type SeenRecord,
} from "../../domain/seenRecord";
import { preloadSfx, startLoopingSfx } from "../audio/sfx";
import {
  baseIdOf,
  enhancedIdOf,
  getUpgradeDef,
  groupUpgradesBySchool,
  learnEnhanceToggleState,
  learnUpgradeDefs,
  ownedFormOf,
  UPGRADE_SCHOOL_LABELS,
  type BaseUpgradeId,
  type UpgradeDef,
  type UpgradeId,
} from "../../domain/upgrades";
import { loadGhostStyle } from "../storage/ghostStyleStorage";
import { loadSeenRecord } from "../storage/seenRecordStorage";
import { createHeldKeysReader } from "../systems/playerInput";
import type { HeldKeys } from "../systems/heldKeys";
import { LearnSim } from "../sim/learnSim";
import type { SimEvent } from "../sim/simEvents";
import { playTurnSparks } from "./turnSparks";
import { playStreakPop } from "./streakPop";
import { killPelletAbsorbs, playPelletAbsorb } from "./pelletAbsorb";
import { addGhostIcon, createRender, preloadPlayArt, type PlayRender } from "../systems/render";
import {
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";
import { addGameText, placeGameText, setGameTextBloom, type GameText } from "./neonFont";
import { wrapText } from "../../domain/wrapText";
import {
  buildUpgradeCardVisual,
  SCHOOL_COLORS,
  MODAL_DEPTH,
  type UpgradeCardVisual,
} from "./upgradeChoiceModal";
import { applyRenderScale } from "../renderScale";

const SLOT_KINDS: readonly GhostKindId[] = [
  GHOST_KIND.blinky,
  GHOST_KIND.pinky,
  GHOST_KIND.inky,
  GHOST_KIND.clyde,
];
const TITLE_Y = 30;
const SLOT_Y = 90;
const SLOT_SIZE = 48;
const SLOT_GAP = 16;
const SLOT_STROKE = 4;
const SLOT_STROKE_COLOR = 0x444444;
const SLOT_ICON_SIZE = 32;
const BACK_Y = 550;
const OVERLAY_DEPTH = 5;
const PATH_ALPHA = 0.6;
const PATH_WIDTH = 3;
const RETICLE_SIZE = 10;
const DERIVATION_COLOR = 0x888888;
const DERIVATION_ALPHA = 0.8;
const DERIVATION_WIDTH = 2;
const PIVOT_DOT_RADIUS = 3;
const CIRCLE_SEGMENTS = 48;
const UPGRADE_COLUMN_X = { left: 20, right: 596 } as const;
const UPGRADE_ROW_START_Y = 100;
const UPGRADE_ROW_GAP = 16;
const UPGRADE_HEADER_GAP = 20;
const UPGRADE_ROW_WIDTH = 190;
const UPGRADE_CHECK_SIZE = 10;
const UPGRADE_CHECK_GAP = 4;
const UPGRADE_PLUS_INSET = 6;
const UPGRADE_PLUS_ZONE_WIDTH = 14;
const UPGRADE_PLUS_BOX_SIZE = 10;
const UPGRADE_PLUS_ON_TINT = 0x101820;
const NO_EFFECT_BANNER_Y = SLOT_Y + SLOT_SIZE / 2 + 10;
const STATUS_GAP_Y = 10;
const POPUP_RISE_PX = 28;
const POPUP_MS = 1100;
const LEARN_NO_EFFECT_UPGRADE_IDS: readonly BaseUpgradeId[] = [
  "passiveMartyr",
  "passiveInterest",
  "powerPelletHyperspeed",
];
const HOVER_PREVIEW_DELAY_MS = 500;
const HOVER_PREVIEW_Y_MIN = 90;
const HOVER_PREVIEW_Y_MAX = 510;
type GhostSlot = { kind: GhostKindId; frame: Phaser.GameObjects.Graphics; x: number };
type UpgradeRow = {
  id: BaseUpgradeId;
  checkMark: Phaser.GameObjects.Shape;
  label: GameText;
  plus: GameText;
  plusBox: Phaser.GameObjects.Shape;
  plusZone: Phaser.GameObjects.Zone;
};

export class LearnScene extends Phaser.Scene {
  private sim!: LearnSim;
  private playRender!: PlayRender;
  private readHeldKeys!: () => HeldKeys;
  private overlay!: Phaser.GameObjects.Graphics;
  private seen: SeenRecord = emptySeenRecord();
  private reticlePx: PixelPoint | null = null;
  private slots: GhostSlot[] = [];
  private upgradeRows: UpgradeRow[] = [];
  private noEffectBanner!: GameText;
  private statusText!: GameText;
  private statusShown = "";
  private hoverPreviewTimer: ReturnType<typeof setTimeout> | null = null;
  private hoverPreviewCard: UpgradeCardVisual | null = null;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private slotKeys: Phaser.Input.Keyboard.Key[] = [];

  constructor() {
    super("LearnScene");
  }

  preload(): void {
    preloadPlayArt(this);
    preloadSfx(this);
  }

  create(): void {
    applyRenderScale(this);
    startLoopingSfx(this, "menuMusic");
    const urlParams = new URLSearchParams(location.search);
    this.sim = new LearnSim(parseSeedParam(urlParams) ?? freshSeed());
    const ghostStyle = loadGhostStyle();
    this.sim.setGhostStyle(ghostStyle);
    const learnAllMode = parseLearnAllMode(urlParams);
    this.seen = learnSeenRecord(learnAllMode, loadSeenRecord);
    this.reticlePx = null;
    this.statusShown = "";
    this.hoverPreviewTimer = null;
    this.hoverPreviewCard = null;

    this.playRender = createRender(this);
    this.overlay = this.add.graphics().setDepth(OVERLAY_DEPTH);
    this.applyEvents(this.sim.start());

    const title = addGameText(this, 0, 0, "LEARN", MENU_TITLE_FONT_SIZE);
    placeGameText(title, PLAYFIELD_WIDTH / 2, TITLE_Y, 0.5, 0.5);
    this.buildGhostSlots(ghostStyle);
    this.buildUpgradeRows(ghostStyle);
    this.buildBackButton();

    this.noEffectBanner = addGameText(this, 0, 0, "", UPGRADES_HUD_FONT_SIZE)
      .setDepth(OVERLAY_DEPTH + 1)
      .setCenterAlign()
      .setLineSpacing(10);
    this.refreshNoEffectBanner();
    this.statusText = addGameText(this, 0, 0, "", UPGRADES_HUD_FONT_SIZE)
      .setDepth(OVERLAY_DEPTH + 1)
      .setCenterAlign()
      .setLineSpacing(10);

    this.readHeldKeys = createHeldKeysReader(this);
    const keyboard = this.input.keyboard!;
    this.keyEsc = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.slotKeys = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
    ].map((code) => keyboard.addKey(code));

    this.selectGhost(SLOT_KINDS[0]!);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cancelUpgradePreview());
  }

  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.scene.start("MenuScene");
      return;
    }
    this.slotKeys.forEach((key, index) => {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        this.selectGhost(SLOT_KINDS[index]!);
      }
    });
    this.applyEvents(this.sim.step(this.readHeldKeys(), delta));
    this.drawOverlay(delta);
  }

  private applyEvents(events: readonly SimEvent[]): void {
    for (const event of events) {
      if (event.type === "releaseDrawable") {
        this.playRender.releaseDrawable(event.eid);
      } else if (event.type === "pelletAbsorb") {
        playPelletAbsorb(this, event, () => this.sim.playerWorldPosition());
      } else if (event.type === "resetBoard") {
        killPelletAbsorbs(this);
      } else if (event.type === "draw") {
        this.playRender.draw(this.sim.world, event.options);
      } else if (event.type === "bouncePowerPellet") {
        this.playRender.bouncePowerPellet(event.eid);
      } else if (event.type === "turnSparks") {
        playTurnSparks(this, event);
      } else if (event.type === "streakPop") {
        playStreakPop(this, event);
      } else if (event.type === "learnPopup") {
        this.showPopup(event);
      }
    }
    this.refreshStatus();
  }

  private selectGhost(kind: GhostKindId): void {
    this.applyEvents(this.sim.selectGhost(kind));
    this.reticlePx = null;
    this.refreshSlots();
  }

  private toggleUpgrade(id: UpgradeId): void {
    this.applyEvents(this.sim.toggleUpgrade(id));
    this.refreshUpgradeRows();
    this.refreshNoEffectBanner();
  }

  private toggleEnhanced(id: BaseUpgradeId): void {
    this.applyEvents(this.sim.toggleEnhanced(id));
    this.refreshUpgradeRows();
    this.refreshNoEffectBanner();
  }

  private buildGhostSlots(ghostStyle: GhostStyle): void {
    this.slots = [];
    const rowWidth = SLOT_KINDS.length * SLOT_SIZE + (SLOT_KINDS.length - 1) * SLOT_GAP;
    const firstX = PLAYFIELD_WIDTH / 2 - rowWidth / 2 + SLOT_SIZE / 2;
    SLOT_KINDS.forEach((kind, index) => {
      const x = firstX + index * (SLOT_SIZE + SLOT_GAP);
      const frame = this.add.graphics();
      addGhostIcon(this, GHOST_DRAWABLE_BY_KIND[kind], x, SLOT_Y, SLOT_ICON_SIZE, ghostStyle);
      const zone = this.add.zone(x, SLOT_Y, SLOT_SIZE, SLOT_SIZE);
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => this.selectGhost(kind));
      this.slots.push({ kind, frame, x });
    });
    this.refreshSlots();
  }

  private refreshSlots(): void {
    for (const slot of this.slots) {
      const selected = slot.kind === this.sim.selectedKind;
      slot.frame.clear();
      slot.frame.lineStyle(SLOT_STROKE, selected ? TEXT_COLOR_YELLOW : SLOT_STROKE_COLOR, 1);
      slot.frame.strokeRoundedRect(
        slot.x - SLOT_SIZE / 2,
        SLOT_Y - SLOT_SIZE / 2,
        SLOT_SIZE,
        SLOT_SIZE,
        8,
      );
    }
  }

  private buildUpgradeRows(ghostStyle: GhostStyle): void {
    this.upgradeRows = [];
    const columns = splitSchoolColumns(groupUpgradesBySchool(learnUpgradeDefs(this.seen.upgrades)));
    for (const column of ["left", "right"] as const) {
      let y = UPGRADE_ROW_START_Y - UPGRADE_ROW_GAP;
      for (const { school, defs } of columns[column]) {
        y += UPGRADE_HEADER_GAP;
        const header = addGameText(
          this,
          0,
          0,
          UPGRADE_SCHOOL_LABELS[school].toUpperCase(),
          UPGRADES_HUD_FONT_SIZE,
          SCHOOL_COLORS[school],
        );
        setGameTextBloom(header, false);
        placeGameText(header, UPGRADE_COLUMN_X[column], y, 0, 0.5);
        for (const def of defs) {
          y += UPGRADE_ROW_GAP;
          this.buildUpgradeRow(def, column, y, ghostStyle);
        }
      }
    }
  }

  private buildUpgradeRow(
    def: UpgradeDef,
    column: LearnColumn,
    y: number,
    ghostStyle: GhostStyle,
  ): void {
    const columnX = UPGRADE_COLUMN_X[column];
    const plusX = columnX + UPGRADE_ROW_WIDTH - UPGRADE_PLUS_INSET;
    const checkboxX = columnX + UPGRADE_CHECK_SIZE / 2;
    const labelX = checkboxX + UPGRADE_CHECK_SIZE / 2 + UPGRADE_CHECK_GAP;
    const look = learnCheckboxLook(ghostStyle);
    const checkRadius = UPGRADE_CHECK_SIZE / 2;
    if (look.shape === "circle") {
      this.add
        .circle(checkboxX, y, checkRadius, 0x000000, 0)
        .setStrokeStyle(look.strokeWidth, TEXT_COLOR_WHITE);
    } else {
      this.add
        .rectangle(checkboxX, y, UPGRADE_CHECK_SIZE, UPGRADE_CHECK_SIZE)
        .setStrokeStyle(look.strokeWidth, TEXT_COLOR_WHITE);
    }
    const checkMark =
      look.shape === "circle"
        ? this.add.circle(checkboxX, y, checkRadius - 2, TEXT_COLOR_YELLOW).setVisible(false)
        : this.add
            .rectangle(
              checkboxX,
              y,
              UPGRADE_CHECK_SIZE - 4,
              UPGRADE_CHECK_SIZE - 4,
              TEXT_COLOR_YELLOW,
            )
            .setVisible(false);
    const label = addGameText(this, 0, 0, def.label, UPGRADES_HUD_FONT_SIZE);
    setGameTextBloom(label, false);
    placeGameText(label, labelX, y, 0, 0.5);
    const plusRadius = UPGRADE_PLUS_BOX_SIZE / 2;
    const plusBox =
      look.shape === "circle"
        ? this.add
            .circle(plusX, y, plusRadius, 0x000000, 0)
            .setStrokeStyle(look.strokeWidth, TEXT_COLOR_YELLOW)
            .setVisible(false)
        : this.add
            .rectangle(plusX, y, UPGRADE_PLUS_BOX_SIZE, UPGRADE_PLUS_BOX_SIZE)
            .setStrokeStyle(look.strokeWidth, TEXT_COLOR_YELLOW)
            .setVisible(false);
    const plus = addGameText(this, 0, 0, "+", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_YELLOW);
    setGameTextBloom(plus, false);
    const pixelInk = textStyleFor(ghostStyle) === "pixel";
    placeGameText(
      plus,
      plusX + (pixelInk ? (glyphInkCenterOffsetX("+") * UPGRADES_HUD_FONT_SIZE) / 8 : 0),
      y + (pixelInk ? (glyphInkCenterOffsetY("+") * UPGRADES_HUD_FONT_SIZE) / 8 : 0),
      0.5,
      0.5,
    );
    plus.setVisible(false);
    const rowHitH = UPGRADE_ROW_GAP - 2;
    const checkZoneW = UPGRADE_CHECK_SIZE + UPGRADE_CHECK_GAP;
    const checkZone = this.add.zone(columnX + checkZoneW / 2, y, checkZoneW, rowHitH);
    checkZone.setInteractive({ useHandCursor: true });
    checkZone.on("pointerdown", () => this.toggleUpgrade(def.id));
    const labelZoneLeft = columnX + checkZoneW;
    const labelZoneRight = plusX - UPGRADE_PLUS_ZONE_WIDTH / 2;
    const labelZoneW = Math.max(1, labelZoneRight - labelZoneLeft);
    const labelZone = this.add.zone(labelZoneLeft + labelZoneW / 2, y, labelZoneW, rowHitH);
    labelZone.setInteractive({ useHandCursor: true });
    labelZone.on("pointerdown", () => this.toggleUpgrade(def.id));
    labelZone.on("pointerover", (pointer: Phaser.Input.Pointer) =>
      this.scheduleUpgradePreview(def.id, column, pointer.worldY),
    );
    labelZone.on("pointerout", () => this.cancelUpgradePreview());
    const plusZone = this.add.zone(plusX, y, UPGRADE_PLUS_ZONE_WIDTH, rowHitH);
    plusZone.on("pointerdown", () => this.toggleEnhanced(def.baseId));
    plusZone.on("pointerover", () => this.cancelUpgradePreview());
    this.upgradeRows.push({ id: def.baseId, checkMark, label, plus, plusBox, plusZone });
  }

  private refreshUpgradeRows(): void {
    for (const row of this.upgradeRows) {
      const state = learnEnhanceToggleState(this.sim.ownedUpgrades, row.id);
      row.checkMark.setVisible(state !== "hidden");
      row.plus.setVisible(state !== "hidden");
      row.plusBox.setVisible(state !== "hidden");
      row.plusBox.setFillStyle(TEXT_COLOR_YELLOW, state === "on" ? 1 : 0);
      row.plus.setTint(state === "on" ? UPGRADE_PLUS_ON_TINT : TEXT_COLOR_YELLOW);
      row.label.setText(getUpgradeDef(state === "on" ? enhancedIdOf(row.id) : row.id).label);
      if (state === "hidden") {
        row.plusZone.disableInteractive();
      } else {
        row.plusZone.setInteractive({ useHandCursor: true });
      }
    }
  }

  private refreshStatus(): void {
    const text = this.sim.statusText();
    if (text === this.statusShown) {
      return;
    }
    this.statusShown = text;
    const layout = getActiveLayout();
    this.statusText.setText(text);
    placeGameText(
      this.statusText,
      layout.offsetX + layout.pixelWidth / 2,
      layout.offsetY + layout.pixelHeight + STATUS_GAP_Y,
      0.5,
      0,
    );
  }

  private showPopup(event: { text: string; x: number; y: number }): void {
    const popup = addGameText(this, 0, 0, event.text, UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_YELLOW)
      .setDepth(OVERLAY_DEPTH + 2)
      .setCenterAlign();
    placeGameText(popup, event.x, event.y, 0.5, 1);
    this.tweens.add({
      targets: popup,
      y: popup.y - POPUP_RISE_PX,
      alpha: 0,
      duration: POPUP_MS,
      onComplete: () => popup.destroy(),
    });
  }

  private refreshNoEffectBanner(): void {
    const selectedLabels = LEARN_NO_EFFECT_UPGRADE_IDS.flatMap((id) => {
      const form = ownedFormOf(this.sim.ownedUpgrades, id);
      return form === null ? [] : [getUpgradeDef(form).label];
    });
    const layout = getActiveLayout();
    if (selectedLabels.length === 0) {
      this.noEffectBanner.setText("");
    } else {
      const maxCharsPerLine = Math.floor(layout.pixelWidth / UPGRADES_HUD_FONT_SIZE);
      const namesLine = wrapText(selectedLabels.join(", "), maxCharsPerLine);
      this.noEffectBanner.setText(`${namesLine}\nNO VISIBLE EFFECT HERE`);
    }
    placeGameText(
      this.noEffectBanner,
      layout.offsetX + layout.pixelWidth / 2,
      NO_EFFECT_BANNER_Y,
      0.5,
      0,
    );
  }

  private scheduleUpgradePreview(id: UpgradeId, column: LearnColumn, pointerY: number): void {
    this.cancelUpgradePreview();
    this.hoverPreviewTimer = setTimeout(() => {
      this.hoverPreviewTimer = null;
      this.showUpgradePreview(id, column, pointerY);
    }, HOVER_PREVIEW_DELAY_MS);
  }

  private showUpgradePreview(id: UpgradeId, column: LearnColumn, pointerY: number): void {
    const def = getUpgradeDef(ownedFormOf(this.sim.ownedUpgrades, baseIdOf(id)) ?? id);
    const y = Math.min(HOVER_PREVIEW_Y_MAX, Math.max(HOVER_PREVIEW_Y_MIN, pointerY));
    const visual = buildUpgradeCardVisual(this, hoverPreviewX(column), y, {
      label: def.label,
      description: def.description,
      school: def.school,
      rare: def.rare === true,
    });
    visual.root.setDepth(MODAL_DEPTH + 1);
    this.hoverPreviewCard = visual;
  }

  private cancelUpgradePreview(): void {
    if (this.hoverPreviewTimer !== null) {
      clearTimeout(this.hoverPreviewTimer);
      this.hoverPreviewTimer = null;
    }
    this.hoverPreviewCard?.root.destroy(true);
    this.hoverPreviewCard = null;
  }

  private buildBackButton(): void {
    const back = addGameText(this, 0, 0, "BACK", MENU_OPTION_FONT_SIZE);
    placeGameText(back, PLAYFIELD_WIDTH / 2, BACK_Y, 0.5, 0.5);
    back.setInteractive({ useHandCursor: true });
    back.on("pointerover", () => back.setTint(TEXT_COLOR_YELLOW));
    back.on("pointerout", () => back.setTint(TEXT_COLOR_WHITE));
    back.on("pointerdown", () => this.scene.start("MenuScene"));
  }

  private drawOverlay(deltaMs: number): void {
    this.overlay.clear();
    const model = this.sim.overlayModel();
    if (model === null) {
      return;
    }
    const { kind, target, ghostPx } = model;

    const layout = getActiveLayout();
    this.reticlePx = easeToward(
      this.reticlePx,
      { x: cellCenterX(target.col), y: cellCenterY(target.row) },
      deltaMs,
    );
    const reticle = {
      x: Math.min(cellCenterX(layout.cols - 1), Math.max(cellCenterX(0), this.reticlePx.x)),
      y: Math.min(cellCenterY(layout.rows - 1), Math.max(cellCenterY(0), this.reticlePx.y)),
    };
    const color = GHOST_COLOR_BY_KIND[kind];
    const rect: PixelRect = {
      left: layout.offsetX,
      top: layout.offsetY,
      right: layout.offsetX + layout.pixelWidth,
      bottom: layout.offsetY + layout.pixelHeight,
    };

    const playerPx = model.playerPx ?? {
      x: cellCenterX(model.playerTile.col),
      y: cellCenterY(model.playerTile.row),
    };
    const nearPlayer = (tile: GhostTarget): PixelPoint => ({
      x: playerPx.x + (tile.col - model.playerTile.col) * TILE_SIZE,
      y: playerPx.y + (tile.row - model.playerTile.row) * TILE_SIZE,
    });

    const derivation = targetDerivation(kind, {
      player: { col: model.playerTile.col, row: model.playerTile.row },
      playerFacing: model.playerTile.facing,
      blinky: model.blinkyTile,
      target,
    });
    this.overlay.lineStyle(DERIVATION_WIDTH, DERIVATION_COLOR, DERIVATION_ALPHA);
    if (derivation.kind === "segment") {
      this.strokePixelsClipped([playerPx, this.reticlePx], rect);
    } else if (derivation.kind === "inky") {
      const blinkyPx = model.blinkyPx ?? {
        x: cellCenterX(derivation.blinky.col),
        y: cellCenterY(derivation.blinky.row),
      };
      const pivotPx = nearPlayer(derivation.pivot);
      this.strokePixelsClipped([blinkyPx, pivotPx, this.reticlePx], rect);
      this.overlay.fillStyle(DERIVATION_COLOR, DERIVATION_ALPHA);
      this.overlay.fillCircle(pivotPx.x, pivotPx.y, PIVOT_DOT_RADIUS);
    } else if (derivation.kind === "circle") {
      const radius = derivation.radiusTiles * TILE_SIZE;
      const points = Array.from({ length: CIRCLE_SEGMENTS + 1 }, (_, i) => {
        const angle = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
        return {
          x: playerPx.x + Math.cos(angle) * radius,
          y: playerPx.y + Math.sin(angle) * radius,
        };
      });
      this.strokePixelsClipped(points, rect);
    }

    const pathTarget = clampTileToBoard(target, layout.cols, layout.rows);
    const path = predictGhostPath({
      start: { col: worldToCol(ghostPx.x), row: worldToRow(ghostPx.y) },
      facing: model.ghostFacing,
      target: pathTarget,
    });
    const pathPx = path.map((tile) => ({ x: cellCenterX(tile.col), y: cellCenterY(tile.row) }));
    const last = path.at(-1);
    if (last !== undefined && last.col === pathTarget.col && last.row === pathTarget.row) {
      pathPx[pathPx.length - 1] = reticle;
    }
    this.overlay.lineStyle(PATH_WIDTH, color, PATH_ALPHA);
    this.strokePixelsClipped([ghostPx, ...pathPx], rect);
    this.overlay.fillStyle(color, 1);
    this.overlay.fillRect(
      reticle.x - RETICLE_SIZE / 2,
      reticle.y - RETICLE_SIZE / 2,
      RETICLE_SIZE,
      RETICLE_SIZE,
    );
  }

  private strokePixelsClipped(points: readonly { x: number; y: number }[], rect: PixelRect): void {
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1]!;
      const b = points[i]!;
      const seg = clipSegmentToRect({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, rect);
      if (seg !== null) {
        this.overlay.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
      }
    }
  }
}
