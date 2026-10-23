import Phaser from "phaser";
import { parseQueryParams } from "../../domain/queryParams";
import { freshSeed, parseSeedParam } from "../../domain/runRandom";
import { GHOST_KIND, ghostKindLabel, type GhostKindId } from "../../domain/ghostKind";
import { glyphInkCenterOffsetX, glyphInkCenterOffsetY } from "./font8x8Basic";
import {
  LEARN_BACK_Y,
  learnHoverPreviewCenter,
  splitSchoolColumns,
  type LearnColumn,
} from "../../domain/learnUpgradeColumns";
import {
  LEARN_UPGRADE_CLIP_BOTTOM,
  LEARN_UPGRADE_CLIP_TOP,
  LEARN_UPGRADE_COLUMN_X,
  LEARN_UPGRADE_HEADER_GAP,
  LEARN_UPGRADE_ROW_GAP,
  LEARN_UPGRADE_ROW_WIDTH,
  applyLearnUpgradeWheel,
  learnUpgradeBarRects,
  learnUpgradeColumnAt,
  learnUpgradeContentHeight,
  learnUpgradeRowVisible,
  learnUpgradeScrollExtent,
} from "../../domain/learnUpgradeScroll";
import { sidebarBackgroundColor } from "../../domain/sidebarBands";
import { UPGRADE_SLOT_HINT_GLYPH, upgradeSlotHintAngleDeg } from "../../domain/upgradeChoiceHints";
import type { GhostTarget } from "../../domain/ghostTarget";
import {
  GHOST_COLOR_BY_KIND,
  clipSegmentToRect,
  easeToward,
  targetDerivation,
  type PixelPoint,
  type PixelRect,
} from "../../domain/learnOverlay";
import {
  actorDisplaySize,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  MAZE_BACKGROUND_COLOR,
  TILE_SIZE,
} from "../../domain/maze";
import { GHOST_DRAWABLE_BY_KIND, PLAYFIELD_WIDTH } from "../../domain/playfield";
import {
  emptySeenRecord,
  learnSeenRecord,
  parseLearnAllMode,
  type SeenRecord,
} from "../../domain/seenRecord";
import { playPelletCollectSfx, playSfx, preloadSfx, startLoopingSfx } from "../audio/sfx";
import {
  baseIdOf,
  enhancedIdOf,
  getUpgradeDef,
  groupUpgradesBySchool,
  LEARN_NO_EFFECT_UPGRADE_IDS,
  learnEnhanceToggleState,
  learnUpgradeDefs,
  ownedFormOf,
  UPGRADE_SCHOOL_LABELS,
  type BaseUpgradeId,
  type UpgradeDef,
  type UpgradeId,
} from "../../domain/upgrades";
import { isTrinketId, trinketCopyControls, type TrinketUpgradeId } from "../../domain/trinkets";
import { loadSeenRecord } from "../storage/seenRecordStorage";
import { createHeldKeysReader } from "../systems/playerInput";
import type { HeldKeys } from "../systems/heldKeys";
import { LearnSim } from "../sim/learnSim";
import type { SimEvent } from "../sim/simEvents";
import { playTurnSparks } from "./turnSparks";
import { playChaffBurst } from "./chaffBurst";
import { playStreakPop } from "./streakPop";
import { createPowerPelletBreakFx, type PowerPelletBreakFx } from "./powerPelletBreakFx";
import { drawUpgradeDrain, pulseUpgradeMarks, type UpgradeMark } from "./upgradeTimerFx";
import { addGhostIcon, createRender, preloadPlayArt, type PlayRender } from "../systems/render";
import {
  addPixelText,
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";
import { wrapText } from "../../domain/wrapText";
import {
  buildUpgradeCardVisual,
  CHOICE_BUTTON_HEIGHT,
  SCHOOL_COLORS,
  MODAL_DEPTH,
  type UpgradeCardVisual,
} from "./upgradeChoiceModal";
import { applyRenderScale } from "../renderScale";

const SLOT_KINDS: readonly GhostKindId[] = [
  GHOST_KIND.blinky,
  GHOST_KIND.pinky,
  GHOST_KIND.inky,
  GHOST_KIND.spunky,
  GHOST_KIND.wardy,
  GHOST_KIND.clyde,
];
const TITLE_Y = 30;
const SLOT_Y = 90;
const SLOT_SIZE = 48;
const SLOT_GAP = 16;
const GHOST_NAME_Y = SLOT_Y - SLOT_SIZE / 2 - 8;
const SLOT_STROKE = 4;
const SLOT_STROKE_COLOR = 0x444444;
const RARE_LABEL_COLOR = 0xffd700;
const OVERLAY_DEPTH = 5;
const UPGRADE_BAR_DEPTH = OVERLAY_DEPTH + 1;
const UPGRADE_UI_DEPTH = OVERLAY_DEPTH + 2;
const PATH_ALPHA = 0.6;
const PATH_WIDTH = 3;
const RETICLE_SIZE = 10;
const DERIVATION_COLOR = 0x888888;
const DERIVATION_ALPHA = 0.8;
const DERIVATION_WIDTH = 2;
const PIVOT_DOT_RADIUS = 3;
const CIRCLE_SEGMENTS = 48;
const CHECKBOX_STROKE = 2;
const UPGRADE_CHECK_SIZE = 10;
const UPGRADE_CHECK_GAP = 4;
const UPGRADE_PLUS_INSET = 6;
const UPGRADE_PLUS_ZONE_WIDTH = 14;
const UPGRADE_PLUS_BOX_SIZE = 10;
const UPGRADE_PLUS_ON_TINT = 0x101820;
const COPIES_RIGHT_INSET = 2;
const COPIES_CHEVRON_W = 5;
const COPIES_CHEVRON_H = 8;
const COPIES_NUMBER_W = 16;
const COPIES_GAP = 2;
const COPIES_DISABLED_ALPHA = 0.3;
const NO_EFFECT_BANNER_Y = SLOT_Y + SLOT_SIZE / 2 + 10;
const STATUS_GAP_Y = 10;
const POPUP_RISE_PX = 28;
const POPUP_MS = 1100;
const HOVER_PREVIEW_DELAY_MS = 500;
type GhostSlot = { kind: GhostKindId; frame: Phaser.GameObjects.Graphics; x: number };
type UpgradeHeader = {
  column: LearnColumn;
  baseY: number;
  label: Phaser.GameObjects.BitmapText;
};
type CopiesControl = {
  text: Phaser.GameObjects.BitmapText;
  textX: number;
  left: Phaser.GameObjects.Triangle;
  right: Phaser.GameObjects.Triangle;
  leftZone: Phaser.GameObjects.Zone;
  rightZone: Phaser.GameObjects.Zone;
};
type UpgradeRow = {
  id: BaseUpgradeId;
  copies: CopiesControl | null;
  column: LearnColumn;
  baseY: number;
  labelX: number;
  plusX: number;
  checkBox: Phaser.GameObjects.Shape;
  checkMark: Phaser.GameObjects.Shape;
  label: Phaser.GameObjects.BitmapText;
  plus: Phaser.GameObjects.BitmapText;
  plusBox: Phaser.GameObjects.Shape;
  checkZone: Phaser.GameObjects.Zone;
  labelZone: Phaser.GameObjects.Zone;
  plusZone: Phaser.GameObjects.Zone;
};
type ColumnScrollCues = {
  up: Phaser.GameObjects.BitmapText;
  down: Phaser.GameObjects.BitmapText;
};

export class LearnScene extends Phaser.Scene {
  private sim!: LearnSim;
  private playRender!: PlayRender;
  private powerPelletBreakFx!: PowerPelletBreakFx;
  private readHeldKeys!: () => HeldKeys;
  private overlay!: Phaser.GameObjects.Graphics;
  private upgradeDrain!: Phaser.GameObjects.Graphics;
  private seen: SeenRecord = emptySeenRecord();
  private reticlePx: PixelPoint | null = null;
  private slots: GhostSlot[] = [];
  private upgradeHeaders: UpgradeHeader[] = [];
  private upgradeRows: UpgradeRow[] = [];
  private scrollOffset: Record<LearnColumn, number> = { left: 0, right: 0 };
  private scrollExtent: Record<LearnColumn, number> = { left: 0, right: 0 };
  private scrollCues!: Record<LearnColumn, ColumnScrollCues>;
  private noEffectBanner!: Phaser.GameObjects.BitmapText;
  private statusText!: Phaser.GameObjects.BitmapText;
  private ghostNameText!: Phaser.GameObjects.BitmapText;
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
    const urlParams = parseQueryParams(location.search);
    this.sim = new LearnSim(parseSeedParam(urlParams) ?? freshSeed());
    const learnAllMode = parseLearnAllMode(urlParams);
    this.seen = learnSeenRecord(learnAllMode, loadSeenRecord);
    this.reticlePx = null;
    this.statusShown = "";
    this.hoverPreviewTimer = null;
    this.hoverPreviewCard = null;

    this.playRender = createRender(this);
    this.powerPelletBreakFx?.clear();
    this.powerPelletBreakFx = createPowerPelletBreakFx(this);
    this.overlay = this.add.graphics().setDepth(OVERLAY_DEPTH);
    this.applyEvents(this.sim.start());

    const title = addPixelText(this, 0, 0, "LEARN", MENU_TITLE_FONT_SIZE);
    placePixelText(title, PLAYFIELD_WIDTH / 2, TITLE_Y, 0.5, 0.5);
    this.ghostNameText = addPixelText(this, 0, 0, "", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_YELLOW);
    this.buildGhostSlots();
    this.paintUpgradeBars();
    this.buildUpgradeRows();
    this.upgradeDrain = this.add.graphics().setDepth(UPGRADE_UI_DEPTH);
    this.buildBackButton();

    this.noEffectBanner = addPixelText(this, 0, 0, "", UPGRADES_HUD_FONT_SIZE)
      .setDepth(OVERLAY_DEPTH + 1)
      .setCenterAlign()
      .setLineSpacing(10);
    this.refreshNoEffectBanner();
    this.statusText = addPixelText(this, 0, 0, "", UPGRADES_HUD_FONT_SIZE)
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
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
    ].map((code) => keyboard.addKey(code));
    this.input.on(
      "wheel",
      (
        pointer: Phaser.Input.Pointer,
        _over: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
      ) => {
        this.onUpgradeWheel(pointer.worldX, pointer.worldY, deltaY);
      },
    );

    this.selectGhost(SLOT_KINDS[0]!);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cancelUpgradePreview());
  }

  public debugSnapshot(): {
    scroll: {
      left: number;
      right: number;
      leftExtent: number;
      rightExtent: number;
    };
    hoverPreview: { x: number; y: number } | null;
    owned: readonly UpgradeId[];
    tunnelBoring: ReturnType<LearnSim["tunnelBoringDebug"]>;
  } {
    const preview = this.hoverPreviewCard;
    return {
      scroll: {
        left: this.scrollOffset.left,
        right: this.scrollOffset.right,
        leftExtent: this.scrollExtent.left,
        rightExtent: this.scrollExtent.right,
      },
      hoverPreview: preview === null ? null : { x: preview.root.x, y: preview.root.y },
      owned: this.sim.ownedUpgrades,
      tunnelBoring: this.sim.tunnelBoringDebug(),
    };
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
    drawUpgradeDrain(this.upgradeDrain, this.upgradeMarks(), this.sim.upgradeTimerFractions());
  }

  private applyEvents(events: readonly SimEvent[]): void {
    for (const event of events) {
      if (event.type === "releaseDrawable") {
        this.playRender.releaseDrawable(event.eid);
      } else if (event.type === "resetBoard") {
        this.playRender.resetForNewBoard();
        this.powerPelletBreakFx.clear();
      } else if (event.type === "draw") {
        this.playRender.draw(this.sim.world, event.options);
      } else if (event.type === "bouncePowerPellet") {
        this.playRender.bouncePowerPellet(event.eid);
      } else if (event.type === "powerPelletBreak") {
        this.powerPelletBreakFx.apply(event);
      } else if (event.type === "upgradePulse") {
        pulseUpgradeMarks(this, this.upgradeMarks(), event.ids);
      } else if (event.type === "chaffBurst") {
        playChaffBurst(this, event);
      } else if (event.type === "peelCrack") {
        this.playRender.queuePeelCrack(event.x, event.y);
      } else if (event.type === "turnSparks") {
        playTurnSparks(this, event);
      } else if (event.type === "streakPop") {
        playStreakPop(this, event);
      } else if (event.type === "learnPopup") {
        this.showPopup(event);
      } else if (event.type === "sfx") {
        playSfx(this, event.id);
      } else if (event.type === "pelletSfx") {
        playPelletCollectSfx(this, event.previousCollected, event.removed, event.powerRemoved);
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

  private adjustCopies(id: TrinketUpgradeId, delta: number): void {
    this.applyEvents(this.sim.adjustUpgradeCopies(id, delta));
    this.refreshUpgradeRows();
  }

  private toggleEnhanced(id: BaseUpgradeId): void {
    this.applyEvents(this.sim.toggleEnhanced(id));
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
      addGhostIcon(this, GHOST_DRAWABLE_BY_KIND[kind], x, SLOT_Y, actorDisplaySize());
      const zone = this.add.zone(x, SLOT_Y, SLOT_SIZE, SLOT_SIZE);
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => this.selectGhost(kind));
      zone.on("pointerover", () => this.showGhostName(kind, x));
      zone.on("pointerout", () => this.ghostNameText.setText(""));
      this.slots.push({ kind, frame, x });
    });
    this.refreshSlots();
  }

  private showGhostName(kind: GhostKindId, x: number): void {
    this.ghostNameText.setText(ghostKindLabel(kind));
    placePixelText(this.ghostNameText, x, GHOST_NAME_Y, 0.5, 0.5);
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

  private paintUpgradeBars(): void {
    const bars = this.add.graphics().setDepth(UPGRADE_BAR_DEPTH);
    const color = sidebarBackgroundColor(MAZE_BACKGROUND_COLOR);
    bars.fillStyle(color, 1);
    for (const rect of learnUpgradeBarRects()) {
      bars.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
  }

  private buildUpgradeRows(): void {
    this.upgradeRows = [];
    this.upgradeHeaders = [];
    this.scrollOffset = { left: 0, right: 0 };
    this.scrollExtent = { left: 0, right: 0 };
    this.scrollCues = {
      left: this.buildScrollCues("left"),
      right: this.buildScrollCues("right"),
    };
    const columns = splitSchoolColumns(groupUpgradesBySchool(learnUpgradeDefs(this.seen.upgrades)));
    for (const column of ["left", "right"] as const) {
      let y = LEARN_UPGRADE_CLIP_TOP - LEARN_UPGRADE_ROW_GAP;
      let upgradeCount = 0;
      for (const { school, defs } of columns[column]) {
        y += LEARN_UPGRADE_HEADER_GAP;
        const header = addPixelText(
          this,
          0,
          0,
          UPGRADE_SCHOOL_LABELS[school].toUpperCase(),
          UPGRADES_HUD_FONT_SIZE,
          SCHOOL_COLORS[school],
        );
        placePixelText(header, LEARN_UPGRADE_COLUMN_X[column], y, 0, 0.5);
        header.setDepth(UPGRADE_UI_DEPTH);
        this.upgradeHeaders.push({ column, baseY: y, label: header });
        for (const def of defs) {
          y += LEARN_UPGRADE_ROW_GAP;
          upgradeCount += 1;
          this.buildUpgradeRow(def, column, y);
        }
      }
      this.scrollExtent[column] = learnUpgradeScrollExtent(
        learnUpgradeContentHeight(columns[column].length, upgradeCount),
      );
    }
    this.applyUpgradeScroll();
  }

  private buildScrollCues(column: LearnColumn): ColumnScrollCues {
    const x = LEARN_UPGRADE_COLUMN_X[column] + LEARN_UPGRADE_ROW_WIDTH / 2;
    const up = addPixelText(
      this,
      x,
      LEARN_UPGRADE_CLIP_TOP - 12,
      UPGRADE_SLOT_HINT_GLYPH,
      UPGRADES_HUD_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    )
      .setOrigin(0.5, 0.5)
      .setAngle(upgradeSlotHintAngleDeg("up"))
      .setDepth(UPGRADE_UI_DEPTH)
      .setVisible(false);
    const down = addPixelText(
      this,
      x,
      LEARN_UPGRADE_CLIP_BOTTOM + 8,
      UPGRADE_SLOT_HINT_GLYPH,
      UPGRADES_HUD_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    )
      .setOrigin(0.5, 0.5)
      .setAngle(upgradeSlotHintAngleDeg("down"))
      .setDepth(UPGRADE_UI_DEPTH)
      .setVisible(false);
    return { up, down };
  }

  private buildUpgradeRow(def: UpgradeDef, column: LearnColumn, y: number): void {
    const columnX = LEARN_UPGRADE_COLUMN_X[column];
    const plusX = columnX + LEARN_UPGRADE_ROW_WIDTH - UPGRADE_PLUS_INSET;
    const checkboxX = columnX + UPGRADE_CHECK_SIZE / 2;
    const labelX = checkboxX + UPGRADE_CHECK_SIZE / 2 + UPGRADE_CHECK_GAP;
    const checkBox = this.add
      .rectangle(checkboxX, y, UPGRADE_CHECK_SIZE, UPGRADE_CHECK_SIZE)
      .setStrokeStyle(CHECKBOX_STROKE, TEXT_COLOR_WHITE)
      .setDepth(UPGRADE_UI_DEPTH);
    const checkMark = this.add
      .rectangle(checkboxX, y, UPGRADE_CHECK_SIZE - 4, UPGRADE_CHECK_SIZE - 4, RARE_LABEL_COLOR)
      .setVisible(false)
      .setDepth(UPGRADE_UI_DEPTH);
    const label = addPixelText(
      this,
      0,
      0,
      def.label,
      UPGRADES_HUD_FONT_SIZE,
      def.rare === true ? RARE_LABEL_COLOR : TEXT_COLOR_WHITE,
    );
    placePixelText(label, labelX, y, 0, 0.5);
    label.setDepth(UPGRADE_UI_DEPTH);
    const plusBox = this.add
      .rectangle(plusX, y, UPGRADE_PLUS_BOX_SIZE, UPGRADE_PLUS_BOX_SIZE)
      .setStrokeStyle(CHECKBOX_STROKE, RARE_LABEL_COLOR)
      .setVisible(false)
      .setDepth(UPGRADE_UI_DEPTH);
    const plus = addPixelText(this, 0, 0, "+", UPGRADES_HUD_FONT_SIZE, RARE_LABEL_COLOR);
    placePixelText(
      plus,
      plusX + (glyphInkCenterOffsetX("+") * UPGRADES_HUD_FONT_SIZE) / 8,
      y + (glyphInkCenterOffsetY("+") * UPGRADES_HUD_FONT_SIZE) / 8,
      0.5,
      0.5,
    );
    plus.setVisible(false).setDepth(UPGRADE_UI_DEPTH);
    const rowHitH = LEARN_UPGRADE_ROW_GAP - 2;
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
    labelZone.on("pointerover", () => this.scheduleUpgradePreview(def.id));
    labelZone.on("pointerout", () => this.cancelUpgradePreview());
    const plusZone = this.add.zone(plusX, y, UPGRADE_PLUS_ZONE_WIDTH, rowHitH);
    plusZone.on("pointerdown", () => this.toggleEnhanced(def.baseId));
    plusZone.on("pointerover", () => this.cancelUpgradePreview());
    this.upgradeRows.push({
      id: def.baseId,
      copies: isTrinketId(def.baseId) ? this.buildCopiesControl(def.baseId, columnX, y) : null,
      column,
      baseY: y,
      labelX,
      plusX,
      checkBox,
      checkMark,
      label,
      plus,
      plusBox,
      checkZone,
      labelZone,
      plusZone,
    });
  }

  private copiesLayout(columnX: number): { left: number; text: number; right: number } {
    const edge = columnX + LEARN_UPGRADE_ROW_WIDTH - COPIES_RIGHT_INSET;
    return {
      left: edge - COPIES_NUMBER_W - 2 * COPIES_GAP - 2 * COPIES_CHEVRON_W + COPIES_CHEVRON_W / 2,
      text: edge - COPIES_CHEVRON_W - COPIES_GAP - COPIES_NUMBER_W / 2,
      right: edge - COPIES_CHEVRON_W / 2,
    };
  }

  private buildCopiesControl(id: TrinketUpgradeId, columnX: number, y: number): CopiesControl {
    const at = this.copiesLayout(columnX);
    const w = COPIES_CHEVRON_W;
    const h = COPIES_CHEVRON_H;
    const triangle = (x: number, points: [number, number, number, number, number, number]) =>
      this.add
        .triangle(x, y, ...points, RARE_LABEL_COLOR)
        .setVisible(false)
        .setDepth(UPGRADE_UI_DEPTH);
    const left = triangle(at.left, [w, 0, w, h, 0, h / 2]);
    const right = triangle(at.right, [0, 0, 0, h, w, h / 2]);
    const text = addPixelText(this, 0, 0, "1", UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_WHITE);
    placePixelText(text, at.text, y, 0.5, 0.5);
    text.setVisible(false).setDepth(UPGRADE_UI_DEPTH);
    const rowHitH = LEARN_UPGRADE_ROW_GAP - 2;
    const zone = (x: number, delta: number) => {
      const hit = this.add.zone(x, y, w + COPIES_GAP * 2, rowHitH);
      hit.on("pointerdown", () => this.adjustCopies(id, delta));
      hit.on("pointerover", () => this.cancelUpgradePreview());
      return hit;
    };
    return {
      text,
      textX: at.text,
      left,
      right,
      leftZone: zone(at.left, -1),
      rightZone: zone(at.right, 1),
    };
  }

  private onUpgradeWheel(worldX: number, worldY: number, deltaY: number): void {
    const column = learnUpgradeColumnAt(worldX, worldY);
    if (column === null || this.scrollExtent[column] <= 0 || deltaY === 0) {
      return;
    }
    const next = applyLearnUpgradeWheel(
      this.scrollOffset[column],
      deltaY,
      this.scrollExtent[column],
    );
    if (next === this.scrollOffset[column]) {
      return;
    }
    this.scrollOffset[column] = next;
    this.cancelUpgradePreview();
    this.applyUpgradeScroll();
  }

  private applyUpgradeScroll(): void {
    for (const header of this.upgradeHeaders) {
      const offset = this.scrollOffset[header.column];
      const y = header.baseY - offset;
      placePixelText(header.label, LEARN_UPGRADE_COLUMN_X[header.column], y, 0, 0.5);
      header.label.setVisible(learnUpgradeRowVisible(header.baseY, offset));
    }
    for (const row of this.upgradeRows) {
      const offset = this.scrollOffset[row.column];
      const y = row.baseY - offset;
      row.checkBox.setY(y);
      row.checkMark.setY(y);
      placePixelText(row.label, row.labelX, y, 0, 0.5);
      row.plusBox.setY(y);
      placePixelText(
        row.plus,
        row.plusX + (glyphInkCenterOffsetX("+") * UPGRADES_HUD_FONT_SIZE) / 8,
        y + (glyphInkCenterOffsetY("+") * UPGRADES_HUD_FONT_SIZE) / 8,
        0.5,
        0.5,
      );
      row.checkZone.setY(y);
      row.labelZone.setY(y);
      row.plusZone.setY(y);
      if (row.copies !== null) {
        row.copies.left.setY(y);
        row.copies.right.setY(y);
        row.copies.leftZone.setY(y);
        row.copies.rightZone.setY(y);
      }
    }
    this.refreshUpgradeRows();
    this.refreshScrollCues();
  }

  private refreshScrollCues(): void {
    for (const column of ["left", "right"] as const) {
      const extent = this.scrollExtent[column];
      const offset = this.scrollOffset[column];
      const cues = this.scrollCues[column];
      cues.up.setVisible(extent > 0 && offset > 0);
      cues.down.setVisible(extent > 0 && offset < extent);
    }
  }

  private upgradeMarks(): UpgradeMark[] {
    return this.upgradeRows.map((row) => ({ id: row.id, mark: row.checkMark }));
  }

  private refreshUpgradeRows(): void {
    for (const row of this.upgradeRows) {
      const inView = learnUpgradeRowVisible(row.baseY, this.scrollOffset[row.column]);
      const state = learnEnhanceToggleState(this.sim.ownedUpgrades, row.id);
      const selected = state !== "hidden";
      row.checkBox.setVisible(inView);
      row.label.setVisible(inView);
      row.checkMark.setVisible(inView && selected);
      this.refreshCopiesControl(row, inView && selected);
      const enhanceable = selected && !isTrinketId(row.id);
      row.plus.setVisible(inView && enhanceable);
      row.plusBox.setVisible(inView && enhanceable);
      row.plusBox.setFillStyle(RARE_LABEL_COLOR, state === "on" ? 1 : 0);
      row.plus.setTint(state === "on" ? UPGRADE_PLUS_ON_TINT : RARE_LABEL_COLOR);
      row.label.setText(getUpgradeDef(state === "on" ? enhancedIdOf(row.id) : row.id).label);
      if (!inView) {
        row.checkZone.disableInteractive();
        row.labelZone.disableInteractive();
        row.plusZone.disableInteractive();
      } else {
        row.checkZone.setInteractive({ useHandCursor: true });
        row.labelZone.setInteractive({ useHandCursor: true });
        if (enhanceable) {
          row.plusZone.setInteractive({ useHandCursor: true });
        } else {
          row.plusZone.disableInteractive();
        }
      }
    }
  }

  private refreshCopiesControl(row: UpgradeRow, shown: boolean): void {
    const control = row.copies;
    if (control === null) {
      return;
    }
    const copies = this.sim.upgradeCopies(row.id as TrinketUpgradeId);
    const { down: canDown, up: canUp } = trinketCopyControls(copies);
    control.text.setText(String(Math.max(1, copies)));
    placePixelText(
      control.text,
      control.textX,
      row.baseY - this.scrollOffset[row.column],
      0.5,
      0.5,
    );
    control.text.setVisible(shown);
    control.left.setVisible(shown).setAlpha(canDown ? 1 : COPIES_DISABLED_ALPHA);
    control.right.setVisible(shown).setAlpha(canUp ? 1 : COPIES_DISABLED_ALPHA);
    const enable = (zone: Phaser.GameObjects.Zone, on: boolean) =>
      on ? zone.setInteractive({ useHandCursor: true }) : zone.disableInteractive();
    enable(control.leftZone, shown && canDown);
    enable(control.rightZone, shown && canUp);
  }

  private refreshStatus(): void {
    const text = this.sim.statusText();
    if (text === this.statusShown) {
      return;
    }
    this.statusShown = text;
    const layout = getActiveLayout();
    this.statusText.setText(text);
    placePixelText(
      this.statusText,
      layout.offsetX + layout.pixelWidth / 2,
      layout.offsetY + layout.pixelHeight + STATUS_GAP_Y,
      0.5,
      0,
    );
  }

  private showPopup(event: { text: string; x: number; y: number }): void {
    const popup = addPixelText(this, 0, 0, event.text, UPGRADES_HUD_FONT_SIZE, TEXT_COLOR_YELLOW)
      .setDepth(OVERLAY_DEPTH + 2)
      .setCenterAlign();
    placePixelText(popup, event.x, event.y, 0.5, 1);
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
    placePixelText(
      this.noEffectBanner,
      layout.offsetX + layout.pixelWidth / 2,
      NO_EFFECT_BANNER_Y,
      0.5,
      0,
    );
  }

  private scheduleUpgradePreview(id: UpgradeId): void {
    this.cancelUpgradePreview();
    this.hoverPreviewTimer = setTimeout(() => {
      this.hoverPreviewTimer = null;
      this.showUpgradePreview(id);
    }, HOVER_PREVIEW_DELAY_MS);
  }

  private showUpgradePreview(id: UpgradeId): void {
    const def = getUpgradeDef(ownedFormOf(this.sim.ownedUpgrades, baseIdOf(id)) ?? id);
    const { x, y } = learnHoverPreviewCenter(CHOICE_BUTTON_HEIGHT);
    const visual = buildUpgradeCardVisual(this, x, y, {
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
    const back = addPixelText(this, 0, 0, "BACK", MENU_OPTION_FONT_SIZE);
    placePixelText(back, PLAYFIELD_WIDTH / 2, LEARN_BACK_Y, 0.5, 0.5);
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
    } else if (derivation.kind === "rim") {
      const inset = derivation.insetTiles * TILE_SIZE;
      this.strokePixelsClipped(
        [
          { x: rect.left + inset, y: rect.top + inset },
          { x: rect.right - inset, y: rect.top + inset },
          { x: rect.right - inset, y: rect.bottom - inset },
          { x: rect.left + inset, y: rect.bottom - inset },
          { x: rect.left + inset, y: rect.top + inset },
        ],
        rect,
      );
      this.strokePixelsClipped([playerPx, this.reticlePx], rect);
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

    const { path } = model;
    const pathPx = path.map((tile) => ({ x: cellCenterX(tile.col), y: cellCenterY(tile.row) }));
    const last = path.at(-1);
    if (last !== undefined && last.col === target.col && last.row === target.row) {
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
