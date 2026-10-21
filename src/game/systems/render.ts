import { hasComponent, query, type World } from "bitecs";
import Phaser from "phaser";
import {
  actorDisplaySize,
  cellCenterX,
  cellCenterY,
  cellOriginX,
  cellOriginY,
  getActiveLayout,
  isSolid,
  playerDisplaySize,
  pelletDisplaySize,
  powerPelletDisplaySize,
  wallPathCommands,
  worldToCol,
  worldToRow,
  wrappedTwinPosition,
  type WallPathCommand,
} from "../../domain/maze";
import {
  RUBBLE_TONE,
  rubbleElapsedMs,
  rubbleIntroSettled,
  rubbleMotePosition,
  rubblePalette,
  type CollapseRenderState,
} from "../../domain/collapseRubble";
import { lavaSignedDistancePx, type LavaRenderState } from "../../domain/lavaZone";
import {
  SPEED_ZONE_MAX_COUNT,
  speedZoneGlowMask,
  speedZoneParticles,
  type SpeedZone,
} from "../../domain/speedZones";
import type { TimedTunnelRenderState } from "../../domain/timedTunnel";
import {
  CHAFF_ALPHA,
  CHAFF_BODY_TINT,
  CHAFF_VISOR_TINT,
  type ChaffSprite,
} from "../../domain/chaff";
import { droppedWallLook, type DroppedWall } from "../../domain/wallDrop";
import {
  PROGRAMMER_EMPTY_SLOT_TILES,
  programmerArrowPoints,
  type ProgrammerQueueSlot,
} from "../../domain/programmer";
import { invertRgb24 } from "../../domain/bossRules";
import { clampMazeColorIndex } from "../../domain/mazeColorSettings";
import { pixelWallRects, WALL_ART_PX } from "../../domain/pixelWall";
import { sidebarBandRects } from "../../domain/sidebarBands";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfieldBounds";
import { sameWallStyle, wallStyleFor, type WallStyle } from "../../domain/wallStyle";
import {
  advanceDotManChomp,
  DOTMAN_CHOMP_PIXELS_PER_FRAME,
  dotManChompPixelsPerFrame,
  dotManVisorLift,
} from "../../domain/dotManMouth";
import {
  headingAngle,
  stepHeading,
  visorPose,
  type HeadingStep,
  type VisorPose,
} from "../../domain/dotManHeading";
import { MIRROR_ALPHA, MIRROR_TINT, mirrorDust, mirrorPopLook } from "../../domain/mirror";
import { padTextureWithGutter, renderScaleOf } from "../renderScale";
import { crispWorldPx, snapToDevicePx } from "../../domain/pixelArt";
import { loadMazeColorSettings } from "../storage/mazeColorStorage";
import {
  BLINKY_DRAWABLE_ID,
  BOSS_PELLET_DRAWABLE_ID,
  CLYDE_DRAWABLE_ID,
  SPUNKY_DRAWABLE_ID,
  WARDY_DRAWABLE_ID,
  INKY_DRAWABLE_ID,
  isActorDrawableId,
  PELLET_DRAWABLE_ID,
  PINKY_DRAWABLE_ID,
  PLAYER_DRAWABLE_ID,
  POWER_PELLET_DRAWABLE_ID,
  SLOT_MACHINE_DRAWABLE_ID,
} from "../../domain/playfield";
import { expiryTintOn } from "../../domain/expiryBlink";
import { turnFlashPulse } from "../../domain/turnTuning";
import {
  brightenColor,
  PLAYER_PROGRAMMING_TINT,
  playerTint,
  tintedColor,
  type PlayerTint,
} from "../../domain/playerTint";
import { lightningPoints, type ChainPoint, type ChainSegment } from "../../domain/bossChain";
import { pelletTint } from "../../domain/lazyLooper";
import {
  FRUIT_KINDS,
  fruitArtPath,
  fruitDrawableId,
  fruitFlickerAlpha,
  isFruitDrawableId,
} from "../../domain/fruit";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { reviveSplashLook } from "../../domain/reviveSplash";
import {
  HAUNT_CAGE_ALPHA,
  HAUNT_CAGE_COLOR,
  HAUNT_CAGE_LINE_PX,
  hauntCageLines,
  hauntCageVisible,
} from "../../domain/hauntCage";
import { ghostHornRects, stepGhostHornTurn, type HornTurnState } from "../../domain/ghostHorns";
import {
  GHOST_ART_SIZE_PX,
  GHOST_PUPIL_COLOR,
  ghostPupilLookOffset,
  ghostPupilLookToward,
  ghostPupilRects,
  ghostPupilsVisible,
  stepGhostPupilLook,
  type PupilLook,
  type PupilLookState,
} from "../../domain/ghostPupils";
import { GHOST_DIR, type GhostDir } from "../../domain/ghostPath";
import {
  advanceGhostSkirtPhase,
  ghostSkirtTravelPx,
  GHOST_SKIRT_BODY_ART_ROWS,
  GHOST_SKIRT_SAMPLE_ART,
  ghostSkirtRects,
  multiplyTint,
  nextSkirtWaveSign,
} from "../../domain/ghostSkirt";
import { showsFrightenedLook, type FrightenedGhosts } from "../../domain/hunter";
import { SHIELD_COLOR, shieldCrackLook, shieldCrackProgress } from "../../domain/shieldCrack";
import {
  BUBBLE_SHIELD_MULTI_KEY,
  BUBBLE_SHIELD_MULTI_PATH,
  BUBBLE_SHIELD_SINGLE_KEY,
  BUBBLE_SHIELD_SINGLE_PATH,
  bubbleShieldCrackHalfPose,
  bubbleShieldCracksAfterDrop,
  bubbleShieldDisplaySize,
  bubbleShieldTextureKey,
  type BubbleShieldCrack,
} from "../../domain/bubbleShield";
import {
  DEFAULT_CHARM_TUNING,
  charmLookFrom,
  tailLayoutFrom,
  type CharmTuning,
} from "../../domain/charmTailParams";
import { schoolArtPath, schoolArtTextureKey } from "../../domain/schoolArt";
import { resizeTail, stepTail, type TailBead } from "../../domain/charmTail";
import { UPGRADE_SCHOOL_ORDER, type HauntedGhost } from "../../domain/upgrades";
import type { WarpGlideSprite } from "../../domain/warpGlide";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { GhostPhase } from "../components/GhostPhase";
import { OptionalPellet } from "../components/OptionalPellet";
import { DIRECTION, Input, type Direction } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export const PELLET_TEXTURE_KEY = "pellet-dot";
export const QUARTER_TEXTURE_KEY = "quarter";
const DOLLAR_TEXTURE_KEY = "dollar";
const PENNY_TEXTURE_KEY = "penny";
export const REVERSE_TEXTURE_KEY = "reverse";
const POWER_PELLET_TEXTURE_KEY = "power-pellet";
const BLINKY_TEXTURE_KEY = "ghost-blinky";
const PINKY_TEXTURE_KEY = "ghost-pinky";
const INKY_TEXTURE_KEY = "ghost-inky";
const CLYDE_TEXTURE_KEY = "ghost-clyde";
const SPUNKY_TEXTURE_KEY = "ghost-spunky";
const WARDY_TEXTURE_KEY = "ghost-wardy";
const FRIGHTENED_GHOST_TEXTURE_KEY = "ghost-frightened";
const GHOST_FROZEN_TINT = 0x7ec8ff;
export const GHOST_TEXTURE_BY_ID: Record<string, string> = {
  [BLINKY_DRAWABLE_ID]: BLINKY_TEXTURE_KEY,
  [PINKY_DRAWABLE_ID]: PINKY_TEXTURE_KEY,
  [INKY_DRAWABLE_ID]: INKY_TEXTURE_KEY,
  [CLYDE_DRAWABLE_ID]: CLYDE_TEXTURE_KEY,
  [SPUNKY_DRAWABLE_ID]: SPUNKY_TEXTURE_KEY,
  [WARDY_DRAWABLE_ID]: WARDY_TEXTURE_KEY,
};
const BOSS_PELLET_SIZE_MUL = 2;
const BOSS_PELLET_PULSE_SIZE_MUL = 3;
const BOSS_PELLET_PULSE_MS = 1000;
const BOSS_PELLET_MIN_ALPHA = 0.6;
export const DOTMAN_BODY_TEXTURE_KEY = "dotman-body";
export const DOTMAN_VISOR_TEXTURE_KEY = "dotman-visor";
const DOTMAN_ART_SIZE_PX = 16;
type PlayerVisual = {
  targetAngle: number;
  angle: number;
  lastNowMs: number;
  chompCarry: number;
  cycleIndex: number;
  lastX: number;
  lastY: number;
  tail: TailBead[];
  cracks: { x: number; y: number; startMs: number }[];
  bubbleShields: number;
  bubbleCracks: BubbleShieldCrack[];
};

