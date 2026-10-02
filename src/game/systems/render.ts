import { hasComponent, query, type World } from "bitecs";
import Phaser from "phaser";
import {
  getActiveLayout,
  playerDisplaySize,
  pelletDisplaySize,
  powerPelletDisplaySize,
  wallPathCommands,
  WALL_STROKE_WEIGHT,
  wrappedTwinPosition,
  type WallPathCommand,
} from "../../domain/maze";
import { clampMazeColorIndex, mazeColorForIndex } from "../../domain/mazeColorSettings";
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
  POWER_PELLET_DRAWABLE_ID,
} from "../../domain/playfield";
import { turnFlashPulse } from "../../domain/turnTuning";
import { pelletTint } from "../../domain/lazyLooper";
import { fruitArtPath, fruitSpecForLevel, CURRENT_LEVEL } from "../../domain/fruit";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { reviveSplashLook } from "../../domain/reviveSplash";
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
const FRUIT_TEXTURE_KEY = "bonus-fruit";
const GHOST_FROZEN_TINT = 0x7ec8ff;
const GHOST_HARVEST_TINT = 0x66ff99;
export const PLAYER_WALL_PASS_TINT = 0xd3d333;
const PLAYER_INVULN_TINT = 0xc48a00;
const PLAYER_INVULN_BLINK_MS = 100;
const PLAYER_INVULN_URGENCY_MS = 1000;
export const GHOST_TEXTURE_BY_ID: Record<string, string> = {
  [BLINKY_DRAWABLE_ID]: BLINKY_TEXTURE_KEY,
  [PINKY_DRAWABLE_ID]: PINKY_TEXTURE_KEY,
  [INKY_DRAWABLE_ID]: INKY_TEXTURE_KEY,
  [CLYDE_DRAWABLE_ID]: CLYDE_TEXTURE_KEY,
};
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

function grayColor(level: number): number {
  const channel = Math.round(Math.min(1, level) * 0xff);
  return (channel << 16) | (channel << 8) | channel;
}

function applyPlayerTint(
  go: Phaser.GameObjects.Image,
  tint: { color: number; mode: Phaser.TintModes } | null,
): void {
  if (tint === null) {
    go.clearTint();
    return;
  }
  go.setTint(tint.color);
  go.setTintMode(tint.mode);
}

