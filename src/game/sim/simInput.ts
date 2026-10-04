import { NO_KEYS_HELD, type HeldKeys } from "../systems/heldKeys";

export type SimInput = {
  keys: HeldKeys;
  uiOpen: boolean;
  storeToggle: boolean;
  storeConfirm: boolean;
  storeChoice?: "yes" | "no" | null;
  storeClick?: number | null;
  storePointer?: { x: number; y: number } | null;
  storeCancelRoute?: boolean;
};

export const IDLE_INPUT: SimInput = {
  keys: NO_KEYS_HELD,
  uiOpen: false,
  storeToggle: false,
  storeConfirm: false,
};
