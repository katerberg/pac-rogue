export const SETTINGS_FOCUS_COUNT = 5;

export function resolveSettingsFocusIndex(focusIndex: number | undefined): number {
  if (
    focusIndex === undefined ||
    !Number.isInteger(focusIndex) ||
    focusIndex < 0 ||
    focusIndex >= SETTINGS_FOCUS_COUNT
  ) {
    return 0;
  }
  return focusIndex;
}
