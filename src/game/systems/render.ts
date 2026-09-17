import { hasComponent, query, type World } from "bitecs";
import Phaser from "phaser";
import {
  PELLET_DISPLAY_SIZE,
  playerDisplaySize,
  POWER_PELLET_DISPLAY_SIZE,
  wallPathCommands,
  WALL_STROKE_COLOR,
  WALL_STROKE_WEIGHT,
  wrappedTwinPosition,
  type WallPathCommand,
} from "../../domain/maze";
import {
  BLINKY_DRAWABLE_ID,
  CLYDE_DRAWABLE_ID,
  FRUIT_DRAWABLE_ID,
  INKY_DRAWABLE_ID,
  PELLET_DRAWABLE_ID,
  PINKY_DRAWABLE_ID,
  PLAYER_DRAWABLE_ID,
  POWER_PELLET_DRAWABLE_ID,
} from "../../domain/playfield";
import { fruitArtPath, fruitSpecForLevel, CURRENT_LEVEL } from "../../domain/fruit";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

const PELLET_TEXTURE_KEY = "pellet-dot";
const POWER_PELLET_TEXTURE_KEY = "power-pellet";
const BLINKY_TEXTURE_KEY = "ghost-blinky";
const PINKY_TEXTURE_KEY = "ghost-pinky";
const INKY_TEXTURE_KEY = "ghost-inky";
const CLYDE_TEXTURE_KEY = "ghost-clyde";
const FRUIT_TEXTURE_KEY = "bonus-fruit";
const GHOST_FROZEN_TINT = 0x7ec8ff;
const GHOST_TEXTURE_BY_ID: Record<string, string> = {
  [BLINKY_DRAWABLE_ID]: BLINKY_TEXTURE_KEY,
  [PINKY_DRAWABLE_ID]: PINKY_TEXTURE_KEY,
  [INKY_DRAWABLE_ID]: INKY_TEXTURE_KEY,
  [CLYDE_DRAWABLE_ID]: CLYDE_TEXTURE_KEY,
};
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
    return PELLET_DISPLAY_SIZE;
  }
  if (drawableId === POWER_PELLET_DRAWABLE_ID) {
    return POWER_PELLET_DISPLAY_SIZE;
  }
  return playerDisplaySize();
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
  ghostsFrozen?: boolean;
};

export type PlayRender = {
  draw: (world: World, opts?: RenderOptions) => void;
  releaseDrawable: (eid: number) => void;
  resetForNewBoard: () => void;
};

export function createRender(scene: Phaser.Scene): PlayRender {
  const drawableObjects = new Map<string, Phaser.GameObjects.Image>();
  const playerVisuals = new Map<number, PlayerVisual>();
  const wallGraphics = scene.add.graphics();
  let wallsDrawn = false;
  const actorDisplaySize = playerDisplaySize();

  const releaseDrawable = (eid: number): void => {
    for (const key of [String(eid), `${eid}:twin`] as const) {
      const go = drawableObjects.get(key);
      if (go) {
        go.destroy();
        drawableObjects.delete(key);
      }
    }
    playerVisuals.delete(eid);
  };

  const resetForNewBoard = (): void => {
    for (const go of drawableObjects.values()) {
      go.destroy();
    }
    drawableObjects.clear();
    playerVisuals.clear();
    wallGraphics.clear();
    wallsDrawn = false;
  };

  const draw = (world: World, opts?: RenderOptions): void => {
    const ghostsFrozen = opts?.ghostsFrozen === true;
    if (!wallsDrawn) {
      wallGraphics.clear();
      wallGraphics.lineStyle(WALL_STROKE_WEIGHT, WALL_STROKE_COLOR, 1);
      wallGraphics.beginPath();
      applyWallPathCommands(wallGraphics, wallPathCommands());
      wallGraphics.strokePath();
      wallsDrawn = true;
    }

    const alive = new Set<string>();
    for (const eid of query(world, [Position, Drawable])) {
      const id = Drawable.id[eid] ?? "unknown";
      const ghostTexture = GHOST_TEXTURE_BY_ID[id];
      if (
        id !== PLAYER_DRAWABLE_ID &&
        id !== PELLET_DRAWABLE_ID &&
        id !== POWER_PELLET_DRAWABLE_ID &&
        id !== FRUIT_DRAWABLE_ID &&
        ghostTexture === undefined
      ) {
        continue;
      }

      const primaryKey = String(eid);
      const twinKey = `${eid}:twin`;
      alive.add(primaryKey);

      const x = Position.x[eid] ?? 0;
      const y = Position.y[eid] ?? 0;
      const radius = Drawable.radius[eid] ?? actorDisplaySize / 2;
      const size = displaySizeForDrawable(id);

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

      if (ghostTexture !== undefined) {
        const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
        if (ghostsFrozen && phase !== GHOST_PHASE.inHouse) {
          go.setTint(GHOST_FROZEN_TINT);
        } else {
          go.clearTint();
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
          go.setDisplaySize(actorDisplaySize, actorDisplaySize);
          visual.textureKey = nextKey;
        }
        visual.lastX = x;
        visual.lastY = y;

        if (hasComponent(world, eid, Player)) {
          const twin = wrappedTwinPosition(x, y, radius);
          if (twin) {
            alive.add(twinKey);
            let twinGo = drawableObjects.get(twinKey);
            if (!twinGo) {
              twinGo = scene.add.image(twin.x, twin.y, visual.textureKey);
              twinGo.setDisplaySize(actorDisplaySize, actorDisplaySize);
              twinGo.setName(`${id}:twin`);
              drawableObjects.set(twinKey, twinGo);
            } else {
              twinGo.setPosition(twin.x, twin.y);
              if (twinGo.texture.key !== visual.textureKey) {
                twinGo.setTexture(visual.textureKey);
                twinGo.setDisplaySize(actorDisplaySize, actorDisplaySize);
              }
            }
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

  return { draw, releaseDrawable, resetForNewBoard };
}
