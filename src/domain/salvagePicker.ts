export const TRINKET_REVEAL_AUTO_MS = 3000;

export type SalvageKey = "up" | "down" | "left" | "right" | "confirm" | "cancel";

export type SalvagePickerState = { index: number; confirming: boolean; yes: boolean };

export type SalvagePickerOutcome = { kind: "salvage"; index: number } | { kind: "close" } | null;

export function openSalvagePicker(index = 0, confirming = false): SalvagePickerState {
  return { index, confirming, yes: false };
}

export function salvagePickerStep(
  state: SalvagePickerState,
  key: SalvageKey,
  count: number,
): { state: SalvagePickerState; outcome: SalvagePickerOutcome } {
  if (state.confirming) {
    if (key === "left" || key === "right") {
      return { state: { ...state, yes: !state.yes }, outcome: null };
    }
    if (key === "confirm" && state.yes) {
      return { state, outcome: { kind: "salvage", index: state.index } };
    }
    if (key === "confirm" || key === "cancel") {
      return { state: { ...state, confirming: false, yes: false }, outcome: null };
    }
    return { state, outcome: null };
  }
  if (count === 0) {
    return { state, outcome: key === "cancel" || key === "confirm" ? { kind: "close" } : null };
  }
  switch (key) {
    case "up":
      return { state: { ...state, index: (state.index + count - 1) % count }, outcome: null };
    case "down":
      return { state: { ...state, index: (state.index + 1) % count }, outcome: null };
    case "confirm":
      return { state: { ...state, confirming: true, yes: false }, outcome: null };
    case "cancel":
      return { state, outcome: { kind: "close" } };
    default:
      return { state, outcome: null };
  }
}

export type SalvagePromptChoice = "salvageNew" | "replace";

export function salvagePromptStep(
  focus: SalvagePromptChoice,
  key: SalvageKey,
): { focus: SalvagePromptChoice; outcome: SalvagePromptChoice | null } {
  if (key === "left" || key === "right") {
    return { focus: focus === "salvageNew" ? "replace" : "salvageNew", outcome: null };
  }
  return { focus, outcome: key === "confirm" ? focus : null };
}

export function trinketRevealDone(elapsedMs: number, dismissed: boolean): boolean {
  return dismissed || elapsedMs >= TRINKET_REVEAL_AUTO_MS;
}
