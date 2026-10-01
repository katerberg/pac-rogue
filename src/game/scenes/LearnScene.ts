import Phaser from "phaser";
import { freshSeed, parseSeedParam } from "../../domain/runRandom";
import {
  CORRUPTION_DEFS,
  OUTLINE_TINT_BY_CORRUPTION,
  type CorruptionId,
} from "../../domain/corruption";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
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
  allSeenRecord,
  emptySeenRecord,
  parseLearnAllMode,
  type SeenRecord,
} from "../../domain/seenRecord";
import { preloadSfx, startLoopingSfx } from "../audio/sfx";
import {
  getUpgradeDef,
  groupUpgradesBySchool,
  UPGRADE_DEFS,
  UPGRADE_SCHOOL_LABELS,
  type UpgradeDef,
  type UpgradeId,
} from "../../domain/upgrades";
import { loadSeenRecord } from "../storage/seenRecordStorage";
import { createHeldKeysReader } from "../systems/playerInput";
import type { HeldKeys } from "../systems/heldKeys";
import { LearnSim } from "../sim/learnSim";
import type { SimEvent } from "../sim/simEvents";
import {
  createRender,
  GHOST_TEXTURE_BY_ID,
  preloadPlayArt,
  type PlayRender,
} from "../systems/render";
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
  buildUpgradeCardVisual,
  SCHOOL_COLORS,
  MODAL_DEPTH,
  wrapText,
  type UpgradeCardVisual,
} from "./upgradeChoiceModal";

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
const UNSEEN_ALPHA = 0.35;
const CORRUPTION_COLUMN_X = 596;
const CORRUPTION_ROW_START_Y = 170;
const CORRUPTION_ROW_GAP = 40;
const CORRUPTION_ROW_WIDTH = 185;
const CORRUPTION_SWATCH_SIZE = 12;
const CORRUPTION_CHECK_SIZE = 12;
const CORRUPTION_CHECK_GAP = 4;
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
const UPGRADE_COLUMN_X = 20;
const UPGRADE_ROW_START_Y = 100;
const UPGRADE_ROW_GAP = 13;
const UPGRADE_HEADER_GAP = 17;
const UPGRADE_ROW_WIDTH = 190;
const UPGRADE_CHECK_SIZE = 10;
const UPGRADE_CHECK_GAP = 4;
const NO_EFFECT_BANNER_Y = SLOT_Y + SLOT_SIZE / 2 + 10;
const HOVER_PREVIEW_DELAY_MS = 500;
const HOVER_PREVIEW_X = 110;
const HOVER_PREVIEW_Y_MIN = 90;
const HOVER_PREVIEW_Y_MAX = 510;
const LEARN_NO_EFFECT_UPGRADE_IDS: readonly UpgradeId[] = [
  "passiveGhostHouseDelay",
  "passiveExtraLife",
  "fruitQuarterBounty",
  "fruitFecundity",
  "fruitFeast",
  "passiveDeathsHarvest",
  "passivePowerPelletRecharge",
  "passiveMyogenesis",
  "passiveDefyDeath",
  "passiveTurnTuning",
];

type GhostSlot = { kind: GhostKindId; frame: Phaser.GameObjects.Graphics; x: number };
type CorruptionRow = { id: CorruptionId; checkMark: Phaser.GameObjects.Rectangle };
type UpgradeRow = { id: UpgradeId; checkMark: Phaser.GameObjects.Rectangle };

export class LearnScene extends Phaser.Scene {
  private sim!: LearnSim;
  private playRender!: PlayRender;
  private readHeldKeys!: () => HeldKeys;
  private overlay!: Phaser.GameObjects.Graphics;
  private seen: SeenRecord = emptySeenRecord();
  private reticlePx: PixelPoint | null = null;
  private slots: GhostSlot[] = [];
  private corruptionRows: CorruptionRow[] = [];
  private upgradeRows: UpgradeRow[] = [];
  private noEffectBanner!: Phaser.GameObjects.BitmapText;
  private hoverPreviewTimer: Phaser.Time.TimerEvent | null = null;
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
    startLoopingSfx(this, "menuMusic");
    const urlParams = new URLSearchParams(location.search);
    this.sim = new LearnSim(parseSeedParam(urlParams) ?? freshSeed());
    const learnAllMode = parseLearnAllMode(urlParams);
    this.seen =
      learnAllMode === "all"
        ? allSeenRecord()
        : learnAllMode === "none"
          ? emptySeenRecord()
          : loadSeenRecord();
    this.reticlePx = null;
    this.hoverPreviewTimer = null;
    this.hoverPreviewCard = null;

    this.playRender = createRender(this);
    this.overlay = this.add.graphics().setDepth(OVERLAY_DEPTH);
    this.applyEvents(this.sim.start());

    const title = addPixelText(this, 0, 0, "LEARN", MENU_TITLE_FONT_SIZE);
    placePixelText(title, PLAYFIELD_WIDTH / 2, TITLE_Y, 0.5, 0.5);
    this.buildGhostSlots();
    this.buildCorruptionRows();
    this.buildUpgradeRows();
    this.buildBackButton();

