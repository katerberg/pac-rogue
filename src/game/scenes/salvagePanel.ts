import Phaser from "phaser";
import { trinketToastAlpha, type SalvageKey } from "../../domain/salvagePanel";
import { schoolArtTextureKey } from "../../domain/schoolArt";
import { getUpgradeDef, type UpgradeId } from "../../domain/upgrades";
import { wrapText } from "../../domain/wrapText";
import {
  addPixelText,
  placePixelText,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";
import { MODAL_DEPTH, SCHOOL_COLORS } from "./upgradeChoiceModal";

const DEPTH = MODAL_DEPTH + 10;
export const ALERT_RED = 0xff3030;
const TEXT_LINE_SPACING = 3;
const DESCRIPTION_CHARS = 20;

export type PanelItem = { id: UpgradeId; x: number; y: number; size: number };
export type PanelText = { x: number; y: number };
export type TrinketToast = {
  show: (gained: UpgradeId | null, target: PanelItem | null, text: PanelText) => void;
  tick: (deltaMs: number) => void;
  destroy: () => void;
};

export function addTrinketCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Container {
  const back = scene.add
    .rectangle(0, 0, size, size, 0x101820)
    .setStrokeStyle(1, SCHOOL_COLORS.neutral);
  const art = scene.add
    .image(0, 0, schoolArtTextureKey("neutral"))
    .setDisplaySize(size * 0.75, size * 0.75);
  return scene.add.container(x, y, [back, art]).setSize(size, size);
}

export type SalvageKeys = { pressed: () => SalvageKey | null; anyHeld: () => boolean };

export function createSalvageKeys(scene: Phaser.Scene): SalvageKeys {
  const keyboard = scene.input.keyboard;
  const { KeyCodes } = Phaser.Input.Keyboard;
  const codes: Record<SalvageKey, number[]> = {
    up: [KeyCodes.UP, KeyCodes.W],
    down: [KeyCodes.DOWN, KeyCodes.S],
    left: [KeyCodes.LEFT, KeyCodes.A],
    right: [KeyCodes.RIGHT, KeyCodes.D],
    confirm: [KeyCodes.ENTER, KeyCodes.SPACE],
  };
  const keys = Object.entries(codes).map(([name, list]) => ({
    name: name as SalvageKey,
    keys: keyboard === null ? [] : list.map((code) => keyboard.addKey(code)),
  }));
  return {
    pressed: () =>
      keys.find(({ keys: list }) => list.some((key) => Phaser.Input.Keyboard.JustDown(key)))
        ?.name ?? null,
    anyHeld: () => keys.some(({ keys: list }) => list.some((key) => key.isDown)),
  };
}

export function createTrinketToast(scene: Phaser.Scene): TrinketToast {
  let parts: Phaser.GameObjects.GameObject[] = [];
  let elapsed = 0;

  const track = <T extends Phaser.GameObjects.GameObject>(part: T): T => {
    (part as unknown as Phaser.GameObjects.Components.Depth).setDepth(DEPTH);
    parts.push(part);
    return part;
  };

  const clear = (): void => {
    parts.forEach((part) => part.destroy());
    parts = [];
  };

  return {
    show: (gained, target, at) => {
      clear();
      elapsed = 0;
      const label = gained === null ? "+1 QUARTER" : `+ ${getUpgradeDef(gained).label}`;
      const text = track(
        addPixelText(
          scene,
          at.x,
          at.y,
          wrapText(label, DESCRIPTION_CHARS),
          UPGRADES_HUD_FONT_SIZE,
          TEXT_COLOR_YELLOW,
        ).setLineSpacing(TEXT_LINE_SPACING),
      );
      placePixelText(text, at.x, at.y, 0.5, 0);
      if (target !== null) {
        const ring = track(scene.add.graphics());
        ring.lineStyle(1, TEXT_COLOR_YELLOW, 1);
        const half = target.size / 2 + 2;
        ring.strokeRect(target.x - half, target.y - half, half * 2, half * 2);
      }
    },

    tick: (deltaMs) => {
      if (parts.length === 0) {
        return;
      }
      elapsed += deltaMs;
      const alpha = trinketToastAlpha(elapsed);
      parts.forEach((part) =>
        (part as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(alpha),
      );
      if (alpha === 0) {
        clear();
      }
    },

    destroy: clear,
  };
}
