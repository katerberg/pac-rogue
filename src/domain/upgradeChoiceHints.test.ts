import { describe, expect, it } from "vitest";
import { neonDisplayText } from "./neonFont/layout";
import { neonGlyph } from "./neonFont/glyphs";
import {
  UPGRADE_SLOT_HINT_GLYPH,
  upgradeSlotHintAngleDeg,
  type UpgradeChoiceSlot,
} from "./upgradeChoiceHints";

describe("upgradeChoiceHints", () => {
  it("uses a single right caret that exists in the neon glyph set after display normalize", () => {
    expect(UPGRADE_SLOT_HINT_GLYPH).toBe(">");
    const display = neonDisplayText(UPGRADE_SLOT_HINT_GLYPH);
    expect(display).toBe(">");
    expect(neonGlyph(display)).toBeDefined();
  });

  it("does not use ascii stand-ins that neon turns into letters or missing glyphs", () => {
    expect(neonDisplayText("v")).toBe("V");
    expect(neonGlyph("^")).toBeUndefined();
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
