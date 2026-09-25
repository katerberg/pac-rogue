import {
  addComponent,
  addEntity,
  createWorld,
  hasComponent,
  query,
  removeEntity,
  type World,
} from "bitecs";
import Phaser from "phaser";
import {
  CORRUPTION_DEFS,
  OUTLINE_TINT_BY_CORRUPTION,
  SPEED_SURGE_MUL,
  corruptionAiOption,
  createRunCorruption,
  isSpeedSurgeActive,
  resetCorruptionTransient,
  tickSpeedSurge,
  type CorruptionId,
  type RunCorruption,
} from "../../domain/corruption";
import { pickClosestGhostEid } from "../../domain/ghostRecall";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_AI_MODE, type GhostAiMode } from "../../domain/ghostMode";
import type { GhostDir } from "../../domain/ghostPath";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import type { GhostTarget } from "../../domain/ghostTarget";
import {
  queuePelletRefills,
  tickPelletRefills,
  type PendingPelletRefill,
} from "../../domain/learnPelletRefill";
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
import { speedLevelMultiplier } from "../../domain/levelRules";
import {
  activateLayout,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
  pelletCellCenters,
  playerSpawnCenter,
  TILE_SIZE,
  wallCellCenters,
  worldToCol,
  worldToRow,
  type PelletKind,
} from "../../domain/maze";
import {
  GHOST_DRAWABLE_BY_KIND,
  ghostRadius,
  PELLET_DRAWABLE_ID,
  PELLET_RADIUS,
  PLAYER_DRAWABLE_ID,
  playerRadius,
  PLAYER_SPEED,
  PLAYFIELD_WIDTH,
  POWER_PELLET_DRAWABLE_ID,
} from "../../domain/playfield";
import {
  allSeenRecord,
  emptySeenRecord,
  parseLearnAllMode,
  type SeenRecord,
} from "../../domain/seenRecord";
import {
  createRunUpgrades,
  frozenGhostEid,
  getUpgradeDef,
  ghostSpeedMultiplier,
  grantUpgrade,
  pelletCollectRadiusBonusPx,
  playerSpeedMultiplier,
  PLAYER_SPEED_BURST_MUL,
  revokeUpgrade,
  scatterBurstActive,
  speedBurstActive,
  tickFreeze,
  tickInvuln,
  tickScatterBurst,
  tickSpeedBurst,
  tickWallPass,
  TUNNEL_DASH_SPEED_MUL,
  UPGRADE_DEFS,
  wallPassActive,
  applyPowerPelletEffects,
  type RunUpgrades,
  type UpgradeDef,
  type UpgradeId,
} from "../../domain/upgrades";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { Wall } from "../components/Wall";
import { loadSeenRecord } from "../storage/seenRecordStorage";
import { collectExtraPellets } from "../systems/collectExtraPellets";
import { collectPellets } from "../systems/collectPellets";
import { findGhostEidByKind } from "../systems/corruptionGhost";
import { stepCorruption } from "../systems/corruptionStep";
import { ghostAi, ghostAiContext, resolveGhostTarget } from "../systems/ghostAi";
import { freezeClosestGhost } from "../systems/ghostFreeze";
import { forceGhostReverse } from "../systems/ghostReverse";
import { applyGhostSpeed } from "../systems/ghostSpeed";
import { movement } from "../systems/movement";
import { applyPelletToPowerConvert } from "../systems/pelletToPower";
import { createPlayerInput } from "../systems/playerInput";
import { applyPlayerSpeed } from "../systems/playerSpeed";
import { warpPlayerToTopCenter } from "../systems/playerWarp";
import {
  applyTunnelDash,
  tickTunnelDashAnimation,
  type TunnelDashAnimation,
} from "../systems/tunnelDash";
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
const NO_ELROY_PELLETS = Number.MAX_SAFE_INTEGER;
const LEARN_LEVEL = 1;
const UPGRADE_COLUMN_X = 20;
const UPGRADE_ROW_START_Y = 100;
const UPGRADE_ROW_GAP = 21;
const UPGRADE_ROW_WIDTH = 190;
const UPGRADE_CHECK_SIZE = 10;
const UPGRADE_CHECK_GAP = 4;
const LEARN_PELLET_REFILL_MS = 4000;
const LEARN_POWER_PELLET_REFILL_MS = 6000;
const LEARN_RECALL_HOLD_MS = 1500;
const NO_EFFECT_BANNER_Y_PAD = 4;
const LEARN_NO_EFFECT_UPGRADE_IDS: readonly UpgradeId[] = [
  "ghostHouseDelay",
  "extraLife",
  "fruitPower",
  "quarterBounty",
  "deathsHarvest",
  "secondChomp",
];