function pelletTextureKey(drawableId: string): string {
  return drawableId === POWER_PELLET_DRAWABLE_ID ? POWER_PELLET_TEXTURE_KEY : PELLET_TEXTURE_KEY;
}

export function displaySizeForDrawable(drawableId: string): number {
  if (drawableId === PELLET_DRAWABLE_ID) {
    return pelletDisplaySize();
  }
  if (drawableId === POWER_PELLET_DRAWABLE_ID) {
    return powerPelletDisplaySize();
  }
  if (drawableId === BOSS_PELLET_DRAWABLE_ID) {
    return pelletDisplaySize() * BOSS_PELLET_SIZE_MUL;
  }
  return isActorDrawableId(drawableId) ? actorDisplaySize() : playerDisplaySize();
}

function applyPlayerTint(go: Phaser.GameObjects.Image, tint: PlayerTint | null): void {
  if (tint === null) {
    go.clearTint();
    return;
  }
  go.setTint(tint.color);
  go.setTintMode(tint.mode === "add" ? Phaser.TintModes.ADD : Phaser.TintModes.MULTIPLY);
}

function bossPelletPulse(nowMs: number): { size: number; alpha: number } {
  const wave = (Math.sin((2 * Math.PI * nowMs) / BOSS_PELLET_PULSE_MS) + 1) / 2;
  const sizeMul = BOSS_PELLET_SIZE_MUL + (BOSS_PELLET_PULSE_SIZE_MUL - BOSS_PELLET_SIZE_MUL) * wave;
  return {
    size: pelletDisplaySize() * sizeMul,
    alpha: 1 - (1 - BOSS_PELLET_MIN_ALPHA) * wave,
  };
}

export function strokeWallPath(
  graphics: Phaser.GameObjects.Graphics,
  commands: readonly WallPathCommand[],
  style: WallStyle,
  scale: number,
): void {
  graphics.clear();
  graphics.fillStyle(style.color, 1);
  for (const rect of pixelWallRects(commands, style.thickness)) {
    graphics.fillRect(rect.x * scale, rect.y * scale, rect.w * scale, rect.h * scale);
  }
}

export function textureKeyForDrawable(drawableId: string): string {
  if (drawableId === PLAYER_DRAWABLE_ID) {
    return DOTMAN_BODY_TEXTURE_KEY;
  }
  const ghostTexture = GHOST_TEXTURE_BY_ID[drawableId];
  if (ghostTexture !== undefined) {
    return ghostTexture;
  }
  if (isFruitDrawableId(drawableId)) {
    return drawableId;
  }
  if (drawableId === SLOT_MACHINE_DRAWABLE_ID) {
    return SLOT_MACHINE_DRAWABLE_ID;
  }
  return pelletTextureKey(drawableId);
}

export function storedWallStyle(): WallStyle {
  return wallStyleFor(null, clampMazeColorIndex(loadMazeColorSettings().colorIndex));
}

function facingToGhostDir(facing: Direction): GhostDir {
  switch (facing) {
    case DIRECTION.up:
      return GHOST_DIR.up;
    case DIRECTION.down:
      return GHOST_DIR.down;
    case DIRECTION.left:
      return GHOST_DIR.left;
    case DIRECTION.right:
      return GHOST_DIR.right;
    default:
      return GHOST_DIR.none;
  }
}

function fillGhostPupils(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  displaySize: number,
  look: PupilLook,
  alpha = 1,
): void {
  graphics.fillStyle(GHOST_PUPIL_COLOR, alpha);
  for (const rect of ghostPupilRects(cx, cy, displaySize, look)) {
    graphics.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
}

function fillGhostHorns(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  displaySize: number,
  lean: number,
  lift: number,
  color: number,
): void {
  graphics.clear();
  graphics.fillStyle(color, 1);
  for (const rect of ghostHornRects(cx, cy, displaySize, lean, lift)) {
    graphics.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
}

function skirtBaseColor(scene: Phaser.Scene, textureKey: string): number {
  return (
    scene.textures.getPixel(GHOST_SKIRT_SAMPLE_ART.x, GHOST_SKIRT_SAMPLE_ART.y, textureKey)
      ?.color ?? 0xffffff
  );
}

function fillGhostSkirt(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  displaySize: number,
  phase: number,
  color: number,
): void {
  graphics.clear();
  graphics.fillStyle(color, 1);
  for (const rect of ghostSkirtRects(cx, cy, displaySize, phase)) {
    graphics.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
}

/**
 * Hide the baked skirt with a crop. Phaser crop does not change size, so keep a
 * uniform size×size box centered on the ghost — sizing to the crop height alone
 * scales against the full frame and leaves a gap above the runtime skirt.
 */
function placeCroppedGhostBody(
  image: Phaser.GameObjects.Image,
  cx: number,
  cy: number,
  size: number,
): void {
  image.setCrop(0, 0, GHOST_ART_SIZE_PX, GHOST_SKIRT_BODY_ART_ROWS);
  image.setDisplaySize(size, size);
  image.setPosition(cx, cy);
}

/**
 * Ghost overlays are Graphics drawn on the body's art grid, so snap the ghost's center and size
 * to the device grid up front instead of leaving it to the pixel-art pass.
 */
function crispGhost(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): { x: number; y: number; size: number } {
  const scale = renderScaleOf(scene);
  return {
    x: snapToDevicePx(x, scale),
    y: snapToDevicePx(y, scale),
    size: crispWorldPx(size, GHOST_ART_SIZE_PX, scale),
  };
}

export function addGhostIcon(
  scene: Phaser.Scene,
  drawableId: string,
  x: number,
  y: number,
  size: number,
): void {
  const textureKey = GHOST_TEXTURE_BY_ID[drawableId]!;
  const crisp = crispGhost(scene, x, y, size);
  const image = scene.add.image(crisp.x, crisp.y, textureKey);
  placeCroppedGhostBody(image, crisp.x, crisp.y, crisp.size);
  const skirt = scene.add.graphics();
  const color = skirtBaseColor(scene, textureKey);
  fillGhostSkirt(skirt, crisp.x, crisp.y, crisp.size, 0, color);
  if (drawableId === BLINKY_DRAWABLE_ID) {
    fillGhostHorns(scene.add.graphics(), crisp.x, crisp.y, crisp.size, 0, 0, color);
  }
  if (ghostPupilsVisible({ inFrightenedSet: false, drawKind: "primary" })) {
    const pupils = scene.add.graphics();
    fillGhostPupils(pupils, crisp.x, crisp.y, crisp.size, ghostPupilLookOffset(GHOST_DIR.none));
  }
}

export type GhostSpriteHandle = {
  container: Phaser.GameObjects.Container;
  setPosition(x: number, y: number): void;
  setDepth(depth: number): void;
  destroy(): void;
  setSkirtPhase(phase: number): void;
  setLook(look: GhostLook): void;
};

export type GhostLook = "normal" | "frightened" | "frozen";

export function addGhostSprite(
  scene: Phaser.Scene,
  drawableId: string,
  x: number,
  y: number,
  size: number,
  look: PupilLook = ghostPupilLookOffset(GHOST_DIR.none),
): GhostSpriteHandle {
  const textureKey = GHOST_TEXTURE_BY_ID[drawableId]!;
  const crisp = crispGhost(scene, x, y, size);
  const image = scene.add.image(0, 0, textureKey);
  placeCroppedGhostBody(image, 0, 0, crisp.size);
  const skirt = scene.add.graphics();
  const baseColor = skirtBaseColor(scene, textureKey);
  let color = baseColor;
  let skirtPhase = 0;
  fillGhostSkirt(skirt, 0, 0, crisp.size, skirtPhase, color);
  const container = scene.add.container(crisp.x, crisp.y, [image, skirt]);
  let horns: Phaser.GameObjects.Graphics | null = null;
  if (drawableId === BLINKY_DRAWABLE_ID) {
    horns = scene.add.graphics();
    fillGhostHorns(horns, 0, 0, crisp.size, 0, 0, color);
    container.add(horns);
  }
  let pupils: Phaser.GameObjects.Graphics | null = null;
  if (ghostPupilsVisible({ inFrightenedSet: false, drawKind: "primary" })) {
    pupils = scene.add.graphics();
    fillGhostPupils(pupils, 0, 0, crisp.size, look);
    container.add(pupils);
  }
  return {
    container,
    setPosition(nx, ny) {
      const at = crispGhost(scene, nx, ny, crisp.size);
      container.setPosition(at.x, at.y);
    },
    setDepth(depth) {
      container.setDepth(depth);
    },
    destroy() {
      container.destroy();
    },
    setSkirtPhase(phase) {
      skirtPhase = phase;
      fillGhostSkirt(skirt, 0, 0, crisp.size, skirtPhase, color);
    },
    setLook(next) {
      const frightened = next === "frightened";
      image.setTexture(frightened ? FRIGHTENED_GHOST_TEXTURE_KEY : textureKey);
      if (next === "frozen") {
        image.setTint(GHOST_FROZEN_TINT);
      } else {
        image.clearTint();
      }
      const bodyColor = frightened
        ? skirtBaseColor(scene, FRIGHTENED_GHOST_TEXTURE_KEY)
        : baseColor;
      color =
        next === "frozen"
          ? tintedColor(bodyColor, { color: GHOST_FROZEN_TINT, mode: "multiply" })
          : bodyColor;
      fillGhostSkirt(skirt, 0, 0, crisp.size, skirtPhase, color);
      horns?.setVisible(!frightened);
      pupils?.setVisible(!frightened);
    },
  };
}

export function addDotManIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Container {
  return scene.add.container(x, y, [
    scene.add.image(0, 0, DOTMAN_BODY_TEXTURE_KEY).setDisplaySize(size, size),
    scene.add.image(0, 0, DOTMAN_VISOR_TEXTURE_KEY).setDisplaySize(size, size),
  ]);
}

export function addQuarterIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, QUARTER_TEXTURE_KEY).setDisplaySize(size, size);
}

export function addPennyIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, PENNY_TEXTURE_KEY).setDisplaySize(size, size);
}

