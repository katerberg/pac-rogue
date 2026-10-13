import Phaser from "phaser";
import { INTERMISSION_ACTOR_SIZE, type IntermissionFrame } from "../../domain/intermission";
import { BLINKY_DRAWABLE_ID } from "../../domain/playfield";
import { addDotManIcon, addGhostSprite } from "../systems/render";
import type { GhostStyle } from "../../domain/ghostArt";

const INTERMISSION_DEPTH = 700;

export type IntermissionActors = {
  place(frame: IntermissionFrame): void;
  destroy(): void;
};

export function createIntermissionActors(
  scene: Phaser.Scene,
  style: GhostStyle,
): IntermissionActors {
  const blinky = addGhostSprite(scene, BLINKY_DRAWABLE_ID, 0, 0, INTERMISSION_ACTOR_SIZE, style);
  const dotMan = addDotManIcon(scene, 0, 0, INTERMISSION_ACTOR_SIZE, style);
  blinky.setDepth(INTERMISSION_DEPTH);
  dotMan.setDepth(INTERMISSION_DEPTH);
  return {
    place(frame) {
      blinky.setPosition(frame.blinkyX, frame.y + frame.bobPx);
      dotMan.setPosition(frame.dotManX, frame.y - frame.bobPx);
    },
    destroy() {
      blinky.destroy();
      dotMan.destroy();
    },
  };
}
