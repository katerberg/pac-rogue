import { describe, expect, it } from "vitest";
import {
  openSalvagePicker,
  salvagePickerStep,
  salvagePromptStep,
  TRINKET_REVEAL_AUTO_MS,
  trinketRevealDone,
  type SalvageKey,
} from "./salvagePicker";

function run(keys: SalvageKey[], count = 6, start = openSalvagePicker()) {
  let state = start;
  let outcome = null as ReturnType<typeof salvagePickerStep>["outcome"];
  for (const key of keys) {
    ({ state, outcome } = salvagePickerStep(state, key, count));
  }
  return { state, outcome };
}

describe("salvagePickerStep", () => {
  it("wraps the selection both ways", () => {
    expect(run(["up"]).state.index).toBe(5);
    expect(run(["up", "down", "down"]).state.index).toBe(1);
  });

  it("asks SALVAGE? with NO focused, and salvages only on YES", () => {
    expect(run(["down", "confirm"]).state).toEqual({ index: 1, confirming: true, yes: false });
    expect(run(["down", "confirm", "confirm"])).toMatchObject({
      state: { confirming: false },
      outcome: null,
    });
    expect(run(["down", "confirm", "right", "confirm"]).outcome).toEqual({
      kind: "salvage",
      index: 1,
    });
  });

  it("backs out of the confirm, then closes the picker on cancel", () => {
    expect(run(["confirm", "cancel"])).toMatchObject({
      state: { confirming: false },
      outcome: null,
    });
    expect(run(["cancel"]).outcome).toEqual({ kind: "close" });
  });

  it("ignores arrows during the confirm except left and right", () => {
    expect(run(["confirm", "down"]).state).toEqual({ index: 0, confirming: true, yes: false });
  });

  it("closes an empty list on confirm or cancel", () => {
    expect(run(["confirm"], 0).outcome).toEqual({ kind: "close" });
    expect(run(["down"], 0).outcome).toBeNull();
  });

  it("can open straight on the confirm for a clicked slot", () => {
    expect(run(["right", "confirm"], 6, openSalvagePicker(3, true)).outcome).toEqual({
      kind: "salvage",
      index: 3,
    });
  });
});

describe("salvagePromptStep", () => {
  it("toggles the two buttons and fires the focused one", () => {
    expect(salvagePromptStep("salvageNew", "right")).toEqual({ focus: "replace", outcome: null });
    expect(salvagePromptStep("replace", "left").focus).toBe("salvageNew");
    expect(salvagePromptStep("replace", "confirm").outcome).toBe("replace");
    expect(salvagePromptStep("salvageNew", "cancel").outcome).toBeNull();
  });
});

describe("trinketRevealDone", () => {
  it("ends on a dismiss or after the auto delay", () => {
    expect(trinketRevealDone(0, false)).toBe(false);
    expect(trinketRevealDone(TRINKET_REVEAL_AUTO_MS - 1, false)).toBe(false);
    expect(trinketRevealDone(TRINKET_REVEAL_AUTO_MS, false)).toBe(true);
    expect(trinketRevealDone(10, true)).toBe(true);
  });
});
