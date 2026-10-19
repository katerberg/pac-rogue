import Phaser from "phaser";
import { invertRgb24 } from "../../domain/bossRules";
import { brightenColor } from "../../domain/playerTint";
import { pelletTint } from "../../domain/lazyLooper";
import {
  actorDisplaySize,
  playerDisplaySize,
  setActiveLayout,
  wallPathCommands,
} from "../../domain/maze";
import {
  DOTMAN_CHOMP_PIXELS_PER_FRAME,
  advanceDotManChomp,
  dotManVisorLift,
  type DotManChomp,
} from "../../domain/dotManMouth";
import { stepHeading, visorPose } from "../../domain/dotManHeading";
import {
  BLINKY_DRAWABLE_ID,
  BOSS_PELLET_DRAWABLE_ID,
  GHOST_DRAWABLE_BY_KIND,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH,
} from "../../domain/playfield";
import {
  frameAt,
  itemsAt,
  replayCursor,
  REPLAY_SNAP_TILES,
  replaySpeed,
  type ReplayData,
  type ReplayGhostLook,
  type ReplayItemEvent,
} from "../../domain/replay";
import { MENU_TITLE_FONT_SIZE, addPixelText, placePixelText } from "./pixelFont";
import {
  addDotManIcon,
  addGhostSprite,
  displaySizeForDrawable,
  storedWallStyle,
  strokeWallPath,
  textureKeyForDrawable,
  type GhostSpriteHandle,
} from "../systems/render";

const BACKDROP_DEPTH = 899;
const CONTENT_DEPTH = 900;
const LABEL_DEPTH = 905;
const LABEL_Y = 48;
const DOTMAN_ART_SIZE_PX = 16;
const DEATH_RING_REAL_MS = 300;
const DEATH_COLOR = 0xff3030;

export type ReplayPlayerState = {
  segmentIndex: number;
  segments: number;
  level: number;
  speed: number;
  labelVisible: boolean;
  simMs: number;
  loops: number;
};

export type ReplayPlayback = {
  tick(realDeltaMs: number): void;
  state(): ReplayPlayerState;
};

