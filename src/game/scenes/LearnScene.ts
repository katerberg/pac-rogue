import { addComponent, addEntity, createWorld, query, removeEntity, type World } from "bitecs";
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
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
import type { GhostDir } from "../../domain/ghostPath";
import { GHOST_PHASE } from "../../domain/ghostPhase";
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
import { speedLevelMultiplier } from "../../domain/levelRules";
import {
  activateLayout,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
  playerSpawnCenter,
  TILE_SIZE,
  wallCellCenters,
  worldToCol,
  worldToRow,
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
} from "../../domain/playfield";
import {
  allSeenRecord,
  emptySeenRecord,
  parseLearnAllFlag,
  type SeenRecord,
} from "../../domain/seenRecord";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { Wall } from "../components/Wall";
import { loadSeenRecord } from "../storage/seenRecordStorage";
import { collectPellets } from "../systems/collectPellets";
import { findGhostEidByKind } from "../systems/corruptionGhost";
import { stepCorruption } from "../systems/corruptionStep";
import { ghostAi, ghostAiContext, resolveGhostTarget } from "../systems/ghostAi";
import { applyGhostSpeed } from "../systems/ghostSpeed";
import { movement } from "../systems/movement";
import { createPlayerInput } from "../systems/playerInput";
import { applyPlayerSpeed } from "../systems/playerSpeed";
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
const CORRUPTION_COLUMN_X = 610;
const CORRUPTION_ROW_START_Y = 170;
const CORRUPTION_ROW_GAP = 40;
const CORRUPTION_ROW_WIDTH = 185;
const CORRUPTION_SWATCH_SIZE = 12;
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

type GhostSlot = { kind: GhostKindId; frame: Phaser.GameObjects.Graphics; x: number };
type CorruptionRow = { id: CorruptionId; label: Phaser.GameObjects.BitmapText };

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
    this.seen = parseLearnAllFlag(new URLSearchParams(location.search))
      ? allSeenRecord()
      : loadSeenRecord();

    this.playRender = createRender(this);
    this.overlay = this.add.graphics().setDepth(OVERLAY_DEPTH);
    this.spawnWalls();
    this.spawnPlayer();

    const title = addPixelText(this, 0, 0, "LEARN", MENU_TITLE_FONT_SIZE);
    placePixelText(title, PLAYFIELD_WIDTH / 2, TITLE_Y, 0.5, 0.5);
    this.buildGhostSlots();
    this.buildCorruptionRows();
    this.buildBackButton();

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
    applyPlayerSpeed(this.world, levelSpeedMul);
    applyGhostSpeed(this.world, NO_ELROY_PELLETS, {
      ghostSpeedMul: levelSpeedMul,
      speedSurge:
        this.corruption.ghostKind !== null && isSpeedSurgeActive(this.corruption)
          ? { ghostKind: this.corruption.ghostKind, mul: SPEED_SURGE_MUL }
          : undefined,
    });
    movement(this.world, delta);

    const pelletsOnBoard = query(this.world, [Pellet]).length;
    const step = stepCorruption(this.world, this.corruption, delta, Math.max(1, pelletsOnBoard));
    this.corruption = step.corruption;
    this.hiddenGhostEid = step.hiddenGhostEid;
    this.flashGhostEid = step.flashGhostEid;
    this.spawnDroppedPellets(step.dropSpawnTiles);
    const { removedEids } = collectPellets(this.world, { solids: getActiveLayout().playerSolids });
    for (const eid of removedEids) {
      this.playRender.releaseDrawable(eid);
    }

    ghostAi(this.world, GHOST_AI_MODE.chase, NO_ELROY_PELLETS, {
      corruption: corruptionAiOption(this.corruption),
    });

    const type = this.corruption.type;
    this.playRender.draw(this.world, {
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
    defs.forEach((def, index) => {
      const y = CORRUPTION_ROW_START_Y + index * CORRUPTION_ROW_GAP;
      this.add.rectangle(
        CORRUPTION_COLUMN_X + CORRUPTION_SWATCH_SIZE / 2,
        y,
        CORRUPTION_SWATCH_SIZE,
        CORRUPTION_SWATCH_SIZE,
        OUTLINE_TINT_BY_CORRUPTION[def.id],
      );
      const label = addPixelText(this, 0, 0, def.label, UPGRADES_HUD_FONT_SIZE);
      placePixelText(label, CORRUPTION_COLUMN_X + CORRUPTION_SWATCH_SIZE + 6, y, 0, 0.5);
      const zone = this.add.zone(
        CORRUPTION_COLUMN_X + CORRUPTION_ROW_WIDTH / 2,
        y,
        CORRUPTION_ROW_WIDTH,
        CORRUPTION_ROW_GAP - 8,
      );
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => this.toggleCorruption(def.id));
      this.corruptionRows.push({ id: def.id, label });
    });
  }

  private refreshCorruptionRows(): void {
    for (const row of this.corruptionRows) {
      row.label.setTint(row.id === this.corruption.type ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
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
    this.clearPellets();

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
    this.clearPellets();
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

  private clearPellets(): void {
    for (const eid of query(this.world, [Pellet])) {
      this.playRender.releaseDrawable(eid);
      removeEntity(this.world, eid);
    }
  }

  private spawnDroppedPellets(tiles: readonly GhostTarget[]): void {
    const { playerSolids } = getActiveLayout();
    for (const tile of tiles) {
      if (!isWalkable(tile.col, tile.row, playerSolids)) {
        continue;
      }
      const x = cellCenterX(tile.col);
      const y = cellCenterY(tile.row);
      const occupied = query(this.world, [Pellet, Position]).some(
        (eid) => Position.x[eid] === x && Position.y[eid] === y,
      );
      if (occupied) {
        continue;
      }
      const eid = addEntity(this.world);
      addComponent(this.world, eid, Pellet);
      addComponent(this.world, eid, Position);
      addComponent(this.world, eid, Drawable);
      Position.x[eid] = x;
      Position.y[eid] = y;
      Drawable.id[eid] = PELLET_DRAWABLE_ID;
      Drawable.radius[eid] = PELLET_RADIUS;
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