export function addDollarIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, DOLLAR_TEXTURE_KEY).setDisplaySize(size, size);
}

export function addReverseIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, REVERSE_TEXTURE_KEY).setDisplaySize(size, size);
}

export function preloadPlayArt(scene: Phaser.Scene): void {
  scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, (key: string, type: string) => {
    if (type === "image") {
      padTextureWithGutter(scene.textures, key);
    }
  });
  scene.load.image(DOTMAN_BODY_TEXTURE_KEY, "art/dot-man/body.png");
  scene.load.image(DOTMAN_VISOR_TEXTURE_KEY, "art/dot-man/visor.png");
  scene.load.image(BUBBLE_SHIELD_SINGLE_KEY, BUBBLE_SHIELD_SINGLE_PATH);
  scene.load.image(BUBBLE_SHIELD_MULTI_KEY, BUBBLE_SHIELD_MULTI_PATH);
  scene.load.image(PELLET_TEXTURE_KEY, "art/other/dot.png");
  scene.load.image(QUARTER_TEXTURE_KEY, "art/other/quarter.png");
  scene.load.image(DOLLAR_TEXTURE_KEY, "art/other/dollar.png");
  scene.load.image(PENNY_TEXTURE_KEY, "art/other/penny.png");
  scene.load.image(REVERSE_TEXTURE_KEY, "art/other/reverse.png");
  scene.load.image(POWER_PELLET_TEXTURE_KEY, "art/other/power-pellet.png");
  scene.load.image(SLOT_MACHINE_DRAWABLE_ID, "art/other/slot-machine.png");
  scene.load.image(BLINKY_TEXTURE_KEY, "art/ghosts/blinky.png");
  scene.load.image(PINKY_TEXTURE_KEY, "art/ghosts/pinky.png");
  scene.load.image(INKY_TEXTURE_KEY, "art/ghosts/inky.png");
  scene.load.image(CLYDE_TEXTURE_KEY, "art/ghosts/clyde.png");
  scene.load.image(SPUNKY_TEXTURE_KEY, "art/ghosts/spunky.png");
  scene.load.image(WARDY_TEXTURE_KEY, "art/ghosts/wardy.png");
  scene.load.image(FRIGHTENED_GHOST_TEXTURE_KEY, "art/ghosts/blue_ghost.png");
  for (const kind of FRUIT_KINDS) {
    scene.load.image(fruitDrawableId(kind), fruitArtPath(kind));
  }
  for (const school of UPGRADE_SCHOOL_ORDER) {
    scene.load.image(schoolArtTextureKey(school), schoolArtPath(school));
  }
}

function facingToStep(facing: Direction): HeadingStep | null {
  switch (facing) {
    case DIRECTION.up:
      return "up";
    case DIRECTION.down:
      return "down";
    case DIRECTION.left:
      return "left";
    case DIRECTION.right:
      return "right";
    case DIRECTION.upLeft:
    case DIRECTION.downLeft:
      return "left";
    case DIRECTION.upRight:
    case DIRECTION.downRight:
      return "right";
    default:
      return null;
  }
}

function ensurePlayerVisual(
  playerVisuals: Map<number, PlayerVisual>,
  eid: number,
  x: number,
  y: number,
  nowMs: number,
): PlayerVisual {
  let visual = playerVisuals.get(eid);
  if (!visual) {
    visual = {
      targetAngle: 0,
      angle: 0,
      lastNowMs: nowMs,
      chompCarry: 0,
      cycleIndex: 0,
      lastX: x,
      lastY: y,
      tail: [],
      cracks: [],
      bubbleShields: 0,
      bubbleCracks: [],
    };
    playerVisuals.set(eid, visual);
  }
  return visual;
}

export type RenderOptions = {
  frozenGhostEid?: number | null;
  frozenGhostRemainingMs?: number;
  playerInvulnRemainingMs?: number;
  fruitRemainingMs?: number;
  wallPassActive?: boolean;
  wallPassLoopActive?: boolean;
  turnFlashRemainingMs?: number;
  dimGhostEid?: number | null;
  playerAlpha?: number;
  entityAlpha?: number;
  wallAlpha?: number;
  mazeColorInverted?: boolean;
  playerReviveProgress?: number;
  playerWarpGlide?: WarpGlideSprite[];
  playerSpeedTrail?: WarpGlideSprite[];
  ghostWarpGlides?: Record<number, WarpGlideSprite[]>;
  spriteOffsets?: Record<number, { x: number; y: number }>;
  hauntedGhost?: HauntedGhost | null;
  frightenedGhosts?: FrightenedGhosts | null;
  bossChains?: ChainSegment[];
  timedTunnel?: TimedTunnelRenderState | null;
  lava?: LavaRenderState | null;
  collapse?: CollapseRenderState | null;
  speedZones?: readonly SpeedZone[];
  droppedWall?: DroppedWall | null;
  chaff?: ChaffSprite[];
  pupilTarget?: { eids: number[]; x: number; y: number } | null;
  shields?: number;
  programmerQueue?: ProgrammerQueueSlot[] | null;
  mirror?: { x: number; y: number; facing: number } | null;
  mirrorPop?: { x: number; y: number; progress: number } | null;
};

const CHARM_DEPTH = -0.5;
const CHARM_CHAIN_COLOR = 0xd9d9d9;
const CHARM_CHAIN_ALPHA = 0.8;
const CHARM_SPEED_FULL_PX_PER_MS = 0.08;
const BUBBLE_SHIELD_DEPTH = 0.5;
const SIDEBAR_DEPTH = -3;

const POWER_PELLET_BOUNCE_MUL = 1.5;
const POWER_PELLET_BOUNCE_MS = 150;

export type PlayRender = {
  draw: (world: World, opts?: RenderOptions) => void;
  releaseDrawable: (eid: number) => void;
  resetForNewBoard: () => void;
  bouncePowerPellet: (eid: number) => void;
  setWallStyle: (style: WallStyle | null) => void;
  setDotManLook: (look: { chompSpeed: number }) => void;
  setCharmTuning: (tuning: CharmTuning) => void;
  playerSpriteRotation: () => number | null;
};

const DIM_GHOST_ALPHA = 0.4;
const HAUNT_CAGE_DEPTH = 1;
const PROGRAMMER_QUEUE_DEPTH = 10;
const SPEED_TRAIL_DEPTH = -1;
const LAVA_DEPTH = -1.25;
const LAVA_PX = 2;
const LAVA_FLICKER_MS = 90;
const LAVA_PALETTE = [0x5c0a00, 0x9e1800, 0xd83a00, 0xff6a00, 0xffa21f, 0xffd84a];
const LAVA_HOT_COLOR = 0xfff2b0;
const LAVA_BED_COLORS = [0x2a1612, 0x3b2a26, 0x55301e, 0x4a1a0e];
const LAVA_BED_FLASH_COLORS = [0x3b2a26, 0x55301e, 0x8a2008, 0xc23a0a, 0xff6a00];
const SPEED_ZONE_DEPTH = -2;
const SPEED_ZONE_PARTICLE_DEPTH = -1.5;
const SPEED_ZONE_COLOR = 0x3fa9ff;
const SPEED_ZONE_FILL_ALPHA = 0.5;
const SPEED_ZONE_GLOW_PEAK_ALPHA = 0.6;
const SPEED_ZONE_GLOW_REACH_TILES = 0.7;
const SPEED_ZONE_PARTICLE_COLOR = 0xd8f2ff;
const SPEED_ZONE_TEXTURE_KEYS = Array.from(
  { length: SPEED_ZONE_MAX_COUNT },
  (_, i) => `speed-zone-glow-${i}`,
);
const CHAIN_AMPLITUDE_TILES = 0.25;
const CHAIN_STROKES = [
  { strand: 0, width: 7, color: 0x3fa9ff, alpha: 0.25 },
  { strand: 0, width: 2.5, color: 0x9fe0ff, alpha: 0.95 },
  { strand: 1, width: 1, color: 0xffffff, alpha: 0.9 },
] as const;

