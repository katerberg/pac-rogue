import { hasComponent, query, type World } from "bitecs";
import Phaser from "phaser";
import {
  actorDisplaySize,
  cellCenterX,
  cellCenterY,
  cellOriginX,
  cellOriginY,
  getActiveLayout,
  playerDisplaySize,
  pelletDisplaySize,
  powerPelletDisplaySize,
  wallPathCommands,
  wrappedTwinPosition,
  type WallPathCommand,
} from "../../domain/maze";
import {
  LAVA_MAX_REACH_TILES,
  lavaRects,
  type LavaRect,
  type LavaRenderState,
} from "../../domain/lavaZone";
import {
  SPEED_ZONE_COUNT,
  speedZoneGlowMask,
  speedZoneParticles,
  type SpeedZone,
} from "../../domain/speedZones";
import type { TimedTunnelRenderState } from "../../domain/timedTunnel";
import { droppedWallLook, type DroppedWall } from "../../domain/wallDrop";
import { invertRgb24 } from "../../domain/bossRules";
import { clampMazeColorIndex } from "../../domain/mazeColorSettings";
import { pixelWallRects } from "../../domain/pixelWall";
import { sameWallStyle, wallStyleFor, type WallStyle } from "../../domain/wallStyle";
import {
  advanceDotManChomp,
  DOTMAN_CHOMP_PIXEL_FRAMES,
  DOTMAN_CHOMP_PIXELS_PER_FRAME,
  dotManChompPixelsPerFrame,
} from "../../domain/dotManMouth";
import { headingAngle, stepHeading, type HeadingStep } from "../../domain/dotManHeading";
import { padTextureWithGutter } from "../renderScale";
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
} from "../../domain/playfield";
import { expiryTintOn } from "../../domain/expiryBlink";
import { turnFlashPulse } from "../../domain/turnTuning";
import { brightenColor, playerTint, type PlayerTint } from "../../domain/playerTint";
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
import { schoolArtPath, schoolArtTextureKey } from "../../domain/schoolArt";
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
const OPEN_MOUTH_FRAME = DOTMAN_CHOMP_PIXEL_FRAMES[0];
type PlayerVisual = {
  targetAngle: number;
  angle: number;
  lastNowMs: number;
  chompCarry: number;
  cycleIndex: number;
  lastX: number;
  lastY: number;
  textureKey: string;
};

function pacmanTextureKey(frame: number): string {
  return `pacman-${frame}`;
}

function isActorTextureKey(key: string): boolean {
  return key.startsWith("pacman-") || key.startsWith("ghost-");
}

export const PLAYER_OPEN_MOUTH_TEXTURE_KEY = pacmanTextureKey(OPEN_MOUTH_FRAME);

function pelletTextureKey(drawableId: string): string {
  return drawableId === POWER_PELLET_DRAWABLE_ID ? POWER_PELLET_TEXTURE_KEY : PELLET_TEXTURE_KEY;
}

