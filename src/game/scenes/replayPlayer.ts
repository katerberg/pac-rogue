import Phaser from "phaser";
import { MAZE_BACKGROUND_COLOR, WALL_STROKE_COLOR } from "../../domain/maze";
import { GHOST_DRAWABLE_BY_KIND, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import { BLINKY_DRAWABLE_ID } from "../../domain/playfield";
import {
  frameAt,
  itemsAt,
  replayCursor,
  type ReplayData,
  type ReplayItemKind,
} from "../../domain/replay";
import { MENU_TITLE_FONT_SIZE, addPixelText, placePixelText } from "./pixelFont";
import { addDotManIcon, addGhostSprite, type GhostSpriteHandle } from "../systems/render";

const BACKDROP_DEPTH = 899;
const CONTENT_DEPTH = 900;
const LABEL_DEPTH = 905;
const LABEL_Y = 48;
const ACTOR_SIZE = 16;
const DEATH_RING_REAL_MS = 300;
const DEATH_RING_SIM_MS = DEATH_RING_REAL_MS * 10;
const PELLET_COLOR = 0xffb8ae;
const POWER_COLOR = 0xffffff;
const FRUIT_COLOR = 0xff3030;
const BOSS_COLOR = 0xff8800;
const DEATH_COLOR = 0xff3030;

const ITEM_STYLE: Record<ReplayItemKind, { color: number; radius: number }> = {
  pellet: { color: PELLET_COLOR, radius: 1.5 },
  power: { color: POWER_COLOR, radius: 4 },
  fruit: { color: FRUIT_COLOR, radius: 4 },
  boss: { color: BOSS_COLOR, radius: 4 },
  optional: { color: PELLET_COLOR, radius: 2 },
};

export type ReplayPlayerState = {
  segmentIndex: number;
  segments: number;
  level: number;
  labelVisible: boolean;
  simMs: number;
  loops: number;
};

export type ReplayPlayer = {
  tick(realDeltaMs: number): void;
  state(): ReplayPlayerState;
};

export function createReplayPlayer(scene: Phaser.Scene, data: ReplayData): ReplayPlayer {
  scene.add
    .rectangle(
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2,
      PLAYFIELD_WIDTH,
      PLAYFIELD_HEIGHT,
      MAZE_BACKGROUND_COLOR,
    )
    .setDepth(BACKDROP_DEPTH);
  const walls = scene.add.graphics().setDepth(CONTENT_DEPTH);
  const items = scene.add.graphics().setDepth(CONTENT_DEPTH + 1);
  const rings = scene.add.graphics().setDepth(CONTENT_DEPTH + 3);
  const dotMan = addDotManIcon(scene, 0, 0, ACTOR_SIZE)
    .setDepth(CONTENT_DEPTH + 2)
    .setVisible(false);
  const ghosts = new Map<number, GhostSpriteHandle>();
  const label = addPixelText(scene, 0, 0, "", MENU_TITLE_FONT_SIZE).setDepth(LABEL_DEPTH);
  let drawnSegment = -1;
  let elapsedMs = 0;
  let last: ReplayPlayerState = {
    segmentIndex: 0,
    segments: data.segments.length,
    level: data.segments[0]!.level,
    labelVisible: true,
    simMs: 0,
    loops: 0,
  };

  function drawWalls(index: number): void {
    const segment = data.segments[index]!;
    walls.clear();
    walls.fillStyle(WALL_STROKE_COLOR, 0.8);
    const half = segment.tileSize / 2;
    for (const wall of segment.walls) {
      walls.fillRect(wall.x - half, wall.y - half, segment.tileSize, segment.tileSize);
    }
    for (const ghost of ghosts.values()) {
      ghost.destroy();
    }
    ghosts.clear();
    drawnSegment = index;
  }

  return {
    tick(realDeltaMs) {
      elapsedMs += realDeltaMs;
      const cursor = replayCursor(data, elapsedMs);
      last = {
        segmentIndex: cursor.segmentIndex,
        segments: data.segments.length,
        level: data.segments[cursor.segmentIndex]!.level,
        labelVisible: cursor.labelVisible,
        simMs: cursor.simMs,
        loops: cursor.loops,
      };
      if (cursor.segmentIndex !== drawnSegment) {
        drawWalls(cursor.segmentIndex);
      }
      const segment = data.segments[cursor.segmentIndex]!;

      label.setText(cursor.labelVisible ? `LEVEL ${segment.level}` : "");
      if (cursor.labelVisible) {
        placePixelText(label, PLAYFIELD_WIDTH / 2, LABEL_Y, 0.5, 0.5);
      }

      items.clear();
      rings.clear();
      dotMan.setVisible(false);
      for (const ghost of ghosts.values()) {
        ghost.container.setVisible(false);
      }
      if (cursor.labelVisible) {
        return;
      }

      for (const item of itemsAt(segment, cursor.simMs)) {
        const style = ITEM_STYLE[item.kind];
        items.fillStyle(style.color, 1);
        items.fillCircle(item.x, item.y, style.radius);
      }

      const view = frameAt(segment, cursor.simMs);
      if (view.player !== null) {
        dotMan.setPosition(view.player.x, view.player.y);
        dotMan.setRotation(view.player.angle);
        dotMan.setVisible(true);
      }
      const seen = new Set<number>();
      for (const ghost of view.ghosts) {
        seen.add(ghost.eid);
        let sprite = ghosts.get(ghost.eid);
        if (sprite === undefined) {
          const drawableId =
            GHOST_DRAWABLE_BY_KIND[ghost.kind as keyof typeof GHOST_DRAWABLE_BY_KIND] ??
            BLINKY_DRAWABLE_ID;
          sprite = addGhostSprite(scene, drawableId, ghost.x, ghost.y, ACTOR_SIZE);
          sprite.setDepth(CONTENT_DEPTH + 2);
          ghosts.set(ghost.eid, sprite);
        }
        sprite.setPosition(ghost.x, ghost.y);
        sprite.container.setVisible(true);
      }
      for (const [eid, sprite] of ghosts) {
        if (!seen.has(eid)) {
          sprite.destroy();
          ghosts.delete(eid);
        }
      }

      for (const death of segment.deaths) {
        const age = (cursor.simMs - death.t) / DEATH_RING_SIM_MS;
        if (age >= 0 && age < 1) {
          rings.lineStyle(2, DEATH_COLOR, 1 - age);
          rings.strokeCircle(death.x, death.y, ACTOR_SIZE * (0.5 + age * 1.5));
        }
      }
    },
    state: () => last,
  };
}