type GhostSlot = { kind: GhostKindId; frame: Phaser.GameObjects.Graphics; x: number };
type CorruptionRow = { id: CorruptionId; checkMark: Phaser.GameObjects.Rectangle };
type UpgradeRow = { id: UpgradeId; checkMark: Phaser.GameObjects.Rectangle };
type PelletInfo = { x: number; y: number; kind: PelletKind };
type PelletSnapshot = ReadonlyMap<number, PelletInfo>;

export class LearnScene extends Phaser.Scene {
  private world!: World;
  private playRender!: PlayRender;
  private runPlayerInput!: (world: World) => void;
  private overlay!: Phaser.GameObjects.Graphics;
  private seen: SeenRecord = emptySeenRecord();
  private selectedKind: GhostKindId | null = null;
  private corruption: RunCorruption = createRunCorruption({ type: null, ghostKind: null });
  private ghostEid: number | null = null;
  private helperBlinkyEid: number | null = null;
  private hiddenGhostEid: number | null = null;
  private flashGhostEid: number | null = null;
  private reticlePx: PixelPoint | null = null;
  private slots: GhostSlot[] = [];
  private corruptionRows: CorruptionRow[] = [];
  private upgradeRows: UpgradeRow[] = [];
  private noEffectBanner!: Phaser.GameObjects.BitmapText;
  private learnUpgrades: RunUpgrades = createRunUpgrades();
  private pendingPelletRefills: PendingPelletRefill[] = [];
  private recallHoldGhostEid: number | null = null;
  private recallHoldRemainingMs = 0;
  private tunnelDashAnim: TunnelDashAnimation | null = null;
  private previousEffectiveGhostMode: GhostAiMode = GHOST_AI_MODE.chase;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private slotKeys: Phaser.Input.Keyboard.Key[] = [];

  constructor() {
    super("LearnScene");
  }

  preload(): void {
    preloadPlayArt(this);
  }

