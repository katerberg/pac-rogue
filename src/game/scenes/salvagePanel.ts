import Phaser from "phaser";
import {
  salvageAlertFrame,
  salvageSelectionStep,
  trinketToastAlpha,
  type SalvageKey,
} from "../../domain/salvagePanel";
import { schoolArtTextureKey } from "../../domain/schoolArt";
import { UPGRADE_HUD_COLUMNS } from "../../domain/upgradeHud";
import { getUpgradeDef, type UpgradeId } from "../../domain/upgrades";
import { wrapText } from "../../domain/wrapText";
import { upgradeIconTexture } from "../upgradeArt";
import {
  addPixelText,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";
import { MODAL_DEPTH, SCHOOL_COLORS } from "./upgradeChoiceModal";

const DEPTH = MODAL_DEPTH + 10;
const ALERT_RED = 0xff3030;
const SELECT_PAD = 3;
const DASH = 3;
const TEXT_LINE = 12;
const DESCRIPTION_CHARS = 20;

export type PanelItem = { id: UpgradeId; x: number; y: number; size: number };
export type PanelText = { x: number; y: number };
export type SalvagePanelMode = "alert" | "select";

export type SalvagePanel = {
  mode: () => SalvagePanelMode | null;
  selected: () => number | null;
  open: (options: {
    items: readonly PanelItem[];
    text: PanelText;
    alert: boolean;
    cancellable: boolean;
    start?: number;
    onPick: (id: UpgradeId, index: number) => void;
    onClose?: () => void;
  }) => void;
  toast: (gained: UpgradeId | null, target: PanelItem | null, text: PanelText) => void;
  tick: (deltaMs: number, escDown: boolean) => void;
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

function dashedSquare(graphics: Phaser.GameObjects.Graphics, item: PanelItem): void {
  const half = item.size / 2 + SELECT_PAD;
  const left = item.x - half;
  const top = item.y - half;
  const span = half * 2;
  for (let d = 0; d < span; d += DASH * 2) {
    const len = Math.min(DASH, span - d);
    graphics.fillRect(left + d, top, len, 2);
    graphics.fillRect(left + d, top + span - 2, len, 2);
    graphics.fillRect(left, top + d, 2, len);
    graphics.fillRect(left + span - 2, top + d, 2, len);
  }
}

export function createSalvagePanel(scene: Phaser.Scene): SalvagePanel {
  const keyboard = scene.input.keyboard;
  const { KeyCodes } = Phaser.Input.Keyboard;
  const codes: Record<Exclude<SalvageKey, "cancel">, number[]> = {
    up: [KeyCodes.UP, KeyCodes.W],
    down: [KeyCodes.DOWN, KeyCodes.S],
    left: [KeyCodes.LEFT, KeyCodes.A],
    right: [KeyCodes.RIGHT, KeyCodes.D],
    confirm: [KeyCodes.ENTER, KeyCodes.SPACE, KeyCodes.T],
  };
  const keys = Object.entries(codes).map(([name, list]) => ({
    name: name as SalvageKey,
    keys: keyboard === null ? [] : list.map((code) => keyboard.addKey(code)),
  }));

  let mode: SalvagePanelMode | null = null;
  let parts: Phaser.GameObjects.GameObject[] = [];
  let toastParts: Phaser.GameObjects.GameObject[] = [];
  let toastElapsed = 0;
  let toastText: Phaser.GameObjects.BitmapText | null = null;
  let armed = false;
  let elapsed = 0;
  let index = 0;
  let redraw: () => void = () => {};
  let onKey: (key: SalvageKey) => void = () => {};

  const track = <T extends Phaser.GameObjects.GameObject>(
    list: Phaser.GameObjects.GameObject[],
    part: T,
  ): T => {
    (part as unknown as Phaser.GameObjects.Components.Depth).setDepth(DEPTH);
    list.push(part);
    return part;
  };

  const clear = (): void => {
    parts.forEach((part) => part.destroy());
    parts = [];
    mode = null;
  };

  const clearToast = (): void => {
    toastParts.forEach((part) => part.destroy());
    toastParts = [];
    toastText = null;
  };

  const anyHeld = (): boolean => keys.some(({ keys: list }) => list.some((key) => key.isDown));

  const text = (at: PanelText, line: number, content: string, color: number) => {
    const label = track(
      parts,
      addPixelText(scene, at.x, at.y, content, UPGRADES_HUD_FONT_SIZE, color),
    );
    placePixelText(label, at.x, at.y + line * TEXT_LINE, 0.5, 0);
    return label;
  };

  return {
    mode: () => mode,
    selected: () => (mode === "select" ? index : null),

    open: ({ items, text: at, alert, cancellable, start = 0, onPick, onClose }) => {
      clear();
      clearToast();
      mode = alert ? "alert" : "select";
      elapsed = 0;
      armed = !anyHeld();
      index = alert ? items.length - 1 : start;
      const newest = alert ? items[items.length - 1] : undefined;
      items.forEach((item) => {
        const icon = track(
          parts,
          scene.add
            .image(item.x, item.y, upgradeIconTexture(item.id))
            .setDisplaySize(item.size, item.size),
        );
        icon.setInteractive({ useHandCursor: true });
        icon.on("pointerover", () => {
          if (mode === "select") {
            index = items.indexOf(item);
            redraw();
          }
        });
        icon.on("pointerdown", () => {
          if (mode === "select") {
            clear();
            onPick(item.id, items.indexOf(item));
          }
        });
      });
      const outline = track(parts, scene.add.graphics());
      const selector = track(parts, scene.add.graphics());
      const alertBand =
        newest === undefined
          ? null
          : track(
              parts,
              scene.add.rectangle(newest.x, newest.y, newest.size + 8, 22, 0x000000, 0.85),
            );
      const alertLabel =
        newest === undefined
          ? null
          : track(
              parts,
              addPixelText(
                scene,
                newest.x,
                newest.y,
                "SLOTS\nFULL",
                UPGRADES_HUD_FONT_SIZE,
                ALERT_RED,
              ),
            );
      if (alertLabel !== null && newest !== undefined) {
        placePixelText(alertLabel, newest.x, newest.y, 0.5, 0.5);
      }
      const header = text(at, 0, cancellable ? "SALVAGE WHICH?" : "SALVAGE REQUIRED", ALERT_RED);
      const name = text(at, 2, "", TEXT_COLOR_YELLOW);
      const body = text(at, 3, "", TEXT_COLOR_WHITE);
      const hint = text(
        at,
        8,
        cancellable ? "ENTER: SALVAGE\nESC: BACK" : "ENTER: SALVAGE",
        TEXT_COLOR_WHITE,
      );

      redraw = () => {
        const frame = salvageAlertFrame(alert ? elapsed : Number.POSITIVE_INFINITY);
        mode = frame.phase;
        outline.clear();
        if (newest !== undefined && frame.outlineVisible) {
          outline.fillStyle(ALERT_RED, 1);
          dashedSquare(outline, newest);
        }
        alertLabel?.setVisible(frame.phase === "alert");
        alertBand?.setVisible(frame.phase === "alert");
        const selecting = frame.phase === "select";
        selector.clear();
        header.setVisible(selecting);
        hint.setVisible(selecting);
        name.setVisible(selecting);
        body.setVisible(selecting);
        const current = items[index];
        if (!selecting || current === undefined) {
          return;
        }
        selector.lineStyle(2, TEXT_COLOR_YELLOW, 1);
        const half = current.size / 2 + SELECT_PAD + 2;
        selector.strokeRect(current.x - half, current.y - half, half * 2, half * 2);
        const def = getUpgradeDef(current.id);
        name.setText(def.label);
        placePixelText(name, at.x, at.y + 2 * TEXT_LINE, 0.5, 0);
        body.setText(wrapText(def.description, DESCRIPTION_CHARS));
        placePixelText(body, at.x, at.y + 3 * TEXT_LINE, 0.5, 0);
        const hintY = at.y + 3 * TEXT_LINE + body.getTextBounds(true).local.height + TEXT_LINE;
        placePixelText(hint, at.x, hintY, 0.5, 0);
      };
      onKey = (key) => {
        const step = salvageSelectionStep(
          index,
          key,
          items.length,
          UPGRADE_HUD_COLUMNS,
          cancellable,
        );
        index = step.index;
        if (step.outcome === "salvage" && items[index] !== undefined) {
          const picked = items[index]!;
          clear();
          onPick(picked.id, index);
        } else if (step.outcome === "close") {
          clear();
          onClose?.();
        } else {
          redraw();
        }
      };
      redraw();
    },

    toast: (gained, target, at) => {
      clearToast();
      toastElapsed = 0;
      const label = gained === null ? "+1 QUARTER" : `+ ${getUpgradeDef(gained).label}`;
      toastText = track(
        toastParts,
        addPixelText(
          scene,
          at.x,
          at.y,
          wrapText(label, DESCRIPTION_CHARS),
          UPGRADES_HUD_FONT_SIZE,
          TEXT_COLOR_YELLOW,
        ),
      );
      placePixelText(toastText, at.x, at.y, 0.5, 0);
      if (target !== null) {
        const ring = track(toastParts, scene.add.graphics());
        ring.lineStyle(1, TEXT_COLOR_YELLOW, 1);
        const half = target.size / 2 + 2;
        ring.strokeRect(target.x - half, target.y - half, half * 2, half * 2);
      }
    },

    tick: (deltaMs, escDown) => {
      if (toastParts.length > 0) {
        toastElapsed += deltaMs;
        const alpha = trinketToastAlpha(toastElapsed);
        toastParts.forEach((part) =>
          (part as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(alpha),
        );
        if (alpha === 0) {
          clearToast();
        }
      }
      if (mode === null) {
        return;
      }
      elapsed += deltaMs;
      if (mode === "alert") {
        redraw();
        return;
      }
      if (!armed) {
        armed = !anyHeld();
        return;
      }
      if (escDown) {
        onKey("cancel");
        return;
      }
      const pressed = keys.find(({ keys: list }) =>
        list.some((key) => Phaser.Input.Keyboard.JustDown(key)),
      );
      if (pressed !== undefined) {
        onKey(pressed.name);
      }
    },

    destroy: () => {
      clear();
      clearToast();
    },
  };
}
