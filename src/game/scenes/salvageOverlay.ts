import Phaser from "phaser";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfieldBounds";
import {
  openSalvagePicker,
  salvagePickerStep,
  salvagePromptStep,
  trinketRevealDone,
  type SalvageKey,
  type SalvagePickerState,
  type SalvagePromptChoice,
} from "../../domain/salvagePicker";
import { schoolArtTextureKey } from "../../domain/schoolArt";
import { getUpgradeDef, type UpgradeId } from "../../domain/upgrades";
import { upgradeIconTexture } from "../upgradeArt";
import {
  addPixelText,
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  placePixelText,
  placeSelectableMenuOption,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";
import { buildUpgradeCardVisual, MODAL_DEPTH, SCHOOL_COLORS } from "./upgradeChoiceModal";

const DEPTH = MODAL_DEPTH + 10;
const CENTER_X = PLAYFIELD_WIDTH / 2;
const TITLE_Y = 130;
const CARD_Y = 270;
const BUTTONS_Y = 400;
const BUTTON_OFFSET_X = 130;
const ROW_START_Y = 190;
const ROW_GAP = 36;
const ROW_ICON_SIZE = 24;
const CONFIRM_Y = 470;
const HINT_Y = 520;
const FLY_MS = 450;
const CARD_WIDTH = 230;

export type SalvageOverlayMode = "prompt" | "picker" | "reveal";
export type PoolTarget = { x: number; y: number; size: number };

export type SalvageOverlay = {
  mode: () => SalvageOverlayMode | null;
  openPrompt: (incoming: UpgradeId, onChoose: (choice: SalvagePromptChoice) => void) => void;
  openPicker: (
    items: readonly UpgradeId[],
    options: {
      start?: number;
      confirming?: boolean;
      onPick: (id: UpgradeId) => void;
      onClose: () => void;
    },
  ) => void;
  reveal: (gained: UpgradeId | null, target: PoolTarget | null, onDone: () => void) => void;
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

export function createSalvageOverlay(scene: Phaser.Scene): SalvageOverlay {
  const keyboard = scene.input.keyboard;
  const { KeyCodes } = Phaser.Input.Keyboard;
  const keys = {
    up: [KeyCodes.UP, KeyCodes.W],
    down: [KeyCodes.DOWN, KeyCodes.S],
    left: [KeyCodes.LEFT, KeyCodes.A],
    right: [KeyCodes.RIGHT, KeyCodes.D],
    confirm: [KeyCodes.ENTER, KeyCodes.SPACE, KeyCodes.T],
  } satisfies Partial<Record<SalvageKey, number[]>>;
  const bound = Object.fromEntries(
    Object.entries(keys).map(([name, codes]) => [
      name,
      keyboard === null ? [] : codes.map((code) => keyboard.addKey(code)),
    ]),
  ) as Record<keyof typeof keys, Phaser.Input.Keyboard.Key[]>;

  let mode: SalvageOverlayMode | null = null;
  let parts: Phaser.GameObjects.GameObject[] = [];
  let armed = false;
  let onKey: ((key: SalvageKey) => void) | null = null;
  let revealElapsed = 0;
  let revealDismissed = false;
  let revealFinish: (() => void) | null = null;

  const anyHeld = (): boolean => Object.values(bound).some((list) => list.some((k) => k.isDown));
  const keydown = (): void => {
    if (mode === "reveal" && armed) {
      revealDismissed = true;
    }
  };
  keyboard?.on("keydown", keydown);

  const add = <T extends Phaser.GameObjects.GameObject>(part: T): T => {
    (part as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(DEPTH);
    parts.push(part);
    return part;
  };

  const clear = (): void => {
    for (const part of parts) {
      part.destroy();
    }
    parts = [];
    mode = null;
    onKey = null;
    revealFinish = null;
  };

  const begin = (next: SalvageOverlayMode): void => {
    clear();
    mode = next;
    armed = !anyHeld();
    add(
      scene.add
        .rectangle(
          CENTER_X,
          PLAYFIELD_HEIGHT / 2,
          PLAYFIELD_WIDTH,
          PLAYFIELD_HEIGHT,
          0x000000,
          0.92,
        )
        .setInteractive(),
    );
  };

  const title = (text: string): void => {
    const label = add(addPixelText(scene, CENTER_X, TITLE_Y, text, MENU_TITLE_FONT_SIZE));
    placePixelText(label, CENTER_X, TITLE_Y, 0.5, 0.5);
  };

  const hint = (text: string): void => {
    const label = add(addPixelText(scene, CENTER_X, HINT_Y, text, UPGRADES_HUD_FONT_SIZE));
    placePixelText(label, CENTER_X, HINT_Y, 0.5, 0.5);
  };

  const card = (id: UpgradeId | null, y: number): Phaser.GameObjects.Container => {
    const def = id === null ? null : getUpgradeDef(id);
    const visual = buildUpgradeCardVisual(scene, CENTER_X, y, {
      label: def?.label ?? "+1 QUARTER",
      description: def?.description ?? "No Trinket was left to give.",
      school: def?.school ?? "neutral",
      rare: def?.rare === true,
    });
    return add(visual.root);
  };

  const pressed = (name: keyof typeof keys): boolean =>
    bound[name].some((key) => Phaser.Input.Keyboard.JustDown(key));

  return {
    mode: () => mode,

    openPrompt: (incoming, onChoose) => {
      begin("prompt");
      title("SLOTS FULL");
      card(incoming, CARD_Y);
      let focus: SalvagePromptChoice = "salvageNew";
      const buttons: Record<SalvagePromptChoice, Phaser.GameObjects.BitmapText> = {
        salvageNew: add(addPixelText(scene, 0, 0, "", MENU_OPTION_FONT_SIZE)),
        replace: add(addPixelText(scene, 0, 0, "", MENU_OPTION_FONT_SIZE)),
      };
      const labels: Record<SalvagePromptChoice, string> = {
        salvageNew: "SALVAGE NEW",
        replace: "REPLACE...",
      };
      const draw = (): void => {
        for (const choice of ["salvageNew", "replace"] as const) {
          const x = CENTER_X + (choice === "salvageNew" ? -BUTTON_OFFSET_X : BUTTON_OFFSET_X);
          placeSelectableMenuOption(
            buttons[choice],
            labels[choice],
            focus === choice,
            x,
            BUTTONS_Y,
          );
        }
      };
      const choose = (choice: SalvagePromptChoice): void => {
        clear();
        onChoose(choice);
      };
      for (const choice of ["salvageNew", "replace"] as const) {
        buttons[choice].setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          choose(choice);
        });
      }
      onKey = (key) => {
        const step = salvagePromptStep(focus, key);
        focus = step.focus;
        if (step.outcome !== null) {
          choose(step.outcome);
        } else {
          draw();
        }
      };
      draw();
      hint("SALVAGE NEW TURNS THIS CARD INTO A TRINKET");
    },

    openPicker: (items, { start = 0, confirming = false, onPick, onClose }) => {
      begin("picker");
      title("SALVAGE");
      let state: SalvagePickerState = openSalvagePicker(start, confirming);
      const rows = items.map((id, index) => {
        const y = ROW_START_Y + index * ROW_GAP;
        const icon = add(
          scene.add
            .image(CENTER_X - 140, y, upgradeIconTexture(id))
            .setDisplaySize(ROW_ICON_SIZE, ROW_ICON_SIZE),
        );
        const text = add(addPixelText(scene, 0, 0, "", MENU_OPTION_FONT_SIZE));
        text.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          state = openSalvagePicker(index, true);
          draw();
        });
        return { id, icon, text, y };
      });
      const empty = add(addPixelText(scene, 0, 0, "NOTHING TO SALVAGE", MENU_OPTION_FONT_SIZE));
      placePixelText(empty, CENTER_X, ROW_START_Y, 0.5, 0.5);
      empty.setVisible(items.length === 0);
      const sure = add(addPixelText(scene, 0, 0, "", MENU_OPTION_FONT_SIZE));
      const yes = add(addPixelText(scene, 0, 0, "YES", MENU_OPTION_FONT_SIZE));
      const no = add(addPixelText(scene, 0, 0, "NO", MENU_OPTION_FONT_SIZE));
      const finish = (outcome: ReturnType<typeof salvagePickerStep>["outcome"]): void => {
        if (outcome === null) {
          draw();
          return;
        }
        clear();
        if (outcome.kind === "salvage") {
          onPick(items[outcome.index]!);
        } else {
          onClose();
        }
      };
      yes.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        finish({ kind: "salvage", index: state.index });
      });
      no.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        state = { ...state, confirming: false };
        draw();
      });
      const draw = (): void => {
        rows.forEach(({ id, text, y }, index) => {
          placeSelectableMenuOption(
            text,
            getUpgradeDef(id).label,
            index === state.index,
            CENTER_X,
            y,
          );
        });
        const label =
          items[state.index] === undefined ? "" : getUpgradeDef(items[state.index]!).label;
        sure.setText(`SALVAGE ${label.toUpperCase()}?`).setVisible(state.confirming);
        placePixelText(sure, CENTER_X, CONFIRM_Y - 24, 0.5, 0.5);
        yes.setVisible(state.confirming).setTint(state.yes ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
        no.setVisible(state.confirming).setTint(state.yes ? TEXT_COLOR_WHITE : TEXT_COLOR_YELLOW);
        placePixelText(yes, CENTER_X - 50, CONFIRM_Y + 8, 0.5, 0.5);
        placePixelText(no, CENTER_X + 50, CONFIRM_Y + 8, 0.5, 0.5);
      };
      onKey = (key) => {
        const step = salvagePickerStep(state, key, items.length);
        state = step.state;
        finish(step.outcome);
      };
      draw();
      hint("ENTER: PICK   ESC: BACK");
    },

    reveal: (gained, target, onDone) => {
      begin("reveal");
      title(gained === null ? "SALVAGED" : "NEW TRINKET");
      const root = card(gained, CARD_Y);
      revealElapsed = 0;
      revealDismissed = false;
      parts[0]!.on("pointerdown", () => {
        revealDismissed = true;
      });
      hint("ANY KEY");
      revealFinish = () => {
        revealFinish = null;
        const done = (): void => {
          clear();
          onDone();
        };
        if (target === null) {
          done();
          return;
        }
        scene.tweens.add({
          targets: root,
          x: target.x,
          y: target.y,
          scale: target.size / CARD_WIDTH,
          duration: FLY_MS,
          ease: "Quad.easeIn",
          onComplete: done,
        });
      };
    },

    tick: (deltaMs, escDown) => {
      if (mode === null) {
        return;
      }
      if (!armed) {
        armed = !anyHeld();
        return;
      }
      if (mode === "reveal") {
        revealElapsed += deltaMs;
        if (revealFinish !== null && trinketRevealDone(revealElapsed, revealDismissed || escDown)) {
          revealFinish();
        }
        return;
      }
      const key: SalvageKey | null = escDown
        ? "cancel"
        : pressed("up")
          ? "up"
          : pressed("down")
            ? "down"
            : pressed("left")
              ? "left"
              : pressed("right")
                ? "right"
                : pressed("confirm")
                  ? "confirm"
                  : null;
      if (key !== null) {
        onKey?.(key);
      }
    },

    destroy: () => {
      clear();
      keyboard?.off("keydown", keydown);
    },
  };
}
