import type { GhostDir } from "../../domain/ghostPath";
import { ghostPupilLookOffset } from "../../domain/ghostPupils";
import { advanceGhostSkirtPhase } from "../../domain/ghostSkirt";
import type { IntermissionFrame } from "../../domain/intermission";
import {
  INTERMISSION_ACTOR_SIZE,
  INTERMISSION_PEEL_SIZE,
  INTERMISSION_PELLET_SIZE,
  INTERMISSION_SHIELD_SIZE,
  type IntermissionActor,
  type IntermissionGhostLook,
} from "../../domain/intermissionScript";
import {
  addBananaPeelIcon,
  addBubbleShieldIcon,
  addDotManIcon,
  addGhostSprite,
  addPowerPelletIcon,
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
  const ghost = addGhostSprite(scene, drawableId, 0, 0, INTERMISSION_ACTOR_SIZE);
  ghost.setDepth(INTERMISSION_DEPTH);
  let lastX: number | null = null;
  let skirtPhase = 0;
  let lastFacing: GhostDir | null = null;
  let lastLook: IntermissionGhostLook = "normal";
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
      if (actor.facing !== lastFacing) {
        lastFacing = actor.facing;
        ghost.setPupilLook(ghostPupilLookOffset(actor.facing));
      }
      const look = actor.look ?? "normal";
      if (look !== lastLook) {
        lastLook = look;
        ghost.setLook(look);
      }
      ghost.container.setAlpha(actor.alpha ?? 1);
      ghost.setPosition(actor.x, actor.y);
    },
    destroy: () => ghost.destroy(),
  };
}

function dotManView(scene: Phaser.Scene): ActorView {
  const dotMan = addDotManIcon(scene, 0, 0, INTERMISSION_ACTOR_SIZE);
  dotMan.setDepth(INTERMISSION_DEPTH);
  const parts = dotMan.list as Phaser.GameObjects.Image[];
  return {
    place(actor) {
      if (actor.kind !== "dotMan") {
        return;
      }
      const scale = (actor.size ?? INTERMISSION_ACTOR_SIZE) / INTERMISSION_ACTOR_SIZE;
      dotMan.setScale(actor.flipX === true ? -scale : scale, scale);
      parts.forEach((part) =>
        actor.tint === undefined ? part.clearTint() : part.setTint(actor.tint),
      );
      dotMan.setAlpha(actor.alpha ?? 1);
      dotMan.setPosition(Math.round(actor.x), Math.round(actor.y));
    },
    destroy: () => dotMan.destroy(),
  };
}

function objectView(object: Phaser.GameObjects.Image): ActorView {
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
      return dotManView(scene);
    case "powerPellet":
      return objectView(addPowerPelletIcon(scene, 0, 0, INTERMISSION_PELLET_SIZE));
    case "bananaPeel":
      return objectView(addBananaPeelIcon(scene, 0, 0, INTERMISSION_PEEL_SIZE));
    case "bubbleShield":
      return objectView(addBubbleShieldIcon(scene, 0, 0, INTERMISSION_SHIELD_SIZE));
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