function displaySizeForDrawable(drawableId: string): number {
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

function strokeWallPath(
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

function textureKeyForDrawable(drawableId: string): string {
  if (drawableId === PLAYER_DRAWABLE_ID) {
    return PLAYER_OPEN_MOUTH_TEXTURE_KEY;
  }
  const ghostTexture = GHOST_TEXTURE_BY_ID[drawableId];
  if (ghostTexture !== undefined) {
    return ghostTexture;
  }
  if (isFruitDrawableId(drawableId)) {
    return drawableId;
  }
  return pelletTextureKey(drawableId);
}

function storedWallStyle(): WallStyle {
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

export function addGhostIcon(
  scene: Phaser.Scene,
  drawableId: string,
  x: number,
  y: number,
  size: number,
): void {
  const textureKey = GHOST_TEXTURE_BY_ID[drawableId]!;
  const image = scene.add.image(x, y, textureKey);
  placeCroppedGhostBody(image, x, y, size);
  const skirt = scene.add.graphics();
  fillGhostSkirt(skirt, x, y, size, 0, skirtBaseColor(scene, textureKey));
  if (ghostPupilsVisible({ inFrightenedSet: false, drawKind: "primary" })) {
    const pupils = scene.add.graphics();
    fillGhostPupils(pupils, x, y, size, ghostPupilLookOffset(GHOST_DIR.none));
  }
}

export type GhostSpriteHandle = {
  container: Phaser.GameObjects.Container;
  setPosition(x: number, y: number): void;
  setDepth(depth: number): void;
  destroy(): void;
  setSkirtPhase(phase: number): void;
};

export function addGhostSprite(
  scene: Phaser.Scene,
  drawableId: string,
  x: number,
  y: number,
  size: number,
  look: PupilLook = ghostPupilLookOffset(GHOST_DIR.none),
): GhostSpriteHandle {
  const textureKey = GHOST_TEXTURE_BY_ID[drawableId]!;
  const image = scene.add.image(0, 0, textureKey);
  placeCroppedGhostBody(image, 0, 0, size);
  const skirt = scene.add.graphics();
  const color = skirtBaseColor(scene, textureKey);
  fillGhostSkirt(skirt, 0, 0, size, 0, color);
  const container = scene.add.container(x, y, [image, skirt]);
  if (ghostPupilsVisible({ inFrightenedSet: false, drawKind: "primary" })) {
    const pupils = scene.add.graphics();
    fillGhostPupils(pupils, 0, 0, size, look);
    container.add(pupils);
  }
  return {
    container,
    setPosition(nx, ny) {
      container.setPosition(nx, ny);
    },
    setDepth(depth) {
      container.setDepth(depth);
    },
    destroy() {
      container.destroy();
    },
    setSkirtPhase(phase) {
      fillGhostSkirt(skirt, 0, 0, size, phase, color);
    },
  };
}

export function addDotManIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, PLAYER_OPEN_MOUTH_TEXTURE_KEY).setDisplaySize(size, size);
}

export function addQuarterIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, QUARTER_TEXTURE_KEY).setDisplaySize(size, size);
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
      padTextureWithGutter(scene.textures, key, isActorTextureKey(key));
    }
  });
  for (const frame of [1, 2, 3] as const) {
    scene.load.image(pacmanTextureKey(frame), `art/pacman/${frame}.png`);
  }
  scene.load.image(PELLET_TEXTURE_KEY, "art/other/dot.png");
  scene.load.image(QUARTER_TEXTURE_KEY, "art/other/quarter.png");
  scene.load.image(REVERSE_TEXTURE_KEY, "art/other/reverse.png");
  scene.load.image(POWER_PELLET_TEXTURE_KEY, "art/other/power-pellet.png");
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
    const path = schoolArtPath(school);
    if (path !== null) {
      scene.load.image(schoolArtTextureKey(school), path);
    }
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
      textureKey: PLAYER_OPEN_MOUTH_TEXTURE_KEY,
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
  hauntedGhost?: HauntedGhost | null;
  frightenedGhosts?: FrightenedGhosts | null;
  bossChains?: ChainSegment[];
  timedTunnel?: TimedTunnelRenderState | null;
  lava?: LavaRenderState | null;
  speedZones?: readonly SpeedZone[];
  droppedWall?: DroppedWall | null;
  pupilTarget?: { eids: number[]; x: number; y: number } | null;
};

const POWER_PELLET_BOUNCE_MUL = 1.5;
const POWER_PELLET_BOUNCE_MS = 150;

export type PlayRender = {
  draw: (world: World, opts?: RenderOptions) => void;
  releaseDrawable: (eid: number) => void;
  resetForNewBoard: () => void;
  bouncePowerPellet: (eid: number) => void;
  setWallStyle: (style: WallStyle | null) => void;
  setDotManLook: (look: { chompSpeed: number }) => void;
  playerSpriteRotation: () => number | null;
};

