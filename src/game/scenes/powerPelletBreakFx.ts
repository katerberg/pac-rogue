import Phaser from "phaser";
import {
  POWER_PELLET_ART_SIZE_PX,
  POWER_PELLET_QUARTER_ART_PX,
  powerPelletBreakLook,
  powerPelletQuarterRestOffset,
  type PowerPelletQuarterId,
} from "../../domain/powerPelletBreak";
import { powerPelletDisplaySize } from "../../domain/maze";
import { POWER_PELLET_TEXTURE_KEY } from "../systems/render";

const BREAK_DEPTH = 40;

const QUARTER_FRAME: Record<PowerPelletQuarterId, string> = {
  nw: "pp-nw",
  ne: "pp-ne",
  sw: "pp-sw",
  se: "pp-se",
};

export type PowerPelletBreakEvent = {
  id: number;
  x: number;
  y: number;
  facingDx: number;
  facingDy: number;
  progress: number;
};

export function ensurePowerPelletBreakFrames(scene: Phaser.Scene): void {
  const tex = scene.textures.get(POWER_PELLET_TEXTURE_KEY);
  if (!tex || tex.key === "__MISSING") {
    return;
  }
  if (tex.has(QUARTER_FRAME.nw)) {
    return;
  }
  const q = POWER_PELLET_QUARTER_ART_PX;
  tex.add(QUARTER_FRAME.nw, 0, 0, 0, q, q);
  tex.add(QUARTER_FRAME.ne, 0, q, 0, q, q);
  tex.add(QUARTER_FRAME.sw, 0, 0, q, q, q);
  tex.add(QUARTER_FRAME.se, 0, q, q, q, q);
}

export type PowerPelletBreakFx = {
  apply: (event: PowerPelletBreakEvent) => void;
  clear: () => void;
};

export function createPowerPelletBreakFx(scene: Phaser.Scene): PowerPelletBreakFx {
  ensurePowerPelletBreakFrames(scene);
  const piecesById = new Map<number, Phaser.GameObjects.Image[]>();
  const pelletSize = powerPelletDisplaySize();
  const quarterSize = pelletSize / 2;

  const destroyBreak = (id: number): void => {
    const pieces = piecesById.get(id);
    if (!pieces) {
      return;
    }
    for (const piece of pieces) {
      piece.destroy();
    }
    piecesById.delete(id);
  };

  const ensurePieces = (id: number): Phaser.GameObjects.Image[] => {
    const existing = piecesById.get(id);
    if (existing) {
      return existing;
    }
    const looks = powerPelletBreakLook(0, { dx: 0, dy: 0 });
    const pieces = looks.map((look) => {
      const image = scene.add
        .image(0, 0, POWER_PELLET_TEXTURE_KEY, QUARTER_FRAME[look.id])
        .setDisplaySize(quarterSize, quarterSize)
        .setDepth(BREAK_DEPTH);
      return image;
    });
    piecesById.set(id, pieces);
    return pieces;
  };

  return {
    apply(event: PowerPelletBreakEvent): void {
      if (event.progress >= 1) {
        destroyBreak(event.id);
        return;
      }
      const pieces = ensurePieces(event.id);
      const looks = powerPelletBreakLook(event.progress, {
        dx: event.facingDx,
        dy: event.facingDy,
      });
      for (const [i, look] of looks.entries()) {
        const piece = pieces[i]!;
        const rest = powerPelletQuarterRestOffset(look.id, pelletSize);
        piece
          .setPosition(event.x + rest.x + look.offsetX, event.y + rest.y + look.offsetY)
          .setRotation(look.rotation)
          .setAlpha(look.alpha);
      }
    },
    clear(): void {
      for (const id of [...piecesById.keys()]) {
        destroyBreak(id);
      }
    },
  };
}

/** Art size kept for tests / callers that assert crop geometry. */
export const POWER_PELLET_BREAK_ART = {
  full: POWER_PELLET_ART_SIZE_PX,
  quarter: POWER_PELLET_QUARTER_ART_PX,
} as const;
