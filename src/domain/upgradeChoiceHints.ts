export type UpgradeChoiceSlot = "up" | "down" | "left" | "right";

/**
 * One caret for every slot. Neon uppercases text, so a down hint of `"v"` becomes the
 * letter V; `^` is missing from the neon set and falls back to a pixel glyph. Rotate this
 * right-pointing caret instead.
 */
export const UPGRADE_SLOT_HINT_GLYPH = ">";

/** Phaser degrees so `>` points at the slot's outside edge. */
export function upgradeSlotHintAngleDeg(slot: UpgradeChoiceSlot): number {
  switch (slot) {
    case "right":
      return 0;
    case "down":
      return 90;
    case "left":
      return 180;
    case "up":
      return -90;
  }
}
