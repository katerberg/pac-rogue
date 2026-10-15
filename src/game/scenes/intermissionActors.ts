import { ghostPupilLookOffset } from "../../domain/ghostPupils";
import { GHOST_DIR } from "../../domain/ghostPath";
import { advanceGhostSkirtPhase } from "../../domain/ghostSkirt";
import { INTERMISSION_ACTOR_SIZE, type IntermissionFrame } from "../../domain/intermission";
import { BLINKY_DRAWABLE_ID } from "../../domain/playfield";
import { addDotManIcon, addGhostSprite } from "../systems/render";

const INTERMISSION_DEPTH = 700;

export type IntermissionActors = {
  place(frame: IntermissionFrame): void;
  destroy(): void;
};

export function createIntermissionActors(scene: Phaser.Scene): IntermissionActors {
  // Chase runs left→right with Dot-Man ahead; pupils look forward at him.
  const blinky = addGhostSprite(
    scene,
    BLINKY_DRAWABLE_ID,
    0,
    0,
    INTERMISSION_ACTOR_SIZE,
    ghostPupilLookOffset(GHOST_DIR.right),
  );
  const dotMan = addDotManIcon(scene, 0, 0, INTERMISSION_ACTOR_SIZE);
  blinky.setDepth(INTERMISSION_DEPTH);
  dotMan.setDepth(INTERMISSION_DEPTH);
  let lastBlinkyX: number | null = null;
  let skirtPhase = 0;
  return {
    place(frame) {
      const x = frame.blinkyX;
      const y = frame.y + frame.bobPx;
      if (lastBlinkyX !== null) {
        skirtPhase = advanceGhostSkirtPhase(skirtPhase, x - lastBlinkyX, INTERMISSION_ACTOR_SIZE);
        blinky.setSkirtPhase(skirtPhase);
      }
      lastBlinkyX = x;
      blinky.setPosition(x, y);
      dotMan.setPosition(frame.dotManX, frame.y - frame.bobPx);
    },
    destroy() {
      blinky.destroy();
      dotMan.destroy();
    },
  };
}
