import { NO_KEYS_HELD, type HeldKeys } from "../systems/heldKeys";

export type SimInput = {
  keys: HeldKeys;
  uiOpen: boolean;
  storeFocus: "yes" | "no" | null;
  storeConfirm: boolean;
  storeChoice?: "yes" | "no" | null;
  storeClick?: number | null;
  storePointer?: { x: number; y: number } | null;
  storeCancelRoute?: boolean;
  acknowledge?: boolean;
};

export const IDLE_INPUT: SimInput = {
  keys: NO_KEYS_HELD,
  uiOpen: false,
  storeFocus: null,
  storeConfirm: false,
};