    this.noEffectBanner = addPixelText(this, 0, 0, "", UPGRADES_HUD_FONT_SIZE)
      .setDepth(OVERLAY_DEPTH + 1)
      .setCenterAlign()
      .setLineSpacing(10);
    this.refreshNoEffectBanner();

    this.readHeldKeys = createHeldKeysReader(this);
    const keyboard = this.input.keyboard!;
    this.keyEsc = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.slotKeys = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
    ].map((code) => keyboard.addKey(code));

    const firstSeen = SLOT_KINDS.find((kind) => this.seen.ghosts.includes(kind));
    if (firstSeen === undefined) {
      const layout = getActiveLayout();
      const message = addPixelText(this, 0, 0, "PLAY TO MEET GHOSTS", HUD_FONT_SIZE).setDepth(
        OVERLAY_DEPTH + 1,
      );
      placePixelText(
        message,
        layout.offsetX + layout.pixelWidth / 2,
        layout.offsetY + layout.pixelHeight / 2,
        0.5,
        0.5,
      );
    } else {
      this.selectGhost(firstSeen);
    }
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
      } else if (event.type === "draw") {
        this.playRender.draw(this.sim.world, event.options);
      } else if (event.type === "bouncePowerPellet") {
        this.playRender.bouncePowerPellet(event.eid);
      }
    }
  }

  private selectGhost(kind: GhostKindId): void {
    if (!this.seen.ghosts.includes(kind)) {
      return;
    }
    this.applyEvents(this.sim.selectGhost(kind));
    this.reticlePx = null;
    this.refreshSlots();
    this.refreshCorruptionRows();
  }

  private toggleCorruption(id: CorruptionId): void {
    this.applyEvents(this.sim.toggleCorruption(id));
    this.refreshCorruptionRows();
  }

  private toggleUpgrade(id: UpgradeId): void {
    this.applyEvents(this.sim.toggleUpgrade(id));
    this.refreshUpgradeRows();
    this.refreshNoEffectBanner();
  }

  private buildGhostSlots(): void {
    this.slots = [];
    const rowWidth = SLOT_KINDS.length * SLOT_SIZE + (SLOT_KINDS.length - 1) * SLOT_GAP;
    const firstX = PLAYFIELD_WIDTH / 2 - rowWidth / 2 + SLOT_SIZE / 2;
    SLOT_KINDS.forEach((kind, index) => {
      const x = firstX + index * (SLOT_SIZE + SLOT_GAP);
      const frame = this.add.graphics();
      const texture = GHOST_TEXTURE_BY_ID[GHOST_DRAWABLE_BY_KIND[kind]]!;
      const icon = this.add
        .image(x, SLOT_Y, texture)
        .setDisplaySize(SLOT_ICON_SIZE, SLOT_ICON_SIZE);
      if (this.seen.ghosts.includes(kind)) {
        const zone = this.add.zone(x, SLOT_Y, SLOT_SIZE, SLOT_SIZE);
        zone.setInteractive({ useHandCursor: true });
        zone.on("pointerdown", () => this.selectGhost(kind));
      } else {
        icon.setTint(0x000000).setAlpha(UNSEEN_ALPHA);
      }
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

  private buildCorruptionRows(): void {
    this.corruptionRows = [];
    const defs = CORRUPTION_DEFS.filter((def) => this.seen.corruptions.includes(def.id));
    const checkboxX =
      CORRUPTION_COLUMN_X +
      CORRUPTION_SWATCH_SIZE +
      CORRUPTION_CHECK_GAP +
      CORRUPTION_CHECK_SIZE / 2;
    const labelX = checkboxX + CORRUPTION_CHECK_SIZE / 2 + CORRUPTION_CHECK_GAP;
    defs.forEach((def, index) => {
      const y = CORRUPTION_ROW_START_Y + index * CORRUPTION_ROW_GAP;
      this.add.rectangle(
        CORRUPTION_COLUMN_X + CORRUPTION_SWATCH_SIZE / 2,
        y,
        CORRUPTION_SWATCH_SIZE,
        CORRUPTION_SWATCH_SIZE,
        OUTLINE_TINT_BY_CORRUPTION[def.id],
      );
      this.add
        .rectangle(checkboxX, y, CORRUPTION_CHECK_SIZE, CORRUPTION_CHECK_SIZE)
        .setStrokeStyle(2, TEXT_COLOR_WHITE);
      const checkMark = this.add
        .rectangle(
          checkboxX,
          y,
          CORRUPTION_CHECK_SIZE - 6,
          CORRUPTION_CHECK_SIZE - 6,
          TEXT_COLOR_YELLOW,
        )
        .setVisible(false);
      const label = addPixelText(this, 0, 0, def.label, UPGRADES_HUD_FONT_SIZE);
      placePixelText(label, labelX, y, 0, 0.5);
      const zone = this.add.zone(
        CORRUPTION_COLUMN_X + CORRUPTION_ROW_WIDTH / 2,
        y,
        CORRUPTION_ROW_WIDTH,
        CORRUPTION_ROW_GAP - 8,
      );
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => this.toggleCorruption(def.id));
      this.corruptionRows.push({ id: def.id, checkMark });
    });
  }

  private refreshCorruptionRows(): void {
    for (const row of this.corruptionRows) {
      row.checkMark.setVisible(row.id === this.sim.corruption.type);
    }
  }

  private buildUpgradeRows(): void {
    this.upgradeRows = [];
    const groups = groupUpgradesBySchool(
      UPGRADE_DEFS.filter((def) => this.seen.upgrades.includes(def.id)),
    );
    const checkboxX = UPGRADE_COLUMN_X + UPGRADE_CHECK_SIZE / 2;
    const labelX = checkboxX + UPGRADE_CHECK_SIZE / 2 + UPGRADE_CHECK_GAP;
    let y = UPGRADE_ROW_START_Y - UPGRADE_ROW_GAP;
    for (const { school, defs } of groups) {
      y += UPGRADE_HEADER_GAP;
      const header = addPixelText(
        this,
        0,
        0,
        UPGRADE_SCHOOL_LABELS[school].toUpperCase(),
        UPGRADES_HUD_FONT_SIZE,
        SCHOOL_COLORS[school],
      );
      placePixelText(header, UPGRADE_COLUMN_X, y, 0, 0.5);
      for (const def of defs) {
        y += UPGRADE_ROW_GAP;
        this.buildUpgradeRow(def, y, checkboxX, labelX);
      }
    }
  }

  private buildUpgradeRow(def: UpgradeDef, y: number, checkboxX: number, labelX: number): void {
    this.add
      .rectangle(checkboxX, y, UPGRADE_CHECK_SIZE, UPGRADE_CHECK_SIZE)
      .setStrokeStyle(2, TEXT_COLOR_WHITE);
    const checkMark = this.add
      .rectangle(checkboxX, y, UPGRADE_CHECK_SIZE - 4, UPGRADE_CHECK_SIZE - 4, TEXT_COLOR_YELLOW)
      .setVisible(false);
    const label = addPixelText(this, 0, 0, def.label, UPGRADES_HUD_FONT_SIZE);
    placePixelText(label, labelX, y, 0, 0.5);
    const zone = this.add.zone(
      UPGRADE_COLUMN_X + UPGRADE_ROW_WIDTH / 2,
      y,
      UPGRADE_ROW_WIDTH,
      UPGRADE_ROW_GAP - 2,
    );
    zone.setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => this.toggleUpgrade(def.id));
    zone.on("pointerover", (pointer: Phaser.Input.Pointer) =>
      this.scheduleUpgradePreview(def.id, pointer.y),
    );
    zone.on("pointerout", () => this.cancelUpgradePreview());
    this.upgradeRows.push({ id: def.id, checkMark });
  }

  private refreshUpgradeRows(): void {
    for (const row of this.upgradeRows) {
      row.checkMark.setVisible(this.sim.ownedUpgrades.includes(row.id));
    }
  }

  private refreshNoEffectBanner(): void {
    const selectedLabels = LEARN_NO_EFFECT_UPGRADE_IDS.filter((id) =>
      this.sim.ownedUpgrades.includes(id),
    ).map((id) => getUpgradeDef(id).label);
    const layout = getActiveLayout();
    if (selectedLabels.length === 0) {
      this.noEffectBanner.setText("");
    } else {
      const maxCharsPerLine = Math.floor(layout.pixelWidth / UPGRADES_HUD_FONT_SIZE);
      const namesLine = wrapText(selectedLabels.join(", "), maxCharsPerLine);
      this.noEffectBanner.setText(`${namesLine}\nNO VISIBLE EFFECT HERE`);
    }
    placePixelText(
      this.noEffectBanner,
      layout.offsetX + layout.pixelWidth / 2,
      NO_EFFECT_BANNER_Y,
      0.5,
      0,
    );
  }

  private scheduleUpgradePreview(id: UpgradeId, pointerY: number): void {
    this.cancelUpgradePreview();
    this.hoverPreviewTimer = this.time.delayedCall(HOVER_PREVIEW_DELAY_MS, () => {
      this.hoverPreviewTimer = null;
      this.showUpgradePreview(id, pointerY);
    });
  }

  private showUpgradePreview(id: UpgradeId, pointerY: number): void {
    const def = getUpgradeDef(id);
    const y = Math.min(HOVER_PREVIEW_Y_MAX, Math.max(HOVER_PREVIEW_Y_MIN, pointerY));
    const visual = buildUpgradeCardVisual(this, HOVER_PREVIEW_X, y, {
      label: def.label,
      description: def.description,
      school: def.school,
    });
    visual.root.setDepth(MODAL_DEPTH + 1);
    this.hoverPreviewCard = visual;
  }

  private cancelUpgradePreview(): void {
    this.hoverPreviewTimer?.remove();
    this.hoverPreviewTimer = null;
    this.hoverPreviewCard?.root.destroy(true);
    this.hoverPreviewCard = null;
  }

  private buildBackButton(): void {
    const back = addPixelText(this, 0, 0, "BACK", MENU_OPTION_FONT_SIZE);
    placePixelText(back, PLAYFIELD_WIDTH / 2, BACK_Y, 0.5, 0.5);
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