function brightenColor(color: number, towardWhite: number): number {
  const channel = (shift: number) => {
    const value = (color >> shift) & 0xff;
    return Math.round(value + (0xff - value) * towardWhite) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

function bossPelletPulse(nowMs: number): { size: number; alpha: number } {
  const wave = (Math.sin((2 * Math.PI * nowMs) / BOSS_PELLET_PULSE_MS) + 1) / 2;
  const sizeMul = BOSS_PELLET_SIZE_MUL + (BOSS_PELLET_PULSE_SIZE_MUL - BOSS_PELLET_SIZE_MUL) * wave;
  return {
    size: pelletDisplaySize() * sizeMul,
    alpha: 1 - (1 - BOSS_PELLET_MIN_ALPHA) * wave,
  };
}

function applyWallPathCommands(
  graphics: Phaser.GameObjects.Graphics,
  commands: readonly WallPathCommand[],
): void {
  for (const command of commands) {
    if (command.type === "move") {
      graphics.moveTo(command.x, command.y);
    } else {
      graphics.lineTo(command.x, command.y);
    }
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
  if (drawableId === FRUIT_DRAWABLE_ID) {
    return FRUIT_TEXTURE_KEY;
  }
  return pelletTextureKey(drawableId);
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
  playerInvulnRemainingMs?: number;
  wallPassActive?: boolean;
  wallPassLoopActive?: boolean;
  turnFlashRemainingMs?: number;
  ghostHarvestActive?: boolean;
  dimGhostEid?: number | null;
  playerAlpha?: number;
  playerReviveProgress?: number;
  playerWarpGlide?: WarpGlideSprite[];
  ghostWarpGlides?: Record<number, WarpGlideSprite[]>;
};

const POWER_PELLET_BOUNCE_MUL = 1.5;
const POWER_PELLET_BOUNCE_MS = 150;

export type PlayRender = {
  draw: (world: World, opts?: RenderOptions) => void;
  releaseDrawable: (eid: number) => void;
  resetForNewBoard: () => void;
  bouncePowerPellet: (eid: number) => void;
};

const DIM_GHOST_ALPHA = 0.4;

export function createRender(scene: Phaser.Scene): PlayRender {
  const drawableObjects = new Map<string, Phaser.GameObjects.Image>();
  const playerVisuals = new Map<number, PlayerVisual>();
  const wallGraphics = scene.add.graphics();
  let wallsDrawn = false;
  let drawnMazeColorIndex: number | null = null;
  let bossPelletTint = 0xffffff;

  const releaseDrawable = (eid: number): void => {
    for (const key of [String(eid), `${eid}:twin`] as const) {
      const go = drawableObjects.get(key);
      if (go) {
        scene.tweens.killTweensOf(go);
        go.destroy();
        drawableObjects.delete(key);
      }
    }
    playerVisuals.delete(eid);
  };

  const resetForNewBoard = (): void => {
    for (const go of drawableObjects.values()) {
      scene.tweens.killTweensOf(go);
      go.destroy();
    }
    drawableObjects.clear();
    playerVisuals.clear();
    wallGraphics.clear();
    wallsDrawn = false;
    drawnMazeColorIndex = null;
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
    const ghostHarvestOn = opts?.ghostHarvestActive === true;
    const dimGhostEid = opts?.dimGhostEid ?? null;
    const playerAlpha = opts?.playerAlpha;
    const reviveProgress = opts?.playerReviveProgress;
    const warpGlide = opts?.playerWarpGlide;
    const ghostWarpGlides = opts?.ghostWarpGlides;
    const wallPassOn = opts?.wallPassActive === true;
    const twinSolids =
      opts?.wallPassLoopActive === true ? getActiveLayout().wallPassLoopPlayerSolids : undefined;
    const invulnRemainingMs = opts?.playerInvulnRemainingMs ?? 0;
    const turnFlash = turnFlashPulse(opts?.turnFlashRemainingMs ?? 0);
    const playerInvulnTintOn =
      !wallPassOn &&
      invulnRemainingMs > 0 &&
      (invulnRemainingMs > PLAYER_INVULN_URGENCY_MS ||
        Math.floor(scene.time.now / PLAYER_INVULN_BLINK_MS) % 2 === 0);
    const playerTint =
      turnFlash.brighten > 0
        ? { color: grayColor(turnFlash.brighten), mode: Phaser.TintModes.ADD }
        : wallPassOn
          ? { color: PLAYER_WALL_PASS_TINT, mode: Phaser.TintModes.MULTIPLY }
          : playerInvulnTintOn
            ? { color: PLAYER_INVULN_TINT, mode: Phaser.TintModes.MULTIPLY }
            : null;
    const mazeColorIndex = clampMazeColorIndex(loadMazeColorSettings().colorIndex);
    if (!wallsDrawn || mazeColorIndex !== drawnMazeColorIndex) {
      const wallStrokeColor = mazeColorForIndex(mazeColorIndex);
      bossPelletTint = brightenColor(wallStrokeColor, 0.5);
      wallGraphics.clear();
      wallGraphics.lineStyle(WALL_STROKE_WEIGHT, wallStrokeColor, 1);
      wallGraphics.beginPath();
      applyWallPathCommands(wallGraphics, wallPathCommands());
      wallGraphics.strokePath();
      wallsDrawn = true;
      drawnMazeColorIndex = mazeColorIndex;
    }

    const alive = new Set<string>();
    const drawGlideTrail = (
      eid: number,
      id: string,
      glide: readonly WarpGlideSprite[],
      textureKey: string,
      size: number,
      applyTint: (go: Phaser.GameObjects.Image) => void,
    ): void => {
      for (let i = 1; i < glide.length; i += 1) {
        const trail = glide[i]!;
        const trailKey = `${eid}:glide${i}`;
        alive.add(trailKey);
        let trailGo = drawableObjects.get(trailKey);
        if (!trailGo) {
          trailGo = scene.add.image(trail.x, trail.y, textureKey);
          trailGo.setName(`${id}:glide`);
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
        const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
        const tint =
          frozenEid !== null && eid === frozenEid && phase !== GHOST_PHASE.inHouse
            ? GHOST_FROZEN_TINT
            : ghostHarvestOn && phase !== GHOST_PHASE.inHouse
              ? GHOST_HARVEST_TINT
              : null;
        const applyGhostTint = (target: Phaser.GameObjects.Image): void => {
          if (tint === null) {
            target.clearTint();
          } else {
            target.setTint(tint);
          }
        };
        applyGhostTint(go);
        go.setAlpha(
          (dimGhostEid !== null && eid === dimGhostEid ? DIM_GHOST_ALPHA : 1) *
            (glideHead?.alpha ?? 1),
        );
        if (glide !== undefined) {
          drawGlideTrail(eid, id, glide, go.texture.key, size, applyGhostTint);
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

        applyPlayerTint(go, playerTint);
        go.setDisplaySize(size * turnFlash.scale, size * turnFlash.scale);
        go.setAlpha((playerAlpha ?? 1) * turnFlash.alpha * (glideHead?.alpha ?? 1));
        if (reviveProgress !== undefined) {
          const look = reviveSplashLook(reviveProgress, size);
          go.setDisplaySize(look.size, look.size);
          go.setAlpha(look.alpha);
        }

        if (glide !== undefined) {
          drawGlideTrail(eid, id, glide, visual.textureKey, size, (target) =>
            applyPlayerTint(target, playerTint),
          );
        } else if (
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
            applyPlayerTint(twinGo, playerTint);
          }
        }
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
  };

  return { draw, releaseDrawable, resetForNewBoard, bouncePowerPellet };
}
