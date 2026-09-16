import { hasComponent, query, type World } from "bitecs";
import Phaser from "phaser";
import { pipeEdges, WALL_COLOR, wrappedTwinPosition } from "../../domain/maze";
import {
  BLINKY_DRAWABLE_ID,
  FRUIT_DRAWABLE_ID,
  PELLET_DRAWABLE_ID,
  PINKY_DRAWABLE_ID,
  PLAYER_DRAWABLE_ID,
  POWER_PELLET_DRAWABLE_ID,
} from "../../domain/playfield";
import { fruitArtPath, fruitSpecForLevel, CURRENT_LEVEL } from "../../domain/fruit";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

const SPRITE_DISPLAY_SIZE = 16;
const PELLET_TEXTURE_KEY = "pellet-dot";
const POWER_PELLET_TEXTURE_KEY = "power-pellet";
const BLINKY_TEXTURE_KEY = "ghost-blinky";
const PINKY_TEXTURE_KEY = "ghost-pinky";
const FRUIT_TEXTURE_KEY = "bonus-fruit";
const GHOST_TEXTURE_BY_ID: Record<string, string> = {
  [BLINKY_DRAWABLE_ID]: BLINKY_TEXTURE_KEY,
  [PINKY_DRAWABLE_ID]: PINKY_TEXTURE_KEY,
};
const CHOMP_PIXELS_PER_FRAME = 12;
const CHOMP_CYCLE = [1, 2, 3, 2] as const;
const CLOSED_MOUTH_FRAME = 3;
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

function pelletTextureKey(drawableId: string): string {
  return drawableId === POWER_PELLET_DRAWABLE_ID ? POWER_PELLET_TEXTURE_KEY : PELLET_TEXTURE_KEY;
}

function textureKeyForDrawable(drawableId: string): string {
  if (drawableId === PLAYER_DRAWABLE_ID) {
    return pacmanTextureKey("right", CLOSED_MOUTH_FRAME);
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
      textureKey: pacmanTextureKey("right", CLOSED_MOUTH_FRAME),
    };
    playerVisuals.set(eid, visual);
  }
  return visual;
}

export function createRender(scene: Phaser.Scene): (world: World) => void {
  const drawableObjects = new Map<string, Phaser.GameObjects.Image>();
  const playerVisuals = new Map<number, PlayerVisual>();
  const wallGraphics = scene.add.graphics();
  let pipesDrawn = false;

  return (world: World) => {
    if (!pipesDrawn) {
      wallGraphics.clear();
      wallGraphics.lineStyle(2, WALL_COLOR, 1);
      for (const edge of pipeEdges()) {
        wallGraphics.lineBetween(edge.x1, edge.y1, edge.x2, edge.y2);
      }
      pipesDrawn = true;
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
      const radius = Drawable.radius[eid] ?? SPRITE_DISPLAY_SIZE / 2;

      let go = drawableObjects.get(primaryKey);
      if (!go) {
        go = scene.add.image(x, y, textureKeyForDrawable(id));
        go.setDisplaySize(SPRITE_DISPLAY_SIZE, SPRITE_DISPLAY_SIZE);
        go.setName(id);
        drawableObjects.set(primaryKey, go);
        if (id === PLAYER_DRAWABLE_ID) {
          ensurePlayerVisual(playerVisuals, eid, x, y);
        }
      }

      go.setPosition(x, y);

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
          const frame = CHOMP_CYCLE[visual.cycleIndex] ?? CLOSED_MOUTH_FRAME;
          nextKey = pacmanTextureKey(visual.lastDir, frame);
        } else {
          nextKey = pacmanTextureKey(visual.lastDir, CLOSED_MOUTH_FRAME);
        }
        if (nextKey !== visual.textureKey) {
          go.setTexture(nextKey);
          go.setDisplaySize(SPRITE_DISPLAY_SIZE, SPRITE_DISPLAY_SIZE);
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
              twinGo.setDisplaySize(SPRITE_DISPLAY_SIZE, SPRITE_DISPLAY_SIZE);
              twinGo.setName(`${id}:twin`);
              drawableObjects.set(twinKey, twinGo);
            } else {
              twinGo.setPosition(twin.x, twin.y);
              if (twinGo.texture.key !== visual.textureKey) {
                twinGo.setTexture(visual.textureKey);
                twinGo.setDisplaySize(SPRITE_DISPLAY_SIZE, SPRITE_DISPLAY_SIZE);
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
}
