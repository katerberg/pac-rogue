import { hasComponent, query, type World } from "bitecs";
import Phaser from "phaser";
import {
  getActiveLayout,
  playerDisplaySize,
  pelletDisplaySize,
  powerPelletDisplaySize,
  wallPathCommands,
  wrappedTwinPosition,
  type WallPathCommand,
} from "../../domain/maze";
import { clampMazeColorIndex } from "../../domain/mazeColorSettings";
import {
  sameWallStyle,
  wallGlowFilter,
  wallStyleFor,
  type WallStyle,
} from "../../domain/wallStyle";
import type { LineArt } from "../../domain/lineArt";
import { GHOST_LINE_ART } from "../art/ghostLineArt";
import {
  createLineArtObject,
  destroyLineArtObject,
  placeLineArtObject,
  restyleLineArtObject,
  type LineArtObject,
} from "./lineArtRender";
import { renderScaleOf } from "../renderScale";
import { loadMazeColorSettings } from "../storage/mazeColorStorage";
import {
  BLINKY_DRAWABLE_ID,
  BOSS_PELLET_DRAWABLE_ID,
  CLYDE_DRAWABLE_ID,
  FRUIT_DRAWABLE_ID,
  INKY_DRAWABLE_ID,
  PELLET_DRAWABLE_ID,
  PINKY_DRAWABLE_ID,
  PLAYER_DRAWABLE_ID,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH,
  POWER_PELLET_DRAWABLE_ID,
} from "../../domain/playfield";
import { expiryTintOn } from "../../domain/expiryBlink";
import { turnFlashPulse } from "../../domain/turnTuning";
import { brightenColor, playerTint, type PlayerTint } from "../../domain/playerTint";
import { lightningPoints, type ChainPoint, type ChainSegment } from "../../domain/bossChain";
import { pelletTint } from "../../domain/lazyLooper";
import { fruitArtPath, fruitSpecForLevel, CURRENT_LEVEL } from "../../domain/fruit";
import {
  ghostLineArtLook,
  sameGhostLineArtLook,
  type GhostLineArtLook,
  type GhostStyle,
} from "../../domain/ghostArt";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { DEFAULT_TUNING } from "../../domain/tuning";
import { reviveSplashLook } from "../../domain/reviveSplash";
import {
  HAUNT_CAGE_ALPHA,
  HAUNT_CAGE_COLOR,
  HAUNT_CAGE_LINE_PX,
  hauntCageLines,
  hauntCageVisible,
} from "../../domain/hauntCage";
import { showsFrightenedLook, type FrightenedGhosts } from "../../domain/hunter";
import type { HauntedGhost } from "../../domain/upgrades";
import type { WarpGlideSprite } from "../../domain/warpGlide";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { GhostPhase } from "../components/GhostPhase";
import { OptionalPellet } from "../components/OptionalPellet";
import { DIRECTION, type Direction } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export const PELLET_TEXTURE_KEY = "pellet-dot";
export const QUARTER_TEXTURE_KEY = "quarter";
const POWER_PELLET_TEXTURE_KEY = "power-pellet";
const BLINKY_TEXTURE_KEY = "ghost-blinky";
const PINKY_TEXTURE_KEY = "ghost-pinky";
const INKY_TEXTURE_KEY = "ghost-inky";
const CLYDE_TEXTURE_KEY = "ghost-clyde";
const FRIGHTENED_GHOST_TEXTURE_KEY = "ghost-frightened";
const FRUIT_TEXTURE_KEY = "bonus-fruit";
const GHOST_FROZEN_TINT = 0x7ec8ff;
export const GHOST_TEXTURE_BY_ID: Record<string, string> = {
  [BLINKY_DRAWABLE_ID]: BLINKY_TEXTURE_KEY,
  [PINKY_DRAWABLE_ID]: PINKY_TEXTURE_KEY,
  [INKY_DRAWABLE_ID]: INKY_TEXTURE_KEY,
  [CLYDE_DRAWABLE_ID]: CLYDE_TEXTURE_KEY,
};
const LINE_ART_BY_DRAWABLE_ID: Record<string, { art: LineArt; color: number }> = {
  [BLINKY_DRAWABLE_ID]: { art: GHOST_LINE_ART, color: 0xff5a5a },
  [PINKY_DRAWABLE_ID]: { art: GHOST_LINE_ART, color: 0xff9ce6 },
  [INKY_DRAWABLE_ID]: { art: GHOST_LINE_ART, color: 0x5ff2ff },
  [CLYDE_DRAWABLE_ID]: { art: GHOST_LINE_ART, color: 0xffb852 },
};
// Icy white: the pixel frozen tint (pale blue) would read as Inky's neon cyan.
const LINE_ART_FROZEN_COLOR = 0xe6f6ff;
const LINE_ART_FRIGHTENED_COLOR = 0x6f7bff;
const WALL_GLOW_QUALITY = 10;
const BOSS_PELLET_SIZE_MUL = 2;
const BOSS_PELLET_PULSE_SIZE_MUL = 3;
const BOSS_PELLET_PULSE_MS = 1000;
const BOSS_PELLET_MIN_ALPHA = 0.6;
const CHOMP_PIXELS_PER_FRAME = 12;
const CHOMP_CYCLE = [1, 2, 3, 2] as const;
const OPEN_MOUTH_FRAME = 1;
const PACMAN_DIRS = ["up", "down", "left", "right"] as const;

