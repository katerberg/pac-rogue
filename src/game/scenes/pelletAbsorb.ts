import Phaser from "phaser";
import {
  PELLET_ABSORB_MS,
  pelletAbsorbLook,
  type PelletAbsorbPoint,
} from "../../domain/pelletAbsorb";

type PelletAbsorbEvent = {
  x: number;
  y: number;
  color: number;
  radius: number;
};

/** Above crisp pellets (0), under typical actor sprites (~10+) and turn sparks (50). */
const ABSORB_DEPTH = 8;
const LIVE_KEY = "pelletAbsorbs";

type LiveAbsorb = {
  destroy: () => void;
};

function liveFor(scene: Phaser.Scene): LiveAbsorb[] {
  const existing = scene.data.get(LIVE_KEY) as LiveAbsorb[] | undefined;
  if (existing !== undefined) {
    return existing;
  }
  const created: LiveAbsorb[] = [];
  scene.data.set(LIVE_KEY, created);
  return created;
}

export function killPelletAbsorbs(scene: Phaser.Scene): void {
  const live = liveFor(scene);
  for (const fx of live.splice(0)) {
    fx.destroy();
  }
}

export function playPelletAbsorb(
  scene: Phaser.Scene,
  event: PelletAbsorbEvent,
  getTarget: () => PelletAbsorbPoint | null,
): void {
  const from = { x: event.x, y: event.y };
  const graphics = scene.add.graphics().setDepth(ABSORB_DEPTH);
  const clock = { progress: 0 };
  const live = liveFor(scene);
  let dead = false;
  const destroyFx = (): void => {
    if (dead) {
      return;
    }
    dead = true;
    const index = live.findIndex((entry) => entry.destroy === destroyFx);
    if (index >= 0) {
      live.splice(index, 1);
    }
    scene.tweens.killTweensOf(clock);
    graphics.destroy();
  };
  const draw = (): void => {
    const to = getTarget();
    if (to === null) {
      destroyFx();
      return;
    }
    const look = pelletAbsorbLook(clock.progress, from, to, event.radius);
    graphics.clear();
    if (look.alpha <= 0) {
      return;
    }
    graphics.fillStyle(event.color, look.alpha);
    drawGum(graphics, look.near, look.far, look.midWidth);
  };
  scene.tweens.add({
    targets: clock,
    progress: 1,
    duration: PELLET_ABSORB_MS,
    onUpdate: draw,
    onComplete: destroyFx,
  });
  live.push({ destroy: destroyFx });
  scene.events.once("shutdown", destroyFx);
  draw();
}

function drawGum(
  graphics: Phaser.GameObjects.Graphics,
  near: { x: number; y: number; r: number },
  far: { x: number; y: number; r: number },
  midWidth: number,
): void {
  const dx = near.x - far.x;
  const dy = near.y - far.y;
  const len = Math.hypot(dx, dy);
  if (len > 0.01 && midWidth > 0) {
    const nx = -dy / len;
    const ny = dx / len;
    const hw = midWidth * 0.5;
    graphics.fillPoints(
      [
        new Phaser.Math.Vector2(far.x + nx * hw, far.y + ny * hw),
        new Phaser.Math.Vector2(near.x + nx * hw, near.y + ny * hw),
        new Phaser.Math.Vector2(near.x - nx * hw, near.y - ny * hw),
        new Phaser.Math.Vector2(far.x - nx * hw, far.y - ny * hw),
      ],
      true,
    );
  }
  if (far.r > 0) {
    graphics.fillCircle(far.x, far.y, far.r);
  }
  if (near.r > 0) {
    graphics.fillCircle(near.x, near.y, near.r);
  }
}