  create(): void {
    activateLayout("mazeSmall");
    this.world = createWorld();
    this.selectedKind = null;
    this.ghostEid = null;
    this.helperBlinkyEid = null;
    this.hiddenGhostEid = null;
    this.flashGhostEid = null;
    this.corruption = createRunCorruption({ type: null, ghostKind: null });
    const learnAllMode = parseLearnAllMode(new URLSearchParams(location.search));
    this.seen =
      learnAllMode === "all"
        ? allSeenRecord()
        : learnAllMode === "none"
          ? emptySeenRecord()
          : loadSeenRecord();
    this.learnUpgrades = createRunUpgrades();
    this.pendingPelletRefills = [];
    this.recallHoldGhostEid = null;
    this.recallHoldRemainingMs = 0;
    this.tunnelDashAnim = null;
    this.previousEffectiveGhostMode = GHOST_AI_MODE.chase;

    this.playRender = createRender(this);
    this.overlay = this.add.graphics().setDepth(OVERLAY_DEPTH);
    this.spawnWalls();
    this.spawnPlayer();
    this.resetPellets();

    const title = addPixelText(this, 0, 0, "LEARN", MENU_TITLE_FONT_SIZE);
    placePixelText(title, PLAYFIELD_WIDTH / 2, TITLE_Y, 0.5, 0.5);
    this.buildGhostSlots();
    this.buildCorruptionRows();
    this.buildUpgradeRows();
    this.buildBackButton();

    this.noEffectBanner = addPixelText(this, 0, 0, "", HUD_FONT_SIZE).setDepth(OVERLAY_DEPTH + 1);
    this.refreshNoEffectBanner();

    const playerInput = createPlayerInput(this);
    this.runPlayerInput = playerInput.apply;
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

    this.runPlayerInput(this.world);
    const levelSpeedMul = speedLevelMultiplier(LEARN_LEVEL);
    this.corruption = tickSpeedSurge(this.corruption, delta);

    const pelletSnapshot = new Map<number, PelletInfo>();
    for (const eid of query(this.world, [Pellet, Position])) {
      pelletSnapshot.set(eid, {
        x: Position.x[eid] ?? 0,
        y: Position.y[eid] ?? 0,
        kind: hasComponent(this.world, eid, PowerPellet) ? "power" : "dot",
      });
    }

    this.learnUpgrades = tickFreeze(this.learnUpgrades, delta);
    this.learnUpgrades = tickScatterBurst(this.learnUpgrades, delta);
    this.learnUpgrades = tickWallPass(this.learnUpgrades, delta);
    this.learnUpgrades = tickInvuln(this.learnUpgrades, delta);
    this.learnUpgrades = tickSpeedBurst(this.learnUpgrades, delta);

    const refillTick = tickPelletRefills(this.pendingPelletRefills, delta);
    this.pendingPelletRefills = refillTick.pending;
    this.spawnRefilledPellets(refillTick.ready);

    if (this.recallHoldRemainingMs > 0) {
      this.recallHoldRemainingMs = Math.max(0, this.recallHoldRemainingMs - delta);
      if (this.recallHoldRemainingMs === 0 && this.recallHoldGhostEid !== null) {
        GhostPhase.value[this.recallHoldGhostEid] = GHOST_PHASE.active;
        this.recallHoldGhostEid = null;
      }
    }

    applyPlayerSpeed(
      this.world,
      levelSpeedMul *
        playerSpeedMultiplier(this.learnUpgrades.owned) *
        (speedBurstActive(this.learnUpgrades) ? PLAYER_SPEED_BURST_MUL : 1),
    );
    applyGhostSpeed(this.world, NO_ELROY_PELLETS, LEARN_LEVEL, {
      ghostSpeedMul: levelSpeedMul * ghostSpeedMultiplier(this.learnUpgrades.owned),
      frozenGhostEid: frozenGhostEid(this.learnUpgrades),
      speedSurge:
        this.corruption.ghostKind !== null && isSpeedSurgeActive(this.corruption)
          ? { ghostKind: this.corruption.ghostKind, mul: SPEED_SURGE_MUL }
          : undefined,
    });
    movement(
      this.world,
      delta,
      wallPassActive(this.learnUpgrades) ? getActiveLayout().wallPassPlayerSolids : undefined,
    );

    if (this.tunnelDashAnim !== null) {
      this.tunnelDashAnim = tickTunnelDashAnimation(
        this.world,
        this.tunnelDashAnim,
        delta,
        PLAYER_SPEED * TUNNEL_DASH_SPEED_MUL,
      );
    } else if (this.learnUpgrades.owned.includes("tunnelDash")) {
      const dash = applyTunnelDash(this.world);
      if (dash !== null) {
        if (dash.sweptPelletEids.length > 0) {
          this.releasePelletsAndQueueRefill(dash.sweptPelletEids, pelletSnapshot);
          if (dash.sweptPowerRemoved > 0) {
            this.resolveLearnPowerPelletTrigger(dash.sweptPowerRemoved, pelletSnapshot);
          }
        }
        this.tunnelDashAnim = { targetX: dash.animateToX, wrapToX: dash.wrapToX, y: dash.y };
      }
    }

    const pelletsOnBoard = query(this.world, [Pellet]).length;
    const step = stepCorruption(this.world, this.corruption, delta, Math.max(1, pelletsOnBoard));
    this.corruption = step.corruption;
    this.hiddenGhostEid = step.hiddenGhostEid;
    this.flashGhostEid = step.flashGhostEid;
    this.spawnDroppedPellets(step.dropSpawnTiles, pelletSnapshot);

    const { removedEids, powerRemoved } = collectPellets(this.world, {
      radiusBonusPx: pelletCollectRadiusBonusPx(this.learnUpgrades.owned),
      solids: getActiveLayout().playerSolids,
    });
    this.releasePelletsAndQueueRefill(removedEids, pelletSnapshot);
    if (powerRemoved > 0) {
      this.resolveLearnPowerPelletTrigger(powerRemoved, pelletSnapshot);
    }

    const effectiveMode = scatterBurstActive(this.learnUpgrades)
      ? GHOST_AI_MODE.scatter
      : GHOST_AI_MODE.chase;
    if (effectiveMode !== this.previousEffectiveGhostMode) {
      forceGhostReverse(this.world, this.corruption);
    } else {
      ghostAi(this.world, effectiveMode, NO_ELROY_PELLETS, {
        corruption: corruptionAiOption(this.corruption),
      });
    }
    this.previousEffectiveGhostMode = effectiveMode;

    const type = this.corruption.type;
    this.playRender.draw(this.world, {
      frozenGhostEid: frozenGhostEid(this.learnUpgrades),
      playerInvulnRemainingMs: this.learnUpgrades.invulnRemainingMs,
      wallPassActive: wallPassActive(this.learnUpgrades),
      corruptedGhostEid:
        type !== null ? findGhostEidByKind(this.world, this.corruption.ghostKind) : null,
      corruptedTint: type !== null ? OUTLINE_TINT_BY_CORRUPTION[type] : undefined,
      flashGhostEid: this.flashGhostEid,
      hiddenGhostEid: this.hiddenGhostEid,
      dimGhostEid: this.helperBlinkyEid,
      slimeTrailTiles: this.corruption.trail,
    });
    this.drawOverlay(delta);
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
      const selected = slot.kind === this.selectedKind;
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
      row.checkMark.setVisible(row.id === this.corruption.type);
    }
  }

  private buildUpgradeRows(): void {
    this.upgradeRows = [];
    const defs = UPGRADE_DEFS.filter((def) => this.seen.upgrades.includes(def.id));
    const checkboxX = UPGRADE_COLUMN_X + UPGRADE_CHECK_SIZE / 2;
    const labelX = checkboxX + UPGRADE_CHECK_SIZE / 2 + UPGRADE_CHECK_GAP;
    defs.forEach((def, index) => {
      const y = UPGRADE_ROW_START_Y + index * UPGRADE_ROW_GAP;
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
        UPGRADE_ROW_GAP - 4,
      );
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => this.toggleUpgrade(def.id));
      this.upgradeRows.push({ id: def.id, checkMark });
    });
  }

  private refreshUpgradeRows(): void {
    for (const row of this.upgradeRows) {
      row.checkMark.setVisible(this.learnUpgrades.owned.includes(row.id));
    }
  }

  private refreshNoEffectBanner(): void {
    const selectedLabels = LEARN_NO_EFFECT_UPGRADE_IDS.filter((id) =>
      this.learnUpgrades.owned.includes(id),
    ).map((id) => getUpgradeDef(id).label);
    const text =
      selectedLabels.length === 0 ? "" : `${selectedLabels.join(", ")} - NO VISIBLE EFFECT HERE`;
    this.noEffectBanner.setText(text);
    const layout = getActiveLayout();
    placePixelText(
      this.noEffectBanner,
      layout.offsetX + layout.pixelWidth / 2,
      layout.offsetY + NO_EFFECT_BANNER_Y_PAD,
      0.5,
      0,
    );
  }

  private clearStaleUpgradeTimers(owned: readonly UpgradeId[], state: RunUpgrades): RunUpgrades {
    const hasField = (key: keyof NonNullable<UpgradeDef["onPowerPellet"]>): boolean =>
      owned.some((id) => getUpgradeDef(id).onPowerPellet?.[key] !== undefined);
    return {
      ...state,
      freezeRemainingMs: hasField("freezeClosestGhostMs") ? state.freezeRemainingMs : 0,
      frozenGhostEid: hasField("freezeClosestGhostMs") ? state.frozenGhostEid : null,
      scatterBurstRemainingMs: hasField("scatterBurstMs") ? state.scatterBurstRemainingMs : 0,
      wallPassRemainingMs: hasField("wallPassMs") ? state.wallPassRemainingMs : 0,
      invulnRemainingMs: hasField("playerInvulnMs") ? state.invulnRemainingMs : 0,
      speedBurstRemainingMs: hasField("playerSpeedBurstMs") ? state.speedBurstRemainingMs : 0,
    };
  }

  private toggleUpgrade(id: UpgradeId): void {
    const turningOn = !this.learnUpgrades.owned.includes(id);
    const toggled = turningOn
      ? grantUpgrade(this.learnUpgrades, id)
      : revokeUpgrade(this.learnUpgrades, id);
    this.learnUpgrades = this.clearStaleUpgradeTimers(toggled.owned, toggled);
    if (turningOn && id === "pelletToPower") {
      this.applyLearnPelletToPowerOnce();
    }
    this.refreshUpgradeRows();
    this.refreshNoEffectBanner();
  }

  private applyLearnPelletToPowerOnce(): void {
    const eid = applyPelletToPowerConvert(this.world, () => Math.random());
    if (eid === null) {
      return;
    }
    this.playRender.bouncePowerPellet(eid);
  }

  private resolveLearnPowerPelletTrigger(powerRemoved: number, snapshot: PelletSnapshot): void {
    const powerEffects = applyPowerPelletEffects(this.learnUpgrades, powerRemoved);
    this.learnUpgrades = powerEffects.state;
    if (powerEffects.freezeClosestMs !== null) {
      this.learnUpgrades = freezeClosestGhost(
        this.world,
        this.learnUpgrades,
        powerEffects.freezeClosestMs,
      );
    }
    if (powerEffects.collectExtraPellets > 0) {
      const bonusEids = collectExtraPellets(
        this.world,
        powerEffects.collectExtraPellets,
        getActiveLayout().playerSolids,
      );
      this.releasePelletsAndQueueRefill(bonusEids, snapshot);
    }
    if (powerEffects.recallClosestGhost) {
      this.recallClosestGhostForLearn();
    }
    if (powerEffects.warpPlayerTopCenter) {
      warpPlayerToTopCenter(this.world);
    }
  }

  private recallClosestGhostForLearn(): void {
    const playerEid = query(this.world, [Player, Position])[0];
    if (playerEid === undefined) {
      return;
    }
    const fromX = Position.x[playerEid] ?? 0;
    const fromY = Position.y[playerEid] ?? 0;
    const candidates = [];
    for (const candidateEid of query(this.world, [Ghost, GhostPhase, Position])) {
      candidates.push({
        eid: candidateEid,
        x: Position.x[candidateEid] ?? 0,
        y: Position.y[candidateEid] ?? 0,
        phase: (GhostPhase.value[candidateEid] ?? GHOST_PHASE.inHouse) as GhostPhaseValue,
      });
    }
    const eid = pickClosestGhostEid(candidates, fromX, fromY);
    if (eid === null) {
      return;
    }
    const exit = getActiveLayout().ghostHouseExit;
    Position.x[eid] = cellCenterX(exit.col);
    Position.y[eid] = cellCenterY(exit.row);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Speed.px[eid] = 0;
    GhostPhase.value[eid] = GHOST_PHASE.inHouse;
    Ghost.decidedCol[eid] = Number.NaN;
    Ghost.decidedRow[eid] = Number.NaN;
    this.recallHoldGhostEid = eid;
    this.recallHoldRemainingMs = LEARN_RECALL_HOLD_MS;
  }

  private releasePelletsAndQueueRefill(
    removedEids: readonly number[],
    snapshot: PelletSnapshot,
  ): void {
    for (const eid of removedEids) {
      this.playRender.releaseDrawable(eid);
    }
    this.queuePelletRefillsFromRemoved(removedEids, snapshot);
  }

  private queuePelletRefillsFromRemoved(
    removedEids: readonly number[],
    snapshot: PelletSnapshot,
  ): void {
    const dots: PelletInfo[] = [];
    const powers: PelletInfo[] = [];
    for (const eid of removedEids) {
      const info = snapshot.get(eid);
      if (info === undefined) {
        continue;
      }
      (info.kind === "power" ? powers : dots).push(info);
    }
    this.pendingPelletRefills = queuePelletRefills(
      this.pendingPelletRefills,
      dots,
      LEARN_PELLET_REFILL_MS,
    );
    this.pendingPelletRefills = queuePelletRefills(
      this.pendingPelletRefills,
      powers,
      LEARN_POWER_PELLET_REFILL_MS,
    );
  }

  private spawnRefilledPellets(ready: readonly PelletInfo[]): void {
    for (const cell of ready) {
      if (this.isPelletCellOccupied(cell.x, cell.y)) {
        continue;
      }
      this.spawnPelletEntity(cell.x, cell.y, cell.kind);
    }
  }

  private buildBackButton(): void {
    const back = addPixelText(this, 0, 0, "BACK", MENU_OPTION_FONT_SIZE);
    placePixelText(back, PLAYFIELD_WIDTH / 2, BACK_Y, 0.5, 0.5);
    back.setInteractive({ useHandCursor: true });
    back.on("pointerover", () => back.setTint(TEXT_COLOR_YELLOW));
    back.on("pointerout", () => back.setTint(TEXT_COLOR_WHITE));
    back.on("pointerdown", () => this.scene.start("MenuScene"));
  }

  private selectGhost(kind: GhostKindId): void {
    if (!this.seen.ghosts.includes(kind)) {
      return;
    }
    for (const eid of [this.ghostEid, this.helperBlinkyEid]) {
      if (eid !== null) {
        this.playRender.releaseDrawable(eid);
        removeEntity(this.world, eid);
      }
    }
    this.resetPellets();

    const exit = getActiveLayout().ghostHouseExit;
    this.selectedKind = kind;
    this.ghostEid = this.spawnActiveGhost(kind, exit);
    this.helperBlinkyEid = null;
    if (kind === GHOST_KIND.inky) {
      const beside = { col: exit.col + 1, row: exit.row };
      this.helperBlinkyEid = this.spawnActiveGhost(
        GHOST_KIND.blinky,
        isWalkable(beside.col, beside.row) ? beside : exit,
        DIRECTION.right,
      );
    }
    this.corruption = resetCorruptionTransient({ ...this.corruption, ghostKind: kind });
    this.hiddenGhostEid = null;
    this.flashGhostEid = null;
    this.reticlePx = null;
    this.learnUpgrades = {
      ...this.learnUpgrades,
      freezeRemainingMs: 0,
      frozenGhostEid: null,
      scatterBurstRemainingMs: 0,
      wallPassRemainingMs: 0,
      invulnRemainingMs: 0,
      speedBurstRemainingMs: 0,
    };
    this.recallHoldGhostEid = null;
    this.recallHoldRemainingMs = 0;
    this.refreshSlots();
    this.refreshCorruptionRows();
  }

  private toggleCorruption(id: CorruptionId): void {
    const type = this.corruption.type === id ? null : id;
    this.corruption = resetCorruptionTransient({
      ...this.corruption,
      type,
      ghostKind: this.selectedKind,
    });
    this.hiddenGhostEid = null;
    this.flashGhostEid = null;
    this.resetPellets();
    this.refreshCorruptionRows();
  }

  private drawOverlay(deltaMs: number): void {
    this.overlay.clear();
    const eid = this.ghostEid;
    const kind = this.selectedKind;
    if (eid === null || kind === null || eid === this.hiddenGhostEid) {
      return;
    }

    const layout = getActiveLayout();
    const ctx = ghostAiContext(this.world);
    const target = resolveGhostTarget(eid, GHOST_AI_MODE.chase, NO_ELROY_PELLETS, ctx, {
      corruption: corruptionAiOption(this.corruption),
    });
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

    const playerEid = query(this.world, [Player, Position])[0];
    const playerPx =
      playerEid === undefined
        ? { x: cellCenterX(ctx.player.col), y: cellCenterY(ctx.player.row) }
        : { x: Position.x[playerEid] ?? 0, y: Position.y[playerEid] ?? 0 };
    const nearPlayer = (tile: GhostTarget): PixelPoint => ({
      x: playerPx.x + (tile.col - ctx.player.col) * TILE_SIZE,
      y: playerPx.y + (tile.row - ctx.player.row) * TILE_SIZE,
    });

    const derivation = targetDerivation(kind, {
      player: { col: ctx.player.col, row: ctx.player.row },
      playerFacing: ctx.player.facing,
      blinky: ctx.blinky,
      target,
    });
    this.overlay.lineStyle(DERIVATION_WIDTH, DERIVATION_COLOR, DERIVATION_ALPHA);
    if (derivation.kind === "segment") {
      this.strokePixelsClipped([playerPx, this.reticlePx], rect);
    } else if (derivation.kind === "inky") {
      const blinkyEid = this.helperBlinkyEid;
      const blinkyPx =
        blinkyEid === null
          ? { x: cellCenterX(derivation.blinky.col), y: cellCenterY(derivation.blinky.row) }
          : { x: Position.x[blinkyEid] ?? 0, y: Position.y[blinkyEid] ?? 0 };
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

    const ghostPx = { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
    const pathTarget = clampTileToBoard(target, layout.cols, layout.rows);
    const path = predictGhostPath({
      start: { col: worldToCol(ghostPx.x), row: worldToRow(ghostPx.y) },
      facing: (Facing.direction[eid] ?? DIRECTION.none) as GhostDir,
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

  private resetPellets(): void {
    for (const eid of query(this.world, [Pellet])) {
      this.playRender.releaseDrawable(eid);
      removeEntity(this.world, eid);
    }
    this.pendingPelletRefills = [];
    this.spawnPellets();
  }

  private spawnPelletEntity(x: number, y: number, kind: PelletKind): number {
    const eid = addEntity(this.world);
    addComponent(this.world, eid, Pellet);
    addComponent(this.world, eid, Position);
    addComponent(this.world, eid, Drawable);
    if (kind === "power") {
      addComponent(this.world, eid, PowerPellet);
    }
    Position.x[eid] = x;
    Position.y[eid] = y;
    Drawable.id[eid] = kind === "power" ? POWER_PELLET_DRAWABLE_ID : PELLET_DRAWABLE_ID;
    Drawable.radius[eid] = PELLET_RADIUS;
    return eid;
  }

  private isPelletCellOccupied(x: number, y: number): boolean {
    return query(this.world, [Pellet, Position]).some(
      (eid) => Position.x[eid] === x && Position.y[eid] === y,
    );
  }

  private spawnPellets(): void {
    for (const cell of pelletCellCenters()) {
      this.spawnPelletEntity(cell.x, cell.y, cell.kind);
    }
  }

  private spawnDroppedPellets(
    tiles: readonly GhostTarget[],
    pelletSnapshot: Map<number, PelletInfo>,
  ): void {
    const { playerSolids } = getActiveLayout();
    for (const tile of tiles) {
      if (!isWalkable(tile.col, tile.row, playerSolids)) {
        continue;
      }
      const x = cellCenterX(tile.col);
      const y = cellCenterY(tile.row);
      if (this.isPelletCellOccupied(x, y)) {
        continue;
      }
      const eid = this.spawnPelletEntity(x, y, "dot");
      pelletSnapshot.set(eid, { x, y, kind: "dot" });
    }
  }

  private spawnWalls(): void {
    for (const cell of wallCellCenters()) {
      const eid = addEntity(this.world);
      addComponent(this.world, eid, Wall);
      addComponent(this.world, eid, Position);
      Position.x[eid] = cell.x;
      Position.y[eid] = cell.y;
    }
  }

  private spawnPlayer(): void {
    const eid = addEntity(this.world);
    addComponent(this.world, eid, Position);
    addComponent(this.world, eid, Velocity);
    addComponent(this.world, eid, Input);
    addComponent(this.world, eid, Facing);
    addComponent(this.world, eid, Speed);
    addComponent(this.world, eid, Player);
    addComponent(this.world, eid, Drawable);

    const spawn = playerSpawnCenter();
    Position.x[eid] = spawn.x;
    Position.y[eid] = spawn.y;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Input.direction[eid] = DIRECTION.none;
    Facing.direction[eid] = DIRECTION.none;
    Speed.px[eid] = PLAYER_SPEED;
    Drawable.id[eid] = PLAYER_DRAWABLE_ID;
    Drawable.radius[eid] = playerRadius();
  }

  private spawnActiveGhost(
    kind: GhostKindId,
    tile: GhostTarget,
    facing: Direction = DIRECTION.left,
  ): number {
    const eid = addEntity(this.world);
    addComponent(this.world, eid, Position);
    addComponent(this.world, eid, Velocity);
    addComponent(this.world, eid, Input);
    addComponent(this.world, eid, Facing);
    addComponent(this.world, eid, Speed);
    addComponent(this.world, eid, Ghost);
    addComponent(this.world, eid, GhostKind);
    addComponent(this.world, eid, GhostPhase);
    addComponent(this.world, eid, Drawable);

    Position.x[eid] = cellCenterX(tile.col);
    Position.y[eid] = cellCenterY(tile.row);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Input.direction[eid] = facing;
    Facing.direction[eid] = facing;
    Speed.px[eid] = 0;
    GhostKind.kind[eid] = kind;
    GhostPhase.value[eid] = GHOST_PHASE.active;
    Ghost.decidedCol[eid] = Number.NaN;
    Ghost.decidedRow[eid] = Number.NaN;
    Drawable.id[eid] = GHOST_DRAWABLE_BY_KIND[kind];
    Drawable.radius[eid] = ghostRadius();
    return eid;
  }
}