function lavaHash(a: number, b: number, c: number): number {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function lavaPixelColor(lava: LavaRenderState, px: number, py: number, frame: number): number {
  const d = lavaSignedDistancePx(lava.zone, lava.reachTiles, px + LAVA_PX / 2, py + LAVA_PX / 2);
  if (d === null || d <= 0) {
    const ember = lava.phase === "emerging" && d !== null && d > -3 * LAVA_PX;
    if (ember && lavaHash(px, py, frame) > 0.8) {
      return LAVA_PALETTE[4]!;
    }
    const bed = lava.flashOn ? LAVA_BED_FLASH_COLORS : LAVA_BED_COLORS;
    return bed[Math.floor(lavaHash(px, py, 7) * bed.length)]!;
  }
  if (d < LAVA_PX && lava.phase === "emerging") {
    return LAVA_HOT_COLOR;
  }
  if (d < LAVA_PX && lava.phase === "retracting") {
    return LAVA_BED_COLORS[0]!;
  }
  const flame = lavaHash(px, py + frame * LAVA_PX, frame >> 2);
  if (lava.phase === "full" && flame > 0.97) {
    return LAVA_HOT_COLOR;
  }
  const blob = lavaHash(px >> 3, py >> 3, frame >> 3);
  const heatShift = lava.phase === "retracting" ? 2 : 0;
  const shade = Math.floor((0.65 * flame + 0.35 * blob) * LAVA_PALETTE.length) + 1 - heatShift;
  return LAVA_PALETTE[Math.max(0, Math.min(LAVA_PALETTE.length - 1, shade))]!;
}

function drawLava(
  graphics: Phaser.GameObjects.Graphics,
  lava: LavaRenderState,
  nowMs: number,
): void {
  const { tileSize } = getActiveLayout();
  const frame = Math.floor(nowMs / LAVA_FLICKER_MS);
  for (const cell of lava.zone.cells) {
    const x0 = cellOriginX(cell.col);
    const y0 = cellOriginY(cell.row);
    for (let py = y0; py < y0 + tileSize; py += LAVA_PX) {
      for (let px = x0; px < x0 + tileSize; px += LAVA_PX) {
        graphics.fillStyle(lavaPixelColor(lava, px, py, frame), 1);
        graphics.fillRect(px, py, LAVA_PX, LAVA_PX);
      }
    }
  }
}

function addSpeedZoneGlow(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  zone: SpeedZone,
  textureKey: string,
): void {
  const { tileSize } = getActiveLayout();
  const reachPx = Math.round(tileSize * SPEED_ZONE_GLOW_REACH_TILES);
  const mask = speedZoneGlowMask(zone, {
    tileSize,
    reachPx,
    fillAlpha: SPEED_ZONE_FILL_ALPHA,
    glowPeakAlpha: SPEED_ZONE_GLOW_PEAK_ALPHA,
  });
  const texture = scene.textures.createCanvas(textureKey, mask.width, mask.height);
  if (texture === null) {
    return;
  }
  const ctx = texture.getContext();
  const image = ctx.createImageData(mask.width, mask.height);
  mask.alpha.forEach((alpha, i) => {
    image.data[i * 4] = (SPEED_ZONE_COLOR >> 16) & 0xff;
    image.data[i * 4 + 1] = (SPEED_ZONE_COLOR >> 8) & 0xff;
    image.data[i * 4 + 2] = SPEED_ZONE_COLOR & 0xff;
    image.data[i * 4 + 3] = Math.round(alpha * 255);
  });
  ctx.putImageData(image, 0, 0);
  texture.refresh();
  const glow = scene.add.image(
    cellOriginX(zone.col) - reachPx,
    cellOriginY(zone.row) - reachPx,
    textureKey,
  );
  glow.setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD);
  container.add(glow);
}

function drawSpeedZoneParticles(
  graphics: Phaser.GameObjects.Graphics,
  zone: SpeedZone,
  nowMs: number,
): void {
  const { tileSize } = getActiveLayout();
  const originX = cellOriginX(0);
  const originY = cellOriginY(0);
  for (const particle of speedZoneParticles(zone, nowMs)) {
    graphics.fillStyle(SPEED_ZONE_PARTICLE_COLOR, particle.alpha);
    const size = particle.size < 1 ? 2 : 3;
    const x = originX + particle.col * tileSize - size / 2;
    const y = originY + particle.row * tileSize - size / 2;
    graphics.fillRect(x, y, size, size);
  }
}

function strokePolyline(graphics: Phaser.GameObjects.Graphics, points: readonly ChainPoint[]) {
  graphics.beginPath();
  graphics.moveTo(points[0]!.x, points[0]!.y);
  for (const point of points.slice(1)) {
    graphics.lineTo(point.x, point.y);
  }
  graphics.strokePath();
}

type GhostSkirt = {
  graphics: Phaser.GameObjects.Graphics;
  pupils: Phaser.GameObjects.Graphics;
  horns: Phaser.GameObjects.Graphics;
  phase: number;
  lastX: number;
  lastY: number;
  waveSign: number;
};