export function createReplayPlayer(scene: Phaser.Scene, data: ReplayData): ReplayPlayback {
  const style = storedWallStyle();
  scene.add
    .rectangle(
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2,
      PLAYFIELD_WIDTH,
      PLAYFIELD_HEIGHT,
      style.background,
    )
    .setDepth(BACKDROP_DEPTH);
  const walls = scene.add.graphics().setDepth(CONTENT_DEPTH);
  const items = new Map<number, Phaser.GameObjects.Image>();
  const rings = scene.add.graphics().setDepth(CONTENT_DEPTH + 3);
  const dotMan = addDotManIcon(scene, 0, 0, DOTMAN_ART_SIZE_PX)
    .setDepth(CONTENT_DEPTH + 2)
    .setVisible(false);
  const [dotManBody, dotManVisor] = dotMan.list as [
    Phaser.GameObjects.Image,
    Phaser.GameObjects.Image,
  ];
  let heading = 0;
  let chomp: DotManChomp = { carry: 0, cycleIndex: 0 };
  let lastPlayer: { x: number; y: number } | null = null;
  const ghosts = new Map<number, GhostSpriteHandle>();
  const looks = new Map<number, ReplayGhostLook>();
  const bossTint = brightenColor(style.color, 0.5);
  const label = addPixelText(scene, 0, 0, "", MENU_TITLE_FONT_SIZE).setDepth(LABEL_DEPTH);
  const speed = replaySpeed(data);
  const deathRingSimMs = DEATH_RING_REAL_MS * speed;
  let lastRealDeltaMs = 0;
  let drawnSegment = -1;
  let drawnInverted = false;
  let elapsedMs = 0;
  let last: ReplayPlayerState = {
    segmentIndex: 0,
    segments: data.segments.length,
    level: data.segments[0]!.level,
    speed,
    labelVisible: true,
    simMs: 0,
    loops: 0,
  };

  function syncItems(live: readonly ReplayItemEvent[]): void {
    const keep = new Set<number>();
    for (const item of live) {
      keep.add(item.eid);
      let image = items.get(item.eid);
      if (image === undefined) {
        const size = displaySizeForDrawable(item.art);
        image = scene.add
          .image(item.x, item.y, textureKeyForDrawable(item.art))
          .setDisplaySize(size, size)
          .setDepth(CONTENT_DEPTH + 1);
        if (item.art === BOSS_PELLET_DRAWABLE_ID) {
          image.setTint(bossTint);
        } else if (pelletTint(item.optional) !== null) {
          image.setTint(pelletTint(item.optional)!);
        }
        items.set(item.eid, image);
      }
    }
    for (const [eid, image] of items) {
      if (!keep.has(eid)) {
        image.destroy();
        items.delete(eid);
      }
    }
  }

  function drawWalls(index: number, inverted: boolean): void {
    const { layout } = data.segments[index]!;
    if (index !== drawnSegment) {
      setActiveLayout(layout);
      for (const ghost of ghosts.values()) {
        ghost.destroy();
      }
      ghosts.clear();
      looks.clear();
      syncItems([]);
      const size = playerDisplaySize();
      dotManBody.setDisplaySize(size, size);
      dotManVisor.setDisplaySize(size, size);
      lastPlayer = null;
    }
    const color = inverted ? invertRgb24(style.color) : style.color;
    const commands = wallPathCommands(
      layout.walls,
      layout.exterior,
      style.cornerRadius,
      undefined,
      undefined,
      layout.door,
    );
    strokeWallPath(walls, commands, { ...style, color }, 1);
    drawnSegment = index;
    drawnInverted = inverted;
  }

  function poseDotMan(player: { x: number; y: number; angle: number; tint: number | null }): void {
    const moved =
      lastPlayer === null ? 0 : Math.hypot(player.x - lastPlayer.x, player.y - lastPlayer.y);
    const snapPx = REPLAY_SNAP_TILES * data.segments[drawnSegment]!.tileSize;
    if (moved > 0 && moved <= snapPx) {
      chomp = advanceDotManChomp(chomp, moved, DOTMAN_CHOMP_PIXELS_PER_FRAME);
    }
    if (lastPlayer === null) {
      heading = player.angle;
    }
    lastPlayer = { x: player.x, y: player.y };
    heading = stepHeading(heading, player.angle, lastRealDeltaMs * speed);
    const pose = visorPose(heading);
    const lift =
      (dotManVisorLift(chomp, DOTMAN_CHOMP_PIXELS_PER_FRAME) * dotManBody.displayWidth) /
      DOTMAN_ART_SIZE_PX;
    dotMan.setPosition(player.x, player.y);
    dotManVisor.setPosition(Math.sin(pose.rotation) * lift, -Math.cos(pose.rotation) * lift);
    dotManVisor.setRotation(pose.rotation);
    dotManVisor.setFlipX(pose.flipX);
    for (const part of [dotManBody, dotManVisor]) {
      if (player.tint === null) {
        part.clearTint();
      } else {
        part.setTint(player.tint);
      }
    }
    dotMan.setVisible(true);
  }

  return {
    tick(realDeltaMs) {
      elapsedMs += realDeltaMs;
      lastRealDeltaMs = realDeltaMs;
      const cursor = replayCursor(data, elapsedMs);
      last = {
        segmentIndex: cursor.segmentIndex,
        segments: data.segments.length,
        level: data.segments[cursor.segmentIndex]!.level,
        speed,
        labelVisible: cursor.labelVisible,
        simMs: cursor.simMs,
        loops: cursor.loops,
      };
      const segment = data.segments[cursor.segmentIndex]!;
      const view = frameAt(segment, cursor.simMs);
      if (cursor.segmentIndex !== drawnSegment || view.mazeColorInverted !== drawnInverted) {
        drawWalls(cursor.segmentIndex, view.mazeColorInverted);
      }

      label.setText(cursor.labelVisible ? `LEVEL ${segment.level}` : "");
      if (cursor.labelVisible) {
        placePixelText(label, PLAYFIELD_WIDTH / 2, LABEL_Y, 0.5, 0.5);
      }

      rings.clear();
      dotMan.setVisible(false);
      for (const ghost of ghosts.values()) {
        ghost.container.setVisible(false);
      }
      if (cursor.labelVisible) {
        syncItems([]);
        return;
      }

      syncItems(itemsAt(segment, cursor.simMs));

      if (view.player !== null) {
        poseDotMan(view.player);
      }
      const seen = new Set<number>();
      for (const ghost of view.ghosts) {
        seen.add(ghost.eid);
        let sprite = ghosts.get(ghost.eid);
        if (sprite === undefined) {
          const drawableId =
            GHOST_DRAWABLE_BY_KIND[ghost.kind as keyof typeof GHOST_DRAWABLE_BY_KIND] ??
            BLINKY_DRAWABLE_ID;
          sprite = addGhostSprite(scene, drawableId, ghost.x, ghost.y, actorDisplaySize());
          sprite.setDepth(CONTENT_DEPTH + 2);
          ghosts.set(ghost.eid, sprite);
        }
        if (looks.get(ghost.eid) !== ghost.look) {
          sprite.setLook(ghost.look);
          looks.set(ghost.eid, ghost.look);
        }
        sprite.setPosition(ghost.x, ghost.y);
        sprite.container.setVisible(true);
      }
      for (const [eid, sprite] of ghosts) {
        if (!seen.has(eid)) {
          sprite.destroy();
          ghosts.delete(eid);
          looks.delete(eid);
        }
      }

      for (const death of segment.deaths) {
        const age = (cursor.simMs - death.t) / deathRingSimMs;
        if (age >= 0 && age < 1) {
          rings.lineStyle(2, DEATH_COLOR, 1 - age);
          rings.strokeCircle(death.x, death.y, playerDisplaySize() * (0.5 + age * 1.5));
        }
      }
    },
    state: () => last,
  };
}