const DIM_GHOST_ALPHA = 0.4;
const HAUNT_CAGE_DEPTH = 1;
const SPEED_TRAIL_DEPTH = -1;
const LAVA_DEPTH = -1.25;
const LAVA_PX = 2;
const LAVA_FLICKER_MS = 90;
const LAVA_PALETTE = [0x5c0a00, 0x9e1800, 0xd83a00, 0xff6a00, 0xffa21f, 0xffd84a];
const LAVA_HOT_COLOR = 0xfff2b0;
const LAVA_CRUST_COLORS = [0x2a1612, 0x3b2a26, 0x55301e];
const LAVA_CRACK_DORMANT = 0x6e2410;
const LAVA_CRACK_WARN = 0x9a2a10;
const LAVA_CRACK_FLASH = 0xffb030;
const LAVA_EMBER_COUNT = 4;
const SPEED_ZONE_DEPTH = -2;
const SPEED_ZONE_PARTICLE_DEPTH = -1.5;
const SPEED_ZONE_COLOR = 0x3fa9ff;
const SPEED_ZONE_FILL_ALPHA = 0.5;
const SPEED_ZONE_GLOW_PEAK_ALPHA = 0.6;
const SPEED_ZONE_GLOW_REACH_TILES = 0.7;
const SPEED_ZONE_PARTICLE_COLOR = 0xd8f2ff;
const SPEED_ZONE_TEXTURE_KEYS = Array.from(
  { length: SPEED_ZONE_COUNT },
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

function fillLavaPixels(
  graphics: Phaser.GameObjects.Graphics,
  rect: LavaRect,
  colorAt: (px: number, py: number) => number | null,
): void {
  const x0 = Math.floor(rect.x / LAVA_PX) * LAVA_PX;
  const y0 = Math.floor(rect.y / LAVA_PX) * LAVA_PX;
  for (let py = y0; py < rect.y + rect.height; py += LAVA_PX) {
    for (let px = x0; px < rect.x + rect.width; px += LAVA_PX) {
      const color = colorAt(px, py);
      if (color === null) {
        continue;
      }
      const left = Math.max(px, rect.x);
      const top = Math.max(py, rect.y);
      const w = Math.min(px + LAVA_PX, rect.x + rect.width) - left;
      const h = Math.min(py + LAVA_PX, rect.y + rect.height) - top;
      if (w > 0 && h > 0) {
        graphics.fillStyle(color, 1);
        graphics.fillRect(left, top, w, h);
      }
    }
  }
}

function drawLavaCracks(
  graphics: Phaser.GameObjects.Graphics,
  lava: LavaRenderState,
  tileSize: number,
): void {
  const color = lava.cracksFlashOn
    ? LAVA_CRACK_FLASH
    : lava.phase === "warn"
      ? LAVA_CRACK_WARN
      : LAVA_CRACK_DORMANT;
  const axisStep = lava.zone.cells.find((c) => c.distance === 1) ?? { dx: 1, dy: 0 };
  for (const cell of lava.zone.cells) {
    const horizontal = (cell.distance === 0 ? axisStep.dx : cell.dx) !== 0;
    let offset = 0;
    for (let along = 0; along < tileSize; along += LAVA_PX) {
      offset += Math.round((lavaHash(cell.col, cell.row, along) - 0.5) * 2) * LAVA_PX;
      offset = Math.max(-2 * LAVA_PX, Math.min(2 * LAVA_PX, offset));
      const across = tileSize / 2 - LAVA_PX / 2 + offset;
      const x = cellOriginX(cell.col) + (horizontal ? along : across);
      const y = cellOriginY(cell.row) + (horizontal ? across : along);
      if (lava.cracksFlashOn) {
        graphics.fillStyle(LAVA_CRACK_FLASH, 0.3);
        graphics.fillRect(x - LAVA_PX, y - LAVA_PX, LAVA_PX * 3, LAVA_PX * 3);
      }
      graphics.fillStyle(color, 1);
      graphics.fillRect(x, y, LAVA_PX, LAVA_PX);
    }
  }
}

function drawLava(
  graphics: Phaser.GameObjects.Graphics,
  lava: LavaRenderState,
  nowMs: number,
): void {
  const { tileSize } = getActiveLayout();
  drawLavaCracks(graphics, lava, tileSize);
  const frame = Math.floor(nowMs / LAVA_FLICKER_MS);
  const retracting = lava.phase === "retracting";
  if (retracting) {
    for (const rect of lavaRects(lava.zone, LAVA_MAX_REACH_TILES)) {
      fillLavaPixels(graphics, rect, (px, py) => {
        const n = lavaHash(px, py, 7);
        return LAVA_CRUST_COLORS[Math.floor(n * LAVA_CRUST_COLORS.length)]!;
      });
    }
  }
  const heatShift = retracting ? 2 : 0;
  for (const rect of lavaRects(lava.zone, lava.reachTiles)) {
    const midX = rect.x + rect.width / 2;
    const midY = rect.y + rect.height / 2;
    fillLavaPixels(graphics, rect, (px, py) => {
      const across = rect.dx !== 0 ? Math.abs(py + 1 - midY) : Math.abs(px + 1 - midX);
      const centerHeat = 1 - (2 * across) / tileSize;
      const flame = lavaHash(px, py + frame * LAVA_PX, frame >> 2);
      if (lava.phase === "full" && flame > 0.97) {
        return LAVA_HOT_COLOR;
      }
      const shade = Math.floor((0.55 * flame + 0.45 * centerHeat) * LAVA_PALETTE.length);
      return LAVA_PALETTE[Math.max(0, Math.min(LAVA_PALETTE.length - 1, shade - heatShift))]!;
    });
    if (!rect.front || lava.phase === "full") {
      continue;
    }
    const edgeX = rect.dx > 0 ? rect.x + rect.width : rect.dx < 0 ? rect.x : midX;
    const edgeY = rect.dy > 0 ? rect.y + rect.height : rect.dy < 0 ? rect.y : midY;
    const band = {
      x: rect.dx !== 0 ? edgeX - (rect.dx > 0 ? LAVA_PX : 0) : rect.x,
      y: rect.dy !== 0 ? edgeY - (rect.dy > 0 ? LAVA_PX : 0) : rect.y,
      width: rect.dx !== 0 ? LAVA_PX : rect.width,
      height: rect.dy !== 0 ? LAVA_PX : rect.height,
    };
    graphics.fillStyle(retracting ? LAVA_CRUST_COLORS[0]! : LAVA_HOT_COLOR, 1);
    graphics.fillRect(band.x, band.y, band.width, band.height);
    if (lava.phase !== "emerging") {
      continue;
    }
    for (let i = 0; i < LAVA_EMBER_COUNT; i += 1) {
      const life = (frame + i * 3) % 12;
      const ahead = (1 + life) * LAVA_PX * 0.5;
      const spread = (lavaHash(i, frame - life, rect.dx * 3 + rect.dy) - 0.5) * tileSize * 0.8;
      const ex = rect.dx !== 0 ? edgeX + rect.dx * ahead : midX + spread;
      const ey = rect.dy !== 0 ? edgeY + rect.dy * ahead : midY + spread;
      graphics.fillStyle(LAVA_PALETTE[4]!, 1 - life / 12);
      graphics.fillRect(
        Math.floor(ex / LAVA_PX) * LAVA_PX,
        Math.floor(ey / LAVA_PX) * LAVA_PX,
        LAVA_PX,
        LAVA_PX,
      );
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
    const x = Math.round(originX + particle.col * tileSize - size / 2);
    const y = Math.round(originY + particle.row * tileSize - size / 2);
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
  phase: number;
  lastX: number;
  lastY: number;
  waveSign: number;
};

export function createRender(scene: Phaser.Scene): PlayRender {
  const drawableObjects = new Map<string, Phaser.GameObjects.Image>();
  const playerVisuals = new Map<number, PlayerVisual>();
  const pupilLooks = new Map<number, PupilLookState>();
  const ghostSkirts = new Map<number, GhostSkirt>();
  const wallGraphics = scene.add.graphics();
  const chainGraphics = scene.add.graphics();
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
  let drawnWallStyle: WallStyle | null = null;
  let drawnMazeInverted = false;
  let drawnWallAlpha = 1;
  let wallStyleOverride: WallStyle | null = null;
  let chompPixelsPerFrame = DOTMAN_CHOMP_PIXELS_PER_FRAME;
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
    ghostSkirts.delete(eid);
  };

  const releaseDrawable = (eid: number): void => {
    destroySkirt(eid);
    destroyImage(String(eid));
    destroyImage(`${eid}:twin`);
    playerVisuals.delete(eid);
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
    wallGraphics.clear();
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
      if (wallStyleOverride !== null) {
        scene.cameras.main.setBackgroundColor(wallStyle.background);
      }
      drawnWallStyle = wallStyle;
      drawnMazeInverted = mazeInverted;
    }
    const wallAlpha = opts?.wallAlpha ?? 1;
    if (wallAlpha !== drawnWallAlpha) {
      wallGraphics.setAlpha(wallAlpha);
      drawnWallAlpha = wallAlpha;
    }

    const alive = new Set<string>();
    const drawGlideTrail = (
      eid: number,
      id: string,
      glide: readonly WarpGlideSprite[],
      textureKey: string,
      size: number,
      applyTint: (go: Phaser.GameObjects.Image) => void,
      tag = "glide",
      depth = 0,
      rotation = 0,
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
        trailGo.setRotation(rotation);
        trailGo.setAlpha(trail.alpha * entityAlpha);
        applyTint(trailGo);
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
      const x = glideHead?.x ?? Position.x[eid] ?? 0;
      const y = glideHead?.y ?? Position.y[eid] ?? 0;
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
        placeCroppedGhostBody(go, x, y, size);
        let skirt = ghostSkirts.get(eid);
        if (skirt === undefined) {
          skirt = {
            graphics: scene.add.graphics(),
            pupils: scene.add.graphics(),
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
          x,
          y,
          size,
          skirt.phase,
          multiplyTint(skirtBaseColor(scene, go.texture.key), ghostTint),
        );
        skirt.pupils.clear();
        skirt.pupils.setAlpha(entityAlpha);
        if (
          bodyAlpha > 0 &&
          ghostPupilsVisible({
            inFrightenedSet: frightenedEids.has(eid),
            drawKind: "primary",
          })
        ) {
          const pupilTarget = opts?.pupilTarget;
          let look: PupilLook;
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
          fillGhostPupils(skirt.pupils, x, y, size, look, ghostAlpha * (glideHead?.alpha ?? 1));
        }
        if (glide !== undefined) {
          drawGlideTrail(eid, id, glide.slice(1), go.texture.key, size, applyGhostTint);
        }
      }

      if (id === PLAYER_DRAWABLE_ID) {
        const visual = ensurePlayerVisual(playerVisuals, eid, x, y, scene.time.now);
        const facing = Facing.direction[eid] ?? DIRECTION.none;
        const movingStep = facingToStep(facing);
        let nextKey: string;
        if (movingStep) {
          visual.targetAngle = headingAngle(movingStep);
          const stepped = advanceDotManChomp(
            { carry: visual.chompCarry, cycleIndex: visual.cycleIndex },
            Math.hypot(x - visual.lastX, y - visual.lastY),
            chompPixelsPerFrame,
          );
          visual.chompCarry = stepped.carry;
          visual.cycleIndex = stepped.cycleIndex;
          const frame =
            DOTMAN_CHOMP_PIXEL_FRAMES[visual.cycleIndex % DOTMAN_CHOMP_PIXEL_FRAMES.length] ??
            OPEN_MOUTH_FRAME;
          nextKey = pacmanTextureKey(frame);
        } else {
          nextKey = pacmanTextureKey(OPEN_MOUTH_FRAME);
        }
        visual.angle = stepHeading(
          visual.angle,
          visual.targetAngle,
          scene.time.now - visual.lastNowMs,
        );
        visual.lastNowMs = scene.time.now;
        go.setRotation(visual.angle);
        if (nextKey !== visual.textureKey) {
          go.setTexture(nextKey);
          go.setDisplaySize(size, size);
          visual.textureKey = nextKey;
        }
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

        if (glide !== undefined) {
          drawGlideTrail(
            eid,
            id,
            glide.slice(1),
            visual.textureKey,
            size,
            (target) => applyPlayerTint(target, playerTintNow),
            "glide",
            0,
            visual.angle,
          );
        } else if (speedTrail !== undefined && reviveProgress === undefined) {
          drawGlideTrail(
            eid,
            id,
            speedTrail,
            visual.textureKey,
            size,
            (target) => applyPlayerTint(target, playerTintNow),
            "speed",
            SPEED_TRAIL_DEPTH,
            visual.angle,
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
              twinGo = scene.add.image(twin.x, twin.y, visual.textureKey);
              twinGo.setDisplaySize(size, size);
              twinGo.setName(`${id}:twin`);
              drawableObjects.set(twinKey, twinGo);
            } else {
              twinGo.setPosition(twin.x, twin.y);
              if (twinGo.texture.key !== visual.textureKey) {
                twinGo.setTexture(visual.textureKey);
                twinGo.setDisplaySize(size, size);
              }
            }
            twinGo.setDisplaySize(size * turnFlash.scale, size * turnFlash.scale);
            twinGo.setRotation(visual.angle);
            applyPlayerTint(twinGo, playerTintNow);
          }
        }
      }
    }

    chainGraphics.clear();
    chainGraphics.setAlpha(entityAlpha);
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
    playerSpriteRotation,
  };
}