type PacmanDir = (typeof PACMAN_DIRS)[number];

type PlayerVisual = {
  lastDir: PacmanDir;
  chompCarry: number;
  cycleIndex: number;
  lastX: number;
  lastY: number;
  textureKey: string;
};

function pacmanTextureKey(dir: PacmanDir, frame: number): string {
  return `pacman-${dir}-${frame}`;
}

export const PLAYER_OPEN_MOUTH_TEXTURE_KEY = pacmanTextureKey("right", OPEN_MOUTH_FRAME);

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
  return playerDisplaySize();
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
  graphics.lineStyle(style.thickness * scale, style.color, 1);
  graphics.beginPath();
  for (const command of commands) {
    if (command.type === "move") {
      graphics.moveTo(command.x * scale, command.y * scale);
    } else {
      graphics.lineTo(command.x * scale, command.y * scale);
    }
  }
  graphics.strokePath();
}

function textureKeyForDrawable(drawableId: string): string {
  if (drawableId === PLAYER_DRAWABLE_ID) {
    return PLAYER_OPEN_MOUTH_TEXTURE_KEY;
  }
  const ghostTexture = GHOST_TEXTURE_BY_ID[drawableId];
  if (ghostTexture !== undefined) {
    return ghostTexture;
  }
  if (drawableId === FRUIT_DRAWABLE_ID) {
    return FRUIT_TEXTURE_KEY;
  }
  return pelletTextureKey(drawableId);
}

function storedWallStyle(): WallStyle {
  return wallStyleFor(null, clampMazeColorIndex(loadMazeColorSettings().colorIndex));
}

export function addGhostIcon(
  scene: Phaser.Scene,
  drawableId: string,
  x: number,
  y: number,
  size: number,
  style: GhostStyle,
): void {
  const lineArt = LINE_ART_BY_DRAWABLE_ID[drawableId];
  if (style === "pixel" || lineArt === undefined) {
    scene.add.image(x, y, GHOST_TEXTURE_BY_ID[drawableId]!).setDisplaySize(size, size);
    return;
  }
  const icon = createLineArtObject(
    scene,
    lineArt.art,
    lineArt.color,
    storedWallStyle().background,
    size,
    ghostLineArtLook(DEFAULT_TUNING),
    true,
    renderScaleOf(scene),
  );
  placeLineArtObject(icon, x, y, 1);
}

export function preloadPlayArt(scene: Phaser.Scene): void {
  for (const dir of PACMAN_DIRS) {
    for (const frame of [1, 2, 3] as const) {
      scene.load.image(pacmanTextureKey(dir, frame), `art/pacman-${dir}/${frame}.png`);
    }
  }
  scene.load.image(PELLET_TEXTURE_KEY, "art/other/dot.png");
  scene.load.image(QUARTER_TEXTURE_KEY, "art/other/quarter.png");
  scene.load.image(POWER_PELLET_TEXTURE_KEY, "art/other/power-pellet.png");
  scene.load.image(BLINKY_TEXTURE_KEY, "art/ghosts/blinky.png");
  scene.load.image(PINKY_TEXTURE_KEY, "art/ghosts/pinky.png");
  scene.load.image(INKY_TEXTURE_KEY, "art/ghosts/inky.png");
  scene.load.image(CLYDE_TEXTURE_KEY, "art/ghosts/clyde.png");
  scene.load.image(FRIGHTENED_GHOST_TEXTURE_KEY, "art/ghosts/blue_ghost.png");
  scene.load.image(FRUIT_TEXTURE_KEY, fruitArtPath(fruitSpecForLevel(CURRENT_LEVEL).kind));
}

