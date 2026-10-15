import Phaser from "phaser";
import {
  POWER_PELLET_BREAK_COLOR,
  powerPelletBreakLook,
  powerPelletQuarterRestOffset,
} from "../../domain/powerPelletBreak";
import { powerPelletDisplaySize } from "../../domain/maze";

const BREAK_DEPTH = 200;

export type PowerPelletBreakEvent = {
  id: number;
  x: number;
  y: number;
  facingDx: number;
  facingDy: number;
  progress: number;
};

export type PowerPelletBreakFx = {
  apply: (event: PowerPelletBreakEvent) => void;
  clear: () => void;
};

/**
 * Texture crops are not used: `power-pellet.png` is a tiny centered blob on a
 * transparent 16×16 canvas, so NW/NE/SW/SE crops of the file are nearly empty.
 */
export function createPowerPelletBreakFx(scene: Phaser.Scene): PowerPelletBreakFx {
  const piecesById = new Map<number, Phaser.GameObjects.Rectangle[]>();
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

  const ensurePieces = (id: number): Phaser.GameObjects.Rectangle[] => {
    const existing = piecesById.get(id);
    if (existing) {
      return existing;
    }
    const pieces = [0, 1, 2, 3].map(() =>
      scene.add
        .rectangle(0, 0, quarterSize, quarterSize, POWER_PELLET_BREAK_COLOR)
        .setDepth(BREAK_DEPTH),
    );
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
