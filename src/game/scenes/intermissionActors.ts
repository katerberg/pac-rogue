import { ghostPupilLookOffset } from "../../domain/ghostPupils";
import { advanceGhostSkirtPhase } from "../../domain/ghostSkirt";
import type { IntermissionFrame } from "../../domain/intermission";
import {
  INTERMISSION_ACTOR_SIZE,
  INTERMISSION_PEEL_SIZE,
  INTERMISSION_PELLET_SIZE,
  type IntermissionActor,
} from "../../domain/intermissionScript";
import {
  addBananaPeelIcon,
  addDotManIcon,
  addGhostSprite,
  addPowerPelletIcon,
  type GhostSpriteHandle,
} from "../systems/render";

const INTERMISSION_DEPTH = 700;

export type IntermissionActors = {
  place(frame: IntermissionFrame): void;
  destroy(): void;
};

type ActorView = {
  place(actor: IntermissionActor): void;
  destroy(): void;
};

function ghostView(scene: Phaser.Scene, drawableId: string): ActorView {
  const ghost: GhostSpriteHandle = addGhostSprite(scene, drawableId, 0, 0, INTERMISSION_ACTOR_SIZE);
  ghost.setDepth(INTERMISSION_DEPTH);
  let lastX: number | null = null;
  let skirtPhase = 0;
  return {
    place(actor) {
      if (actor.kind !== "ghost") {
        return;
      }
      if (lastX !== null) {
        skirtPhase = advanceGhostSkirtPhase(skirtPhase, actor.x - lastX, INTERMISSION_ACTOR_SIZE);
        ghost.setSkirtPhase(skirtPhase);
      }
      lastX = actor.x;
      ghost.setPupilLook(ghostPupilLookOffset(actor.facing));
      ghost.setPosition(actor.x, actor.y);
    },
    destroy: () => ghost.destroy(),
  };
}

function objectView(object: Phaser.GameObjects.Image | Phaser.GameObjects.Container): ActorView {
  object.setDepth(INTERMISSION_DEPTH);
  return {
    place: (actor) => object.setPosition(Math.round(actor.x), Math.round(actor.y)),
    destroy: () => object.destroy(),
  };
}

function createView(scene: Phaser.Scene, actor: IntermissionActor): ActorView {
  switch (actor.kind) {
    case "ghost":
      return ghostView(scene, actor.drawableId);
    case "dotMan":
      return objectView(addDotManIcon(scene, 0, 0, INTERMISSION_ACTOR_SIZE));
    case "powerPellet":
      return objectView(addPowerPelletIcon(scene, 0, 0, INTERMISSION_PELLET_SIZE));
    case "bananaPeel":
      return objectView(addBananaPeelIcon(scene, 0, 0, INTERMISSION_PEEL_SIZE));
  }
}

export function createIntermissionActors(scene: Phaser.Scene): IntermissionActors {
  const views = new Map<string, ActorView>();
  return {
    place(frame) {
      const present = new Set(frame.actors.map((actor) => actor.key));
      for (const [key, view] of views) {
        if (!present.has(key)) {
          view.destroy();
          views.delete(key);
        }
      }
      for (const actor of frame.actors) {
        let view = views.get(actor.key);
        if (view === undefined) {
          view = createView(scene, actor);
          views.set(actor.key, view);
        }
        view.place(actor);
      }
    },
    destroy() {
      views.forEach((view) => view.destroy());
      views.clear();
    },
  };
}
