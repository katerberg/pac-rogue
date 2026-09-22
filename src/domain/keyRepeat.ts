export const KEY_REPEAT_INITIAL_DELAY_MS = 350;
export const KEY_REPEAT_INTERVAL_MS = 120;

export type KeyRepeatState = {
  remainingMs: number;
};

export function createKeyRepeatState(): KeyRepeatState {
  return { remainingMs: 0 };
}

export function tickKeyRepeat(
  state: KeyRepeatState,
  isDown: boolean,
  justDown: boolean,
  deltaMs: number,
): { state: KeyRepeatState; fire: boolean } {
  if (!isDown) {
    return { state: createKeyRepeatState(), fire: false };
  }

  if (justDown) {
    return { state: { remainingMs: KEY_REPEAT_INITIAL_DELAY_MS }, fire: true };
  }

  const remainingMs = state.remainingMs - deltaMs;
  if (remainingMs <= 0) {
    return { state: { remainingMs: KEY_REPEAT_INTERVAL_MS }, fire: true };
  }

  return { state: { remainingMs }, fire: false };
}