function facingToDir(facing: Direction): PacmanDir | null {
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
): PlayerVisual {
  let visual = playerVisuals.get(eid);
  if (!visual) {
    visual = {
      lastDir: "right",
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
  wallPassActive?: boolean;
  wallPassLoopActive?: boolean;
  turnFlashRemainingMs?: number;
  dimGhostEid?: number | null;
  playerAlpha?: number;
  playerReviveProgress?: number;
  playerWarpGlide?: WarpGlideSprite[];
  playerSpeedTrail?: WarpGlideSprite[];
  ghostWarpGlides?: Record<number, WarpGlideSprite[]>;
  hauntedGhost?: HauntedGhost | null;
  frightenedGhosts?: FrightenedGhosts | null;
  bossChains?: ChainSegment[];
  lineArtDrawableIds?: string[];
};

const POWER_PELLET_BOUNCE_MUL = 1.5;
const POWER_PELLET_BOUNCE_MS = 150;

export type PlayRender = {
  draw: (world: World, opts?: RenderOptions) => void;
  releaseDrawable: (eid: number) => void;
  resetForNewBoard: () => void;
  bouncePowerPellet: (eid: number) => void;
  setWallStyle: (style: WallStyle | null) => void;
  setGhostLook: (look: GhostLineArtLook) => void;
};

const DIM_GHOST_ALPHA = 0.4;
const HAUNT_CAGE_DEPTH = 1;
const SPEED_TRAIL_DEPTH = -1;
const CHAIN_AMPLITUDE_TILES = 0.25;
const CHAIN_STROKES = [
  { strand: 0, width: 7, color: 0x3fa9ff, alpha: 0.25 },
  { strand: 0, width: 2.5, color: 0x9fe0ff, alpha: 0.95 },
  { strand: 1, width: 1, color: 0xffffff, alpha: 0.9 },
] as const;

function strokePolyline(graphics: Phaser.GameObjects.Graphics, points: readonly ChainPoint[]) {
  graphics.beginPath();
  graphics.moveTo(points[0]!.x, points[0]!.y);
  for (const point of points.slice(1)) {
    graphics.lineTo(point.x, point.y);
  }
  graphics.strokePath();
}

export function createRender(scene: Phaser.Scene): PlayRender {
  const drawableObjects = new Map<string, Phaser.GameObjects.Image>();
  const lineArtObjects = new Map<string, LineArtObject>();
  const playerVisuals = new Map<number, PlayerVisual>();
  let wallGlowScale = renderScaleOf(scene);
  const wallGlowTexture = scene.add.renderTexture(0, 0, 1, 1).setOrigin(0, 0);
  const wallGlowSource = scene.make.graphics({}, false).enableFilters();
  wallGlowSource.filtersAutoFocus = false;
  wallGlowSource.filtersFocusContext = false;
  wallGlowSource.filterCamera.setOrigin(0, 0);
  const sizeWallGlowToCanvas = (): void => {
    wallGlowScale = renderScaleOf(scene);
    wallGlowTexture
      .resize(
        Math.round(PLAYFIELD_WIDTH * wallGlowScale),
        Math.round(PLAYFIELD_HEIGHT * wallGlowScale),
      )
      .setScale(1 / wallGlowScale);
    wallGlowSource.setFilterSize(wallGlowTexture.width, wallGlowTexture.height);
  };
  sizeWallGlowToCanvas();
  const wallGraphics = scene.add.graphics();
  const chainGraphics = scene.add.graphics();
  const cageGraphics = scene.add.graphics();
  cageGraphics.setDepth(HAUNT_CAGE_DEPTH);
  let drawnWallStyle: WallStyle | null = null;
  let wallStyleOverride: WallStyle | null = null;
  let ghostLook = ghostLineArtLook(DEFAULT_TUNING);
  let bossPelletTint = 0xffffff;

  // Glow textures are baked at the canvas density; rebuild them when the canvas resizes.
  const onCanvasResize = (): void => {
    sizeWallGlowToCanvas();
    drawnWallStyle = null;
    for (const key of [...lineArtObjects.keys()]) {
      destroyLineArt(key);
    }
  };
  scene.scale.on(Phaser.Scale.Events.RESIZE, onCanvasResize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, onCanvasResize);
    wallGlowSource.destroy();
  });

  const destroyImage = (key: string): void => {
    const go = drawableObjects.get(key);
    if (go) {
      scene.tweens.killTweensOf(go);
      go.destroy();
      drawableObjects.delete(key);
    }
  };

  const destroyLineArt = (key: string): void => {
    const obj = lineArtObjects.get(key);
    if (obj) {
      destroyLineArtObject(obj);
      lineArtObjects.delete(key);
    }
  };

  const releaseDrawable = (eid: number): void => {
    destroyImage(String(eid));
    destroyImage(`${eid}:twin`);
    destroyLineArt(String(eid));
    playerVisuals.delete(eid);
  };

  const resetForNewBoard = (): void => {
    for (const go of drawableObjects.values()) {
      scene.tweens.killTweensOf(go);
      go.destroy();
    }
    drawableObjects.clear();
    for (const obj of lineArtObjects.values()) {
      destroyLineArtObject(obj);
    }
    lineArtObjects.clear();
    playerVisuals.clear();
    wallGraphics.clear();
    drawnWallStyle = null;
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
    const playerAlpha = opts?.playerAlpha;
    const reviveProgress = opts?.playerReviveProgress;
    const warpGlide = opts?.playerWarpGlide;
    const speedTrail = opts?.playerSpeedTrail;
    const ghostWarpGlides = opts?.ghostWarpGlides;
    const lineArtIds = new Set(opts?.lineArtDrawableIds ?? []);
    const wallPassOn = opts?.wallPassActive === true;
    const twinSolids =
      opts?.wallPassLoopActive === true ? getActiveLayout().wallPassLoopPlayerSolids : undefined;
    const turnFlash = turnFlashPulse(opts?.turnFlashRemainingMs ?? 0);
    const playerTintNow = playerTint({
      wallPassOn,
      invulnRemainingMs: opts?.playerInvulnRemainingMs ?? 0,
      nowMs: scene.time.now,
      flashBrighten: turnFlash.brighten,
    });
    const frozenTintOn = expiryTintOn(opts?.frozenGhostRemainingMs ?? 0, scene.time.now);
    const wallStyle = wallStyleOverride ?? storedWallStyle();
    if (!sameWallStyle(wallStyle, drawnWallStyle)) {
      bossPelletTint = brightenColor(wallStyle.color, 0.5);
      const commands = wallPathCommands(undefined, undefined, wallStyle.cornerRadius);
      strokeWallPath(wallGraphics, commands, wallStyle, 1);
      const glow = wallGlowFilter(wallStyle);
      wallGlowTexture.clear();
      if (glow !== null) {
        strokeWallPath(wallGlowSource, commands, wallStyle, wallGlowScale);
        wallGlowSource.filters!.internal.clear();
        wallGlowSource.filters!.internal.addGlow(
          wallStyle.color,
          glow.outerStrength,
          0,
          1,
          true,
          WALL_GLOW_QUALITY,
          glow.distance * wallGlowScale,
        );
        wallGlowTexture.draw(wallGlowSource);
      }
      wallGlowTexture.render();
      if (wallStyleOverride !== null) {
        scene.cameras.main.setBackgroundColor(wallStyle.background);
      }
      drawnWallStyle = wallStyle;
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
        trailGo.setAlpha(trail.alpha);
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
        id !== FRUIT_DRAWABLE_ID &&
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

      const lineArtEntry = lineArtIds.has(id) ? LINE_ART_BY_DRAWABLE_ID[id] : undefined;
      if (lineArtEntry !== undefined) {
        destroyImage(primaryKey);
        const lineArt = lineArtEntry.art;
        const color = frightenedLook
          ? LINE_ART_FRIGHTENED_COLOR
          : ghostTint === null
            ? lineArtEntry.color
            : LINE_ART_FROZEN_COLOR;
        const placeLineArt = (
          key: string,
          glow: boolean,
          px: number,
          py: number,
          alpha: number,
        ): void => {
          alive.add(key);
          let obj = lineArtObjects.get(key);
          if (!obj) {
            obj = createLineArtObject(
              scene,
              lineArt,
              color,
              wallStyle.background,
              size,
              ghostLook,
              glow,
              renderScaleOf(scene),
            );
            lineArtObjects.set(key, obj);
          } else if (obj.color !== color || obj.backdrop !== wallStyle.background) {
            restyleLineArtObject(obj, lineArt, color, wallStyle.background);
          }
          placeLineArtObject(obj, px, py, alpha);
        };
        placeLineArt(primaryKey, true, x, y, ghostAlpha * (glideHead?.alpha ?? 1));
        glide?.slice(1).forEach((trail, i) => {
          placeLineArt(`${eid}:lglide${i}`, false, trail.x, trail.y, trail.alpha);
        });
        continue;
      }
      destroyLineArt(primaryKey);

      let go = drawableObjects.get(primaryKey);
      if (!go) {
        go = scene.add.image(x, y, textureKeyForDrawable(id));
        go.setDisplaySize(size, size);
        go.setName(id);
        drawableObjects.set(primaryKey, go);
        if (id === PLAYER_DRAWABLE_ID) {
          ensurePlayerVisual(playerVisuals, eid, x, y);
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
        go.setAlpha(pulse.alpha);
      }

      if (ghostTexture !== undefined) {
        const ghostKey = frightenedLook ? FRIGHTENED_GHOST_TEXTURE_KEY : ghostTexture;
        if (go.texture.key !== ghostKey) {
          go.setTexture(ghostKey);
          go.setDisplaySize(size, size);
        }
        const applyGhostTint = (target: Phaser.GameObjects.Image): void => {
          if (ghostTint === null) {
            target.clearTint();
          } else {
            target.setTint(ghostTint);
          }
        };
        applyGhostTint(go);
        go.setAlpha(ghostAlpha * (glideHead?.alpha ?? 1));
        if (glide !== undefined) {
          drawGlideTrail(eid, id, glide.slice(1), go.texture.key, size, applyGhostTint);
        }
      }

      if (id === PLAYER_DRAWABLE_ID) {
        const visual = ensurePlayerVisual(playerVisuals, eid, x, y);
        const facing = Facing.direction[eid] ?? DIRECTION.none;
        const movingDir = facingToDir(facing);
        let nextKey: string;
        if (movingDir) {
          visual.lastDir = movingDir;
          const dx = x - visual.lastX;
          const dy = y - visual.lastY;
          visual.chompCarry += Math.hypot(dx, dy);
          while (visual.chompCarry >= CHOMP_PIXELS_PER_FRAME) {
            visual.chompCarry -= CHOMP_PIXELS_PER_FRAME;
            visual.cycleIndex = (visual.cycleIndex + 1) % CHOMP_CYCLE.length;
          }
          const frame = CHOMP_CYCLE[visual.cycleIndex] ?? OPEN_MOUTH_FRAME;
          nextKey = pacmanTextureKey(visual.lastDir, frame);
        } else {
          nextKey = pacmanTextureKey(visual.lastDir, OPEN_MOUTH_FRAME);
        }
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
          drawGlideTrail(eid, id, glide.slice(1), visual.textureKey, size, (target) =>
            applyPlayerTint(target, playerTintNow),
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
          );
        }
        if (
          glide === undefined &&
          playerAlpha === undefined &&
          reviveProgress === undefined &&
          hasComponent(world, eid, Player)
        ) {
          const twin = wrappedTwinPosition(x, y, radius, twinSolids);
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
            applyPlayerTint(twinGo, playerTintNow);
          }
        }
      }
    }

    chainGraphics.clear();
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

    for (const [key, go] of drawableObjects) {
      if (!alive.has(key)) {
        go.destroy();
        drawableObjects.delete(key);
        if (!key.includes(":")) {
          playerVisuals.delete(Number(key));
        }
      }
    }
    for (const key of lineArtObjects.keys()) {
      if (!alive.has(key)) {
        destroyLineArt(key);
      }
    }
  };

  const setWallStyle = (style: WallStyle | null): void => {
    wallStyleOverride = style;
  };

  // Glow distance is fixed when the filter is created, so rebuild line art on change.
  const setGhostLook = (look: GhostLineArtLook): void => {
    if (sameGhostLineArtLook(look, ghostLook)) {
      return;
    }
    ghostLook = look;
    for (const key of [...lineArtObjects.keys()]) {
      destroyLineArt(key);
    }
  };

  return {
    draw,
    releaseDrawable,
    resetForNewBoard,
    bouncePowerPellet,
    setWallStyle,
    setGhostLook,
  };
}
