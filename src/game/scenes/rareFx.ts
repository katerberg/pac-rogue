import Phaser from "phaser";

const HALO_PEAK_ALPHA = 0.85;
const HALO_PULSE_MIN = 0.5;
const HALO_PULSE_MS = 900;
const WALL_HALO_REACH = 4;
const WALL_HALO_STACK_ALPHA = 0.3;

type RareFx = { destroy: () => void };
type HaloDraw = (halo: Phaser.GameObjects.Graphics, color: number) => void;
export type HaloRect = { x: number; y: number; w: number; h: number };

function rectHalo(width: number, height: number): HaloDraw {
  const reach = Math.max(4, Math.round(Math.min(width, height) * 0.12));
  return (halo, color) => {
    for (let step = 1; step <= reach; step += 1) {
      const falloff = 1 - step / (reach + 1);
      halo.lineStyle(1, color, HALO_PEAK_ALPHA * falloff * falloff);
      halo.strokeRect(-width / 2 - step, -height / 2 - step, width + step * 2, height + step * 2);
    }
  };
}

export function rectsHalo(rects: readonly HaloRect[]): HaloDraw {
  return (halo, color) => {
    for (let step = WALL_HALO_REACH; step >= 1; step -= 1) {
      const falloff = 1 - step / (WALL_HALO_REACH + 1);
      halo.fillStyle(color, HALO_PEAK_ALPHA * falloff * falloff * WALL_HALO_STACK_ALPHA);
      for (const r of rects) {
        halo.fillRect(r.x - step, r.y - step, r.w + step * 2, r.h + step * 2);
      }
    }
  };
}

function addHalo(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  color: number,
  draw: HaloDraw,
): RareFx {
  const halo = scene.add.graphics();
  draw(halo, color);
  container.addAt(halo, 0);

  const tween = scene.tweens.add({
    targets: halo,
    alpha: { from: 1, to: HALO_PULSE_MIN },
    duration: HALO_PULSE_MS,
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  });
  const destroy = (): void => {
    tween.remove();
    halo.destroy();
  };
  container.once(Phaser.GameObjects.Events.DESTROY, destroy);
  return {
    destroy: () => {
      container.off(Phaser.GameObjects.Events.DESTROY, destroy);
      destroy();
    },
  };
}

export function addRareFx(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  width: number,
  height: number,
  color: number,
): RareFx {
  return addHalo(scene, container, color, rectHalo(width, height));
}

export function createRareFxToggle(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  draw: HaloDraw,
): (rare: boolean, color: number) => void {
  let shownColor: number | null = null;
  let fx: RareFx | null = null;
  return (rare, color) => {
    const next = rare ? color : null;
    if (next === shownColor) {
      return;
    }
    fx?.destroy();
    fx = next === null ? null : addHalo(scene, container, next, draw);
    shownColor = next;
  };
}
