import { describe, expect, it } from "vitest";
import {
  UPGRADE_SLOT_HINT_GLYPH,
  upgradeSlotHintAngleDeg,
  type UpgradeChoiceSlot,
} from "./upgradeChoiceHints";

describe("upgradeChoiceHints", () => {
  it("uses a single right caret for every slot", () => {
    expect(UPGRADE_SLOT_HINT_GLYPH).toBe(">");
  });

  it("rotates the caret to point outward for each slot", () => {
    const angles: Record<UpgradeChoiceSlot, number> = {
      right: upgradeSlotHintAngleDeg("right"),
      down: upgradeSlotHintAngleDeg("down"),
      left: upgradeSlotHintAngleDeg("left"),
      up: upgradeSlotHintAngleDeg("up"),
    };
    expect(angles).toEqual({ right: 0, down: 90, left: 180, up: -90 });
  });
});