export function createRender(scene: Phaser.Scene, sidebarBands = false): PlayRender {
  const drawableObjects = new Map<string, Phaser.GameObjects.Image>();
  const playerVisuals = new Map<number, PlayerVisual>();
  const pupilLooks = new Map<number, PupilLookState>();
  const hornTurns = new Map<number, HornTurnState>();
  const ghostSkirts = new Map<number, GhostSkirt>();
  const sidebarGraphics = sidebarBands ? scene.add.graphics() : null;
  sidebarGraphics?.setDepth(SIDEBAR_DEPTH);
  let drawnSidebarKey: string | null = null;
  const wallGraphics = scene.add.graphics();
  const collapseGraphics = scene.add.graphics();
  const collapseMoteGraphics = scene.add.graphics();
  const chainGraphics = scene.add.graphics();
  const tailGraphics = scene.add.graphics();
  tailGraphics.setDepth(CHARM_DEPTH);
  const mirrorDustGraphics = scene.add.graphics();
  let mirrorAngle = 0;
  const cageGraphics = scene.add.graphics();
  cageGraphics.setDepth(HAUNT_CAGE_DEPTH);
  const timedTunnelGraphics = scene.add.graphics();
  timedTunnelGraphics.setDepth(HAUNT_CAGE_DEPTH);
  const speedZoneLayer = scene.add.container(0, 0);
  speedZoneLayer.setDepth(SPEED_ZONE_DEPTH);
  const speedZoneParticleGraphics = scene.add.graphics();
  speedZoneParticleGraphics.setDepth(SPEED_ZONE_PARTICLE_DEPTH);
  let drawnSpeedZones: readonly SpeedZone[] | null = null;
  const clearSpeedZones = (): void => {
    speedZoneLayer.removeAll(true);
    speedZoneParticleGraphics.clear();
    for (const key of SPEED_ZONE_TEXTURE_KEYS) {
      if (scene.textures.exists(key)) {
        scene.textures.remove(key);
      }
    }
  };
  const droppedWallGraphics = scene.add.graphics();
  droppedWallGraphics.setDepth(HAUNT_CAGE_DEPTH);
  const lavaGraphics = scene.add.graphics();
  lavaGraphics.setDepth(LAVA_DEPTH);
  const programmerGraphics = scene.add.graphics();
  programmerGraphics.setDepth(PROGRAMMER_QUEUE_DEPTH);
  let drawnWallStyle: WallStyle | null = null;
  let drawnCollapse: string | null = null;
  let collapseMotesSettled = false;
  let drawnMazeInverted = false;
  let drawnWallAlpha = 1;
  let wallStyleOverride: WallStyle | null = null;
  let chompPixelsPerFrame = DOTMAN_CHOMP_PIXELS_PER_FRAME;
  let charmLayout = tailLayoutFrom(DEFAULT_CHARM_TUNING);
  let charmLook = charmLookFrom(DEFAULT_CHARM_TUNING);
  let bossPelletTint = 0xffffff;

  const destroyImage = (key: string): void => {
    const go = drawableObjects.get(key);
    if (go) {
      scene.tweens.killTweensOf(go);
      go.destroy();
      drawableObjects.delete(key);
    }
  };

  const destroySkirt = (eid: number): void => {
    const skirt = ghostSkirts.get(eid);
    skirt?.graphics.destroy();
    skirt?.pupils.destroy();
    skirt?.horns.destroy();
    ghostSkirts.delete(eid);
    hornTurns.delete(eid);
  };

  const drawCollapse = (collapse: CollapseRenderState | null, style: WallStyle): void => {
    if (collapse === null) {
      if (drawnCollapse !== null) {
        collapseGraphics.clear();
        collapseMoteGraphics.clear();
        drawnCollapse = null;
      }
      return;
    }
    const palette = rubblePalette(style.color, style.background);
    const origin = { x: cellOriginX(0), y: cellOriginY(0) };
    const key = `${collapse.key}:${style.color}:${style.background}`;
    const changed = key !== drawnCollapse;
    if (changed) {
      collapseGraphics.clear();
      for (const art of collapse.arts) {
        for (const pixel of art.pixels) {
          collapseGraphics.fillStyle(palette[pixel.tone]!, 1);
          collapseGraphics.fillRect(
            origin.x + pixel.x * WALL_ART_PX,
            origin.y + pixel.y * WALL_ART_PX,
            WALL_ART_PX,
            WALL_ART_PX,
          );
        }
      }
      drawnCollapse = key;
    }
    const settled = rubbleIntroSettled(collapse);
    if (!changed && settled && collapseMotesSettled) {
      return;
    }
    collapseMoteGraphics.clear();
    collapseMoteGraphics.fillStyle(palette[RUBBLE_TONE.light]!, 1);
    for (const art of collapse.arts) {
      const elapsed = rubbleElapsedMs(art, collapse.introMs);
      for (const mote of art.motes) {
        const at = rubbleMotePosition(mote, elapsed);
        collapseMoteGraphics.fillRect(
          origin.x + at.x * WALL_ART_PX,
          origin.y + at.y * WALL_ART_PX,
          WALL_ART_PX,
          WALL_ART_PX,
        );
      }
    }
    collapseMotesSettled = settled;
  };

  const releaseDrawable = (eid: number): void => {
    destroySkirt(eid);
    destroyImage(String(eid));
    destroyImage(`${eid}:twin`);
    destroyImage(`${eid}:visor`);
    destroyImage(`${eid}:twin:visor`);
    playerVisuals.delete(eid);
  };

  const paintSidebarBands = (mazeBackground: number): void => {
    if (sidebarGraphics === null) {
      return;
    }
    const layout = getActiveLayout();
    const key = `${mazeBackground}:${layout.offsetX}:${layout.pixelWidth}`;
    if (key === drawnSidebarKey) {
      return;
    }
    sidebarGraphics.clear();
    for (const rect of sidebarBandRects({
      playfieldWidth: PLAYFIELD_WIDTH,
      playfieldHeight: PLAYFIELD_HEIGHT,
      mazeOffsetX: layout.offsetX,
      mazePixelWidth: layout.pixelWidth,
      mazeBackground,
    })) {
      sidebarGraphics.fillStyle(rect.color, 1);
      sidebarGraphics.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    drawnSidebarKey = key;
  };

  const resetForNewBoard = (): void => {
    for (const go of drawableObjects.values()) {
      scene.tweens.killTweensOf(go);
      go.destroy();
    }
    drawableObjects.clear();
    for (const eid of [...ghostSkirts.keys()]) {
      destroySkirt(eid);
    }
    playerVisuals.clear();
    pupilLooks.clear();
    hornTurns.clear();
    sidebarGraphics?.clear();
    drawnSidebarKey = null;
    wallGraphics.clear();
    collapseGraphics.clear();
    collapseMoteGraphics.clear();
    drawnCollapse = null;
    wallGraphics.setAlpha(1);
    chainGraphics.setAlpha(1);
    drawnWallStyle = null;
    drawnMazeInverted = false;
    drawnWallAlpha = 1;
    clearSpeedZones();
    drawnSpeedZones = null;
  };

  const bouncePowerPellet = (eid: number): void => {
    const go = drawableObjects.get(String(eid));
    if (!go) {
      return;
    }
    const base = powerPelletDisplaySize();
    go.setTexture(POWER_PELLET_TEXTURE_KEY);
    go.setName(POWER_PELLET_DRAWABLE_ID);
    go.setDisplaySize(base, base);
    scene.tweens.killTweensOf(go);
    scene.tweens.add({
      targets: go,
      displayWidth: base * POWER_PELLET_BOUNCE_MUL,
      displayHeight: base * POWER_PELLET_BOUNCE_MUL,
      duration: POWER_PELLET_BOUNCE_MS,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  };

  const draw = (world: World, opts?: RenderOptions): void => {
    const frozenEid = opts?.frozenGhostEid ?? null;
    const dimGhostEid = opts?.dimGhostEid ?? null;
    const entityAlpha = opts?.entityAlpha ?? 1;
    const playerAlphaOpt = opts?.playerAlpha;
    const playerAlpha = (playerAlphaOpt ?? 1) * entityAlpha;
    const reviveProgress = opts?.playerReviveProgress;
    const warpGlide = opts?.playerWarpGlide;
    const speedTrail = opts?.playerSpeedTrail;
    const ghostWarpGlides = opts?.ghostWarpGlides;
    const frightenedEids = new Set(opts?.frightenedGhosts?.eids ?? []);
    const wallPassOn = opts?.wallPassActive === true;
    const wallPassLoopOn = opts?.wallPassLoopActive === true;
    const twinSolids = wallPassLoopOn ? getActiveLayout().wallPassLoopPlayerSolids : undefined;
    const timedTunnel = opts?.timedTunnel ?? null;
    const blockTunnelRow =
      !wallPassLoopOn && timedTunnel?.phase === "closed" ? timedTunnel.row : null;
    const turnFlash = turnFlashPulse(opts?.turnFlashRemainingMs ?? 0);
    const playerTintNow = playerTint({
      wallPassOn,
      programmingOn: (opts?.programmerQueue ?? null) !== null,
      invulnRemainingMs: opts?.playerInvulnRemainingMs ?? 0,
      nowMs: scene.time.now,
      flashBrighten: turnFlash.brighten,
    });
    const frozenTintOn = expiryTintOn(opts?.frozenGhostRemainingMs ?? 0, scene.time.now);
    const baseWallStyle = wallStyleOverride ?? storedWallStyle();
    const mazeInverted = opts?.mazeColorInverted === true;
    const wallStyle = mazeInverted
      ? { ...baseWallStyle, color: invertRgb24(baseWallStyle.color) }
      : baseWallStyle;
    if (!sameWallStyle(wallStyle, drawnWallStyle) || mazeInverted !== drawnMazeInverted) {
      bossPelletTint = brightenColor(wallStyle.color, 0.5);
      const commands = wallPathCommands(undefined, undefined, wallStyle.cornerRadius);
      strokeWallPath(wallGraphics, commands, wallStyle, 1);
      if (wallStyleOverride !== null || sidebarBands) {
        scene.cameras.main.setBackgroundColor(baseWallStyle.background);
      }
      drawnWallStyle = wallStyle;
      drawnMazeInverted = mazeInverted;
    }
    paintSidebarBands(baseWallStyle.background);
    const wallAlpha = opts?.wallAlpha ?? 1;
    if (wallAlpha !== drawnWallAlpha) {
      wallGraphics.setAlpha(wallAlpha);
      drawnWallAlpha = wallAlpha;
    }

    const alive = new Set<string>();
    tailGraphics.clear();
    const drawGlideTrail = (
      eid: number,
      id: string,
      glide: readonly WarpGlideSprite[],
      textureKey: string,
      size: number,
      applyTint: (go: Phaser.GameObjects.Image) => void,
      tag = "glide",
      depth = 0,
      decorate?: (trailKey: string) => void,
    ): void => {
      for (let i = 0; i < glide.length; i += 1) {
        const trail = glide[i]!;
        const trailKey = `${eid}:${tag}${i}`;
        alive.add(trailKey);
        let trailGo = drawableObjects.get(trailKey);
        if (!trailGo) {
          trailGo = scene.add.image(trail.x, trail.y, textureKey);
          trailGo.setName(`${id}:${tag}`);
          trailGo.setDepth(depth);
          drawableObjects.set(trailKey, trailGo);
        }
        trailGo.setTexture(textureKey);
        trailGo.setDisplaySize(size, size);
        trailGo.setPosition(trail.x, trail.y);
        trailGo.setAlpha(trail.alpha * entityAlpha);
        applyTint(trailGo);
        decorate?.(trailKey);
      }
    };
    const drawTail = (
      body: Phaser.GameObjects.Image,
      visual: PlayerVisual,
      shields: number,
      anchor: { x: number; y: number },
      speedFactor: number,
      dtMs: number,
    ): void => {
      const layout = charmLayout;
      const size = charmLook.sizePx;
      const now = scene.time.now;
      const pose = { x: anchor.x, y: anchor.y, heading: visual.angle };
      const blocked = (x: number, y: number): boolean => isSolid(worldToCol(x), worldToRow(y));
      if (visual.tail.length !== shields) {
        const resized = resizeTail(visual.tail, shields, pose, layout, blocked);
        visual.tail = resized.beads;
        for (const bead of resized.dropped) {
          visual.cracks.push({ x: bead.x, y: bead.y, startMs: now });
        }
      }
      visual.tail = stepTail(visual.tail, pose, layout, {
        dtMs,
        nowMs: now,
        motion: speedFactor,
        blocked,
      });
      const alpha = body.alpha;
      const hookX = anchor.x - Math.cos(visual.angle) * layout.anchorBackPx;
      const hookY = anchor.y - Math.sin(visual.angle) * layout.anchorBackPx;
      tailGraphics.lineStyle(
        Math.max(1, Math.round(body.displayWidth / DOTMAN_ART_SIZE_PX)),
        CHARM_CHAIN_COLOR,
        CHARM_CHAIN_ALPHA * alpha,
      );
      tailGraphics.beginPath();
      tailGraphics.moveTo(hookX, hookY);
      for (const bead of visual.tail) {
        tailGraphics.lineTo(bead.x, bead.y);
      }
      tailGraphics.strokePath();
      tailGraphics.fillStyle(SHIELD_COLOR, charmLook.baseAlpha * alpha);
      for (const bead of visual.tail) {
        tailGraphics.fillRect(bead.x - size / 2, bead.y - size / 2, size, size);
      }
      visual.cracks = visual.cracks.filter((crack) => shieldCrackProgress(now - crack.startMs) < 1);
      for (const crack of visual.cracks) {
        const look = shieldCrackLook(shieldCrackProgress(now - crack.startMs));
        tailGraphics.fillStyle(SHIELD_COLOR, charmLook.baseAlpha * alpha * look.alpha);
        for (const side of [-1, 1]) {
          tailGraphics.save();
          tailGraphics.translateCanvas(
            crack.x + side * (size / 4 + look.offsetX),
            crack.y + look.dropY,
          );
          tailGraphics.rotateCanvas(side * look.rotation);
          tailGraphics.fillRect(-size / 4, -size / 2, size / 2, size);
          tailGraphics.restore();
        }
      }
    };
    const placeBubbleImage = (
      key: string,
      name: string,
      textureKey: string,
      x: number,
      y: number,
      displayWidth: number,
      displayHeight: number,
      alpha: number,
      rotation: number,
      crop: { x: number; y: number; w: number; h: number } | null,
    ): void => {
      alive.add(key);
      let image = drawableObjects.get(key);
      if (!image) {
        image = scene.add.image(x, y, textureKey);
        image.setName(name);
        image.setDepth(BUBBLE_SHIELD_DEPTH);
        drawableObjects.set(key, image);
      }
      if (image.texture.key !== textureKey) {
        image.setTexture(textureKey);
      }
      if (crop === null) {
        image.setCrop();
      } else {
        image.setCrop(crop.x, crop.y, crop.w, crop.h);
      }
      image.setPosition(x, y);
      image.setDisplaySize(displayWidth, displayHeight);
      image.setRotation(rotation);
      image.setAlpha(alpha);
    };
    const drawBubbleShield = (
      bodyKey: string,
      body: Phaser.GameObjects.Image,
      visual: PlayerVisual,
      shields: number,
      at: { x: number; y: number },
      playerSize: number,
      trackBreaks: boolean,
    ): void => {
      const now = scene.time.now;
      const bubbleSize = bubbleShieldDisplaySize(playerSize);
      if (trackBreaks) {
        visual.bubbleCracks = bubbleShieldCracksAfterDrop(
          visual.bubbleShields,
          shields,
          at,
          now,
          visual.bubbleCracks,
        );
        visual.bubbleShields = shields;
      }
      const textureKey = bubbleShieldTextureKey(shields);
      if (textureKey !== null) {
        placeBubbleImage(
          `${bodyKey}:bubble`,
          `${body.name}:bubble`,
          textureKey,
          at.x,
          at.y,
          bubbleSize,
          bubbleSize,
          body.alpha,
          0,
          null,
        );
      }
      if (!trackBreaks) {
        return;
      }
      for (let i = 0; i < visual.bubbleCracks.length; i += 1) {
        const crack = visual.bubbleCracks[i]!;
        const progress = shieldCrackProgress(now - crack.startMs);
        for (const side of [-1, 1] as const) {
          const half = bubbleShieldCrackHalfPose(crack, side, bubbleSize, progress);
          placeBubbleImage(
            `${bodyKey}:bubble-crack:${i}:${side}`,
            `${body.name}:bubble-crack`,
            crack.textureKey,
            half.x,
            half.y,
            half.displayWidth,
            half.displayHeight,
            body.alpha * half.alpha,
            half.rotation,
            { x: half.cropX, y: half.cropY, w: half.cropW, h: half.cropH },
          );
        }
      }
    };
    const drawVisor = (
      bodyKey: string,
      pose: VisorPose,
      liftArtPx: number,
      untinted = false,
    ): void => {
      const body = drawableObjects.get(bodyKey);
      if (!body) {
        return;
      }
      const visorKey = `${bodyKey}:visor`;
      alive.add(visorKey);
      let visor = drawableObjects.get(visorKey);
      if (!visor) {
        visor = scene.add.image(body.x, body.y, DOTMAN_VISOR_TEXTURE_KEY);
        visor.setName(`${body.name}:visor`);
        drawableObjects.set(visorKey, visor);
      }
      const liftPx = (liftArtPx * body.displayWidth) / DOTMAN_ART_SIZE_PX;
      visor.setPosition(
        body.x + Math.sin(pose.rotation) * liftPx,
        body.y - Math.cos(pose.rotation) * liftPx,
      );
      visor.setDisplaySize(body.displayWidth, body.displayHeight);
      visor.setRotation(pose.rotation);
      visor.setFlipX(pose.flipX);
      visor.setDepth(body.depth);
      visor.setAlpha(body.alpha);
      if (untinted) {
        visor.clearTint();
      } else {
        applyPlayerTint(visor, playerTintNow);
      }
    };
    for (const eid of query(world, [Position, Drawable])) {
      const id = Drawable.id[eid] ?? "unknown";
      const ghostTexture = GHOST_TEXTURE_BY_ID[id];
      if (
        id !== PLAYER_DRAWABLE_ID &&
        id !== PELLET_DRAWABLE_ID &&
        id !== POWER_PELLET_DRAWABLE_ID &&
        id !== BOSS_PELLET_DRAWABLE_ID &&
        id !== SLOT_MACHINE_DRAWABLE_ID &&
        !isFruitDrawableId(id) &&
        ghostTexture === undefined
      ) {
        continue;
      }

      const primaryKey = String(eid);
      const twinKey = `${eid}:twin`;
      alive.add(primaryKey);

      const glide =
        id === PLAYER_DRAWABLE_ID
          ? warpGlide
          : ghostTexture !== undefined
            ? ghostWarpGlides?.[eid]
            : undefined;
      const glideHead = glide?.[0];
      const offset = opts?.spriteOffsets?.[eid];
      const x = (glideHead?.x ?? Position.x[eid] ?? 0) + (offset?.x ?? 0);
      const y = (glideHead?.y ?? Position.y[eid] ?? 0) + (offset?.y ?? 0);
      const size = displaySizeForDrawable(id);
      const radius = Drawable.radius[eid] ?? size / 2;
      const ghostTint =
        ghostTexture !== undefined &&
        frozenTintOn &&
        eid === frozenEid &&
        (GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.inHouse
          ? GHOST_FROZEN_TINT
          : null;
      const ghostAlpha = dimGhostEid !== null && eid === dimGhostEid ? DIM_GHOST_ALPHA : 1;
      const frightenedLook =
        ghostTexture !== undefined &&
        (GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.inHouse &&
        showsFrightenedLook(opts?.frightenedGhosts, eid, scene.time.now);

      let go = drawableObjects.get(primaryKey);
      if (!go) {
        go = scene.add.image(x, y, textureKeyForDrawable(id));
        go.setDisplaySize(size, size);
        go.setName(id);
        drawableObjects.set(primaryKey, go);
        if (id === PLAYER_DRAWABLE_ID) {
          ensurePlayerVisual(playerVisuals, eid, x, y, scene.time.now);
        }
      }

      go.setPosition(x, y);

      if (id === PELLET_DRAWABLE_ID || id === POWER_PELLET_DRAWABLE_ID) {
        const tint = pelletTint(hasComponent(world, eid, OptionalPellet));
        if (tint === null) {
          go.clearTint();
        } else {
          go.setTint(tint);
        }
      }

      if (id === BOSS_PELLET_DRAWABLE_ID) {
        go.setTint(bossPelletTint);
        const pulse = bossPelletPulse(scene.time.now);
        go.setDisplaySize(pulse.size, pulse.size);
        go.setAlpha(pulse.alpha * entityAlpha);
      } else if (isFruitDrawableId(id)) {
        go.setAlpha(entityAlpha * fruitFlickerAlpha(opts?.fruitRemainingMs ?? 0, scene.time.now));
      } else if (id === PELLET_DRAWABLE_ID || id === POWER_PELLET_DRAWABLE_ID) {
        go.setAlpha(entityAlpha);
      }

      if (ghostTexture !== undefined) {
        const ghostKey = frightenedLook ? FRIGHTENED_GHOST_TEXTURE_KEY : ghostTexture;
        if (go.texture.key !== ghostKey) {
          go.setTexture(ghostKey);
        }
        const applyGhostTint = (target: Phaser.GameObjects.Image): void => {
          if (ghostTint === null) {
            target.clearTint();
          } else {
            target.setTint(ghostTint);
          }
        };
        applyGhostTint(go);
        const bodyAlpha = ghostAlpha * entityAlpha * (glideHead?.alpha ?? 1);
        go.setAlpha(bodyAlpha);
        const crisp = crispGhost(scene, x, y, size);
        placeCroppedGhostBody(go, crisp.x, crisp.y, crisp.size);
        let skirt = ghostSkirts.get(eid);
        if (skirt === undefined) {
          skirt = {
            graphics: scene.add.graphics(),
            pupils: scene.add.graphics(),
            horns: scene.add.graphics(),
            phase: 0,
            lastX: x,
            lastY: y,
            waveSign: 1,
          };
          ghostSkirts.set(eid, skirt);
        }
        skirt.waveSign = nextSkirtWaveSign(
          facingToGhostDir(Input.direction[eid] ?? DIRECTION.none),
          skirt.waveSign,
        );
        skirt.phase = advanceGhostSkirtPhase(
          skirt.phase,
          ghostSkirtTravelPx(x - skirt.lastX, y - skirt.lastY, size, skirt.waveSign),
          size,
        );
        skirt.lastX = x;
        skirt.lastY = y;
        skirt.graphics.setAlpha(bodyAlpha);
        fillGhostSkirt(
          skirt.graphics,
          crisp.x,
          crisp.y,
          crisp.size,
          skirt.phase,
          multiplyTint(skirtBaseColor(scene, go.texture.key), ghostTint),
        );
        const hornsShown = id === BLINKY_DRAWABLE_ID && !frightenedLook && bodyAlpha > 0;
        const pupilsShown =
          bodyAlpha > 0 &&
          ghostPupilsVisible({
            inFrightenedSet: frightenedEids.has(eid),
            drawKind: "primary",
          });
        let look: PupilLook = ghostPupilLookOffset(GHOST_DIR.none);
        if (hornsShown || pupilsShown) {
          const pupilTarget = opts?.pupilTarget;
          if (pupilTarget?.eids.includes(eid)) {
            look = ghostPupilLookToward(pupilTarget.x - x, pupilTarget.y - y);
          } else {
            const stepped = stepGhostPupilLook(
              pupilLooks.get(eid),
              facingToGhostDir(Facing.direction[eid] ?? DIRECTION.none),
              scene.time.now,
            );
            pupilLooks.set(eid, stepped.state);
            look = stepped.look;
          }
        }
        skirt.horns.clear();
        if (hornsShown) {
          const turn = stepGhostHornTurn(
            hornTurns.get(eid),
            facingToGhostDir(Facing.direction[eid] ?? DIRECTION.none),
            scene.time.now,
          );
          hornTurns.set(eid, turn.state);
          skirt.horns.setAlpha(bodyAlpha);
          fillGhostHorns(
            skirt.horns,
            crisp.x,
            crisp.y,
            crisp.size,
            turn.lean,
            look.dy,
            multiplyTint(skirtBaseColor(scene, go.texture.key), ghostTint),
          );
        }
        skirt.pupils.clear();
        skirt.pupils.setAlpha(entityAlpha);
        if (pupilsShown) {
          fillGhostPupils(
            skirt.pupils,
            crisp.x,
            crisp.y,
            crisp.size,
            look,
            ghostAlpha * (glideHead?.alpha ?? 1),
          );
        }
        if (glide !== undefined) {
          drawGlideTrail(eid, id, glide.slice(1), go.texture.key, size, applyGhostTint);
        }
      }

      if (id === PLAYER_DRAWABLE_ID) {
        const visual = ensurePlayerVisual(playerVisuals, eid, x, y, scene.time.now);
        const facing = Facing.direction[eid] ?? DIRECTION.none;
        const movingStep = facingToStep(facing);
        if (movingStep) {
          visual.targetAngle = headingAngle(movingStep);
          const stepped = advanceDotManChomp(
            { carry: visual.chompCarry, cycleIndex: visual.cycleIndex },
            Math.hypot(x - visual.lastX, y - visual.lastY),
            chompPixelsPerFrame,
          );
          visual.chompCarry = stepped.carry;
          visual.cycleIndex = stepped.cycleIndex;
        }
        visual.angle = stepHeading(
          visual.angle,
          visual.targetAngle,
          scene.time.now - visual.lastNowMs,
        );
        visual.lastNowMs = scene.time.now;
        const pose = visorPose(visual.angle);
        const visorLift = dotManVisorLift(
          { carry: visual.chompCarry, cycleIndex: visual.cycleIndex },
          chompPixelsPerFrame,
        );
        const applyTintNow = (target: Phaser.GameObjects.Image): void =>
          applyPlayerTint(target, playerTintNow);
        const frameMoved = Math.hypot(x - visual.lastX, y - visual.lastY);
        const frameDt = Math.max(scene.game.loop.delta, 1);
        visual.lastX = x;
        visual.lastY = y;

        applyPlayerTint(go, playerTintNow);
        go.setDisplaySize(size * turnFlash.scale, size * turnFlash.scale);
        go.setAlpha((playerAlpha ?? 1) * turnFlash.alpha * (glideHead?.alpha ?? 1));
        if (reviveProgress !== undefined) {
          const look = reviveSplashLook(reviveProgress, size);
          go.setDisplaySize(look.size, look.size);
          go.setAlpha(look.alpha);
        }
        drawVisor(primaryKey, pose, visorLift);
        const shields = opts?.shields ?? 0;
        if (!charmLook.enabled) {
          drawBubbleShield(primaryKey, go, visual, shields, { x, y }, size, true);
        }
        drawTail(
          go,
          visual,
          charmLook.enabled ? shields : 0,
          { x, y },
          frameMoved / frameDt / CHARM_SPEED_FULL_PX_PER_MS,
          frameDt,
        );

        const trail =
          glide !== undefined
            ? { sprites: glide.slice(1), tag: "glide", depth: 0 }
            : speedTrail !== undefined && reviveProgress === undefined
              ? { sprites: speedTrail, tag: "speed", depth: SPEED_TRAIL_DEPTH }
              : null;
        if (trail !== null) {
          drawGlideTrail(
            eid,
            id,
            trail.sprites,
            DOTMAN_BODY_TEXTURE_KEY,
            size,
            applyTintNow,
            trail.tag,
            trail.depth,
            (trailKey) => drawVisor(trailKey, pose, visorLift),
          );
        }
        if (
          glide === undefined &&
          playerAlphaOpt === undefined &&
          reviveProgress === undefined &&
          hasComponent(world, eid, Player)
        ) {
          const twin = wrappedTwinPosition(x, y, radius, twinSolids, blockTunnelRow);
          if (twin) {
            alive.add(twinKey);
            let twinGo = drawableObjects.get(twinKey);
            if (!twinGo) {
              twinGo = scene.add.image(twin.x, twin.y, DOTMAN_BODY_TEXTURE_KEY);
              twinGo.setName(`${id}:twin`);
              drawableObjects.set(twinKey, twinGo);
            } else {
              twinGo.setPosition(twin.x, twin.y);
            }
            twinGo.setDisplaySize(size * turnFlash.scale, size * turnFlash.scale);
            applyTintNow(twinGo);
            drawVisor(twinKey, pose, visorLift);
            if (!charmLook.enabled) {
              drawBubbleShield(
                twinKey,
                twinGo,
                visual,
                opts?.shields ?? 0,
                { x: twin.x, y: twin.y },
                size,
                false,
              );
            }
          }
        }
      }
    }

    const drawMirror = (at: { x: number; y: number }, facing: number, alpha: number): void => {
      const step = facingToStep(facing as Direction);
      if (step !== null) {
        mirrorAngle = headingAngle(step);
      }
      const key = "mirror:body";
      alive.add(key);
      let body = drawableObjects.get(key);
      if (!body) {
        body = scene.add.image(at.x, at.y, DOTMAN_BODY_TEXTURE_KEY);
        body.setName("mirror");
        drawableObjects.set(key, body);
      }
      const size = displaySizeForDrawable(PLAYER_DRAWABLE_ID);
      body.setPosition(at.x, at.y);
      body.setDisplaySize(size, size);
      body.setAlpha(alpha * entityAlpha);
      body.setTint(MIRROR_TINT);
      body.setTintMode(Phaser.TintModes.FILL);
      drawVisor(key, visorPose(mirrorAngle), 0, true);
    };
    const mirror = opts?.mirror ?? null;
    const mirrorPop = opts?.mirrorPop ?? null;
    mirrorDustGraphics.clear();
    if (mirror !== null) {
      drawMirror(mirror, mirror.facing, MIRROR_ALPHA);
    } else if (mirrorPop !== null) {
      const look = mirrorPopLook(mirrorPop.progress);
      if (look.bodyAlpha > 0) {
        drawMirror(mirrorPop, DIRECTION.none, look.bodyAlpha);
      }
      for (const mote of mirrorDust(look.dustProgress, getActiveLayout().tileSize)) {
        mirrorDustGraphics.fillStyle(MIRROR_TINT, mote.alpha * entityAlpha);
        mirrorDustGraphics.fillRect(
          mirrorPop.x + mote.dx - mote.size / 2,
          mirrorPop.y + mote.dy - mote.size / 2,
          mote.size,
          mote.size,
        );
      }
    }

    chainGraphics.clear();
    chainGraphics.setAlpha(entityAlpha);
    tailGraphics.setAlpha(entityAlpha);
    const chains = opts?.bossChains ?? [];
    if (chains.length > 0) {
      const amplitude = getActiveLayout().tileSize * CHAIN_AMPLITUDE_TILES;
      for (const chain of chains) {
        for (const stroke of CHAIN_STROKES) {
          chainGraphics.lineStyle(stroke.width, stroke.color, stroke.alpha);
          strokePolyline(
            chainGraphics,
            lightningPoints(chain, scene.time.now, amplitude, stroke.strand),
          );
        }
      }
    }

    cageGraphics.clear();
    const haunted = opts?.hauntedGhost ?? null;
    if (haunted !== null && hauntCageVisible(haunted.remainingMs, scene.time.now)) {
      const id = Drawable.id[haunted.eid] ?? "unknown";
      cageGraphics.lineStyle(HAUNT_CAGE_LINE_PX, HAUNT_CAGE_COLOR, HAUNT_CAGE_ALPHA);
      for (const line of hauntCageLines(
        Position.x[haunted.eid] ?? 0,
        Position.y[haunted.eid] ?? 0,
        displaySizeForDrawable(id),
      )) {
        cageGraphics.lineBetween(line.x1, line.y1, line.x2, line.y2);
      }
    }

    const speedZones = opts?.speedZones ?? [];
    if (speedZones !== drawnSpeedZones) {
      clearSpeedZones();
      speedZones.forEach((zone, i) =>
        addSpeedZoneGlow(scene, speedZoneLayer, zone, SPEED_ZONE_TEXTURE_KEYS[i]!),
      );
      drawnSpeedZones = speedZones;
    }
    speedZoneParticleGraphics.clear();
    for (const zone of speedZones) {
      drawSpeedZoneParticles(speedZoneParticleGraphics, zone, scene.time.now);
    }

    timedTunnelGraphics.clear();
    if (timedTunnel?.gateVisible === true) {
      const layout = getActiveLayout();
      const tile = layout.tileSize;
      const barW = Math.max(3, Math.round(tile * 0.35));
      const barH = Math.max(4, Math.round(tile * 0.85));
      const y = cellCenterY(timedTunnel.row) - barH / 2;
      timedTunnelGraphics.fillStyle(0xffcc33, 0.85);
      timedTunnelGraphics.fillRect(cellCenterX(0) - barW / 2, y, barW, barH);
      timedTunnelGraphics.fillRect(cellCenterX(layout.cols - 1) - barW / 2, y, barW, barH);
    }

    drawCollapse(opts?.collapse ?? null, wallStyle);

    lavaGraphics.clear();
    if (opts?.lava) {
      drawLava(lavaGraphics, opts.lava, scene.time.now);
    }

    droppedWallGraphics.clear();
    const droppedWall = opts?.droppedWall ?? null;
    if (droppedWall !== null) {
      const look = droppedWallLook(droppedWall, scene.time.now, wallStyle.cornerRadius);
      droppedWallGraphics.lineStyle(wallStyle.thickness, look.color, look.alpha);
      droppedWallGraphics.strokeRoundedRect(
        cellCenterX(droppedWall.col) - look.size / 2,
        cellCenterY(droppedWall.row) - look.size / 2,
        look.size,
        look.size,
        look.cornerRadius,
      );
    }

    for (const [index, decoy] of (opts?.chaff ?? []).entries()) {
      const alpha = !expiryTintOn(decoy.remainingMs, scene.time.now)
        ? CHAFF_ALPHA / 3
        : CHAFF_ALPHA;
      const size = actorDisplaySize();
      const heading = Math.atan2(decoy.dy, decoy.dx);
      const bodyKey = `chaff:${index}:body`;
      alive.add(bodyKey);
      let body = drawableObjects.get(bodyKey);
      if (!body) {
        body = scene.add.image(decoy.x, decoy.y, DOTMAN_BODY_TEXTURE_KEY);
        body.setName(bodyKey);
        drawableObjects.set(bodyKey, body);
      }
      body.setPosition(decoy.x, decoy.y);
      body.setDisplaySize(size, size);
      body.setDepth(HAUNT_CAGE_DEPTH);
      body.setAlpha(alpha);
      body.setTint(CHAFF_BODY_TINT);
      body.setTintMode(Phaser.TintModes.FILL);

      const visorKey = `chaff:${index}:visor`;
      alive.add(visorKey);
      let visor = drawableObjects.get(visorKey);
      if (!visor) {
        visor = scene.add.image(decoy.x, decoy.y, DOTMAN_VISOR_TEXTURE_KEY);
        visor.setName(visorKey);
        drawableObjects.set(visorKey, visor);
      }
      const pose = visorPose(heading);
      visor.setPosition(decoy.x, decoy.y);
      visor.setDisplaySize(size, size);
      visor.setRotation(pose.rotation);
      visor.setFlipX(pose.flipX);
      visor.setDepth(HAUNT_CAGE_DEPTH);
      visor.setAlpha(alpha);
      visor.setTint(CHAFF_VISOR_TINT);
      visor.setTintMode(Phaser.TintModes.FILL);
    }

    programmerGraphics.clear();
    const tilePx = getActiveLayout().tileSize;
    for (const slot of opts?.programmerQueue ?? []) {
      programmerGraphics.fillStyle(PLAYER_PROGRAMMING_TINT, 1);
      if (slot.dir === null) {
        programmerGraphics.fillCircle(slot.x, slot.y, tilePx * PROGRAMMER_EMPTY_SLOT_TILES);
      } else {
        const [a, b, c] = programmerArrowPoints(slot.x, slot.y, slot.dir, tilePx);
        programmerGraphics.fillTriangle(a!.x, a!.y, b!.x, b!.y, c!.x, c!.y);
      }
    }

    for (const [key, go] of drawableObjects) {
      if (!alive.has(key)) {
        if (!key.includes(":")) {
          destroySkirt(Number(key));
        }
        go.destroy();
        drawableObjects.delete(key);
        if (!key.includes(":")) {
          playerVisuals.delete(Number(key));
        }
      }
    }
  };

  const setWallStyle = (style: WallStyle | null): void => {
    wallStyleOverride = style;
  };

  const playerSpriteRotation = (): number | null => {
    const angle = playerVisuals.values().next().value?.angle;
    return angle === undefined ? null : Math.atan2(Math.sin(angle), Math.cos(angle));
  };

  const setCharmTuning = (tuning: CharmTuning): void => {
    charmLayout = tailLayoutFrom(tuning);
    charmLook = charmLookFrom(tuning);
  };

  const setDotManLook = (look: { chompSpeed: number }): void => {
    chompPixelsPerFrame = dotManChompPixelsPerFrame(look.chompSpeed);
  };

  return {
    draw,
    releaseDrawable,
    resetForNewBoard,
    bouncePowerPellet,
    setWallStyle,
    setDotManLook,
    setCharmTuning,
    playerSpriteRotation,
  };
}
